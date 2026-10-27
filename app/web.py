"""Painel de aprovação (http://localhost:8765)."""
from __future__ import annotations

import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from . import cnj, ingestao, roteiros
from .config import Config
from .db import STATUS, Banco, agora
from .executor import Executor

TEMPLATES = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))
EM_ANDAMENTO = {"aprovado", "ensaio", "executando", "aguardando_voce"}
EDITAVEL = {"pendente", "erro", "ensaio_ok"}


def criar_app(cfg: Config, banco: Banco, executor: Executor, monitorar: bool = True) -> FastAPI:
    @asynccontextmanager
    async def ciclo(_app):
        executor.iniciar()
        if monitorar:
            ingestao.monitorar(cfg, banco)
        yield

    app = FastAPI(title="Protocolo Automático", lifespan=ciclo)

    def pagina(request: Request, nome: str, **ctx) -> HTMLResponse:
        ctx.update(request=request, STATUS=STATUS, contagem=banco.contagem_por_status())
        return TEMPLATES.TemplateResponse(request, nome, ctx)

    def obter(envio_id: int) -> dict:
        envio = banco.envio(envio_id)
        if not envio:
            raise HTTPException(404, "Envio não encontrado")
        return envio

    def voltar(envio_id: int, erro: str | None = None) -> RedirectResponse:
        destino = f"/envio/{envio_id}" + (f"?erro={erro}" if erro else "")
        return RedirectResponse(destino, status_code=303)

    @app.get("/", response_class=HTMLResponse)
    def fila(request: Request, status: str | None = None):
        envios = banco.listar(status)
        atualizar = any(e["status"] in EM_ANDAMENTO for e in banco.listar())
        return pagina(request, "fila.html", envios=envios, filtro=status, atualizar=atualizar)

    @app.get("/envio/{envio_id}", response_class=HTMLResponse)
    def detalhe(request: Request, envio_id: int, erro: str | None = None):
        envio = obter(envio_id)
        return pagina(request, "envio.html", envio=envio, eventos=banco.eventos(envio_id),
                      roteiros=roteiros.listar(cfg.pasta_roteiros), erro=erro,
                      editavel=envio["status"] in EDITAVEL,
                      duplicado=any(a.startswith("DUPLICADO") for a in envio["alertas"]),
                      atualizar=envio["status"] in EM_ANDAMENTO)

    @app.post("/envio/{envio_id}/dados")
    def salvar(envio_id: int, numero: str = Form(""), roteiro: str = Form(""), tipo: str = Form(""),
               observacao: str = Form(""), lembrar: bool = Form(False)):
        envio = obter(envio_id)
        if envio["status"] not in EDITAVEL:
            return voltar(envio_id, "Este envio não pode mais ser editado.")
        dados = {"tipo": tipo.strip() or None, "observacao": observacao.strip() or None,
                 "roteiro": roteiro or None}
        if numero.strip():
            interpretado = cnj.interpretar(numero)
            if not interpretado:
                return voltar(envio_id, "Número CNJ inválido (formato ou dígito verificador).")
            dados.update(cnj=interpretado.formatado, tribunal=interpretado.tribunal)
            if not roteiro:
                dados["roteiro"] = banco.roteiro_do_tribunal(interpretado.tribunal)
        else:
            dados.update(cnj=None, tribunal=None)
        if dados["roteiro"] and lembrar and dados.get("tribunal"):
            banco.lembrar_roteiro(dados["tribunal"], dados["roteiro"])
        banco.atualizar(envio_id, **dados)
        banco.registrar(envio_id, "Dados revisados")
        return voltar(envio_id)

    def validar_para_execucao(envio: dict, confirmar_duplicado: bool) -> str | None:
        if envio["status"] not in EDITAVEL:
            return "Este envio não está disponível para execução."
        if not envio["cnj"]:
            return "Informe o número do processo."
        if not envio["roteiro"]:
            return "Escolha o roteiro do sistema/tribunal."
        try:
            roteiros.carregar(cfg.pasta_roteiros, envio["roteiro"])
        except roteiros.RoteiroInvalido as exc:
            return str(exc)
        if any(a.startswith("BLOQUEIO") for a in envio["alertas"]):
            return "A peça tem um bloqueio. Corrija o arquivo e envie de novo."
        if any(a.startswith("DUPLICADO") for a in envio["alertas"]) and not confirmar_duplicado:
            return "Arquivo duplicado: marque a confirmação para prosseguir."
        return None

    @app.post("/envio/{envio_id}/aprovar")
    def aprovar(envio_id: int, confirmar_duplicado: bool = Form(False)):
        envio = obter(envio_id)
        erro = validar_para_execucao(envio, confirmar_duplicado)
        if erro:
            return voltar(envio_id, erro)
        banco.mudar_status(envio_id, "aprovado", f"Aprovado para o processo {envio['cnj']}",
                           aprovado_em=agora())
        executor.enfileirar(envio_id, ensaio=False)
        return voltar(envio_id)

    @app.post("/envio/{envio_id}/ensaiar")
    def ensaiar(envio_id: int):
        envio = obter(envio_id)
        erro = validar_para_execucao(envio, confirmar_duplicado=True)
        if erro:
            return voltar(envio_id, erro)
        banco.mudar_status(envio_id, "ensaio")
        executor.enfileirar(envio_id, ensaio=True)
        return voltar(envio_id)

    @app.post("/envio/{envio_id}/rejeitar")
    def rejeitar(envio_id: int, motivo: str = Form("")):
        envio = obter(envio_id)
        if envio["status"] not in EDITAVEL:
            return voltar(envio_id, "Este envio não pode ser rejeitado agora.")
        banco.mudar_status(envio_id, "rejeitado", motivo.strip() or None)
        return voltar(envio_id)

    @app.post("/envio/{envio_id}/continuar")
    def continuar(envio_id: int):
        executor.continuar(envio_id)
        return voltar(envio_id)

    @app.post("/envio/{envio_id}/confirmar")
    def confirmar_manual(envio_id: int, protocolo: str = Form("")):
        envio = obter(envio_id)
        if envio["status"] != "conferir":
            return voltar(envio_id, "Só envios em conferência podem ser confirmados.")
        if protocolo.strip():
            banco.mudar_status(envio_id, "protocolado", f"Confirmado manualmente: {protocolo.strip()}",
                               protocolo=protocolo.strip())
        else:
            banco.mudar_status(envio_id, "erro", "Conferido: o protocolo NÃO foi efetivado.")
        return voltar(envio_id)

    @app.get("/envio/{envio_id}/arquivo")
    def arquivo(envio_id: int):
        envio = obter(envio_id)
        return FileResponse(envio["arquivo"], media_type="application/pdf",
                            content_disposition_type="inline")

    @app.get("/envio/{envio_id}/comprovante")
    def comprovante(envio_id: int):
        envio = obter(envio_id)
        if not envio["comprovante"] or not Path(envio["comprovante"]).exists():
            raise HTTPException(404, "Sem comprovante")
        return FileResponse(envio["comprovante"])

    @app.get("/enviar", response_class=HTMLResponse)
    def form_enviar(request: Request):
        return pagina(request, "enviar.html")

    @app.post("/enviar")
    async def enviar(arquivos: list[UploadFile] = File(...)):
        ultimo = None
        for up in arquivos:
            if not (up.filename or "").lower().endswith(".pdf"):
                continue
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(await up.read())
            try:
                ultimo = ingestao.ingerir(cfg, banco, Path(tmp.name), "envio manual", up.filename)
            finally:
                Path(tmp.name).unlink(missing_ok=True)
        return RedirectResponse(f"/envio/{ultimo}" if len(arquivos) == 1 and ultimo else "/",
                                status_code=303)

    @app.get("/roteiros", response_class=HTMLResponse)
    def lista_roteiros(request: Request):
        return pagina(request, "roteiros.html", roteiros=roteiros.listar(cfg.pasta_roteiros),
                      mapa=banco.mapa_roteiros(), pasta=cfg.pasta_roteiros,
                      pastas_entrada=cfg.pastas_entrada)

    return app
