"""API local para a ponte com o painel L.A. Office (só aceita chamadas deste computador, com token).

A aprovação acontece no painel; a ponte entrega aqui a peça já aprovada e acompanha o andamento.
"""
from __future__ import annotations

import json
import secrets
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse

from . import cnj, ingestao, roteiros, validacao
from .config import Config
from .db import STATUS, Banco, agora
from .executor import Executor

DESTINOS = {"judicial", "inss"}
REENVIAVEIS = {"erro", "falta_roteiro", "rejeitado"}


def token(cfg: Config) -> str:
    arquivo = cfg.pasta_dados / "api_token.txt"
    if not arquivo.exists():
        arquivo.write_text(secrets.token_urlsafe(32), encoding="utf-8")
        try:
            arquivo.chmod(0o600)
        except OSError:
            pass
    return arquivo.read_text(encoding="utf-8").strip()


def publico(banco: Banco, envio: dict) -> dict:
    return {
        "id": envio["id"], "id_externo": envio["id_externo"], "status": envio["status"],
        "status_rotulo": STATUS.get(envio["status"], envio["status"]), "mensagem": envio["mensagem"],
        "protocolo": envio["protocolo"], "comprovante": bool(envio["comprovante"]),
        "destino": envio["destino"], "cnj": envio["cnj"], "tribunal": envio["tribunal"],
        "identificador": envio["identificador"], "roteiro": envio["roteiro"], "tipo": envio["tipo"],
        "alertas": envio["alertas"], "atualizado_em": envio["atualizado_em"],
        "historico": [f"{e['momento']} {e['descricao']}" for e in banco.eventos(envio["id"])][-12:],
    }


def criar_router(cfg: Config, banco: Banco, executor: Executor) -> APIRouter:
    chave = token(cfg)

    def autenticar(x_token: str = Header("")):
        if not secrets.compare_digest(x_token, chave):
            raise HTTPException(401, "Token inválido")

    r = APIRouter(prefix="/api", dependencies=[Depends(autenticar)])

    def obter(envio_id: int) -> dict:
        envio = banco.envio(envio_id)
        if not envio:
            raise HTTPException(404, "Envio não encontrado")
        return envio

    @r.get("/saude")
    def saude():
        lista = roteiros.listar(cfg.pasta_roteiros)
        return {"ok": True, "momento": agora(),
                "roteiros": {n: ("erro: " + x["erro"]) if "erro" in x else x.get("tipo", "protocolo")
                             for n, x in lista.items()},
                "tribunal_roteiro": banco.mapa_roteiros()}

    @r.post("/envios")
    async def criar(arquivo: UploadFile = File(...), dados: str = Form(...)):
        try:
            meta = json.loads(dados)
        except json.JSONDecodeError:
            raise HTTPException(422, "Campo 'dados' precisa ser JSON")
        id_externo = str(meta.get("id_externo") or "").strip()
        destino = meta.get("destino") or "judicial"
        if not id_externo or destino not in DESTINOS:
            raise HTTPException(422, "Informe id_externo e destino ('judicial' ou 'inss')")

        anterior = banco.por_id_externo(id_externo)
        if anterior and anterior["status"] not in REENVIAVEIS and not (
                anterior["status"] == "conferir" and meta.get("reenvio_confirmado")):
            return {**publico(banco, anterior), "ja_existia": True}

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(await arquivo.read())
        try:
            envio_id = ingestao.ingerir(cfg, banco, Path(tmp.name), "painel L.A. Office",
                                        meta.get("nome_arquivo") or arquivo.filename)
        finally:
            Path(tmp.name).unlink(missing_ok=True)

        campos = {"id_externo": id_externo, "destino": destino, "tipo": meta.get("tipo") or None,
                  "observacao": meta.get("observacao") or None, "aprovado_por": meta.get("aprovado_por"),
                  "aprovado_em": meta.get("aprovado_em") or agora()}
        erro = None
        if destino == "judicial":
            informado = meta.get("cnj")
            numero = cnj.interpretar(informado) if informado else None
            if informado and not numero:
                erro = f"Número CNJ inválido: {informado}"
            elif numero:
                campos.update(cnj=numero.formatado, tribunal=numero.tribunal)
            tribunal = campos.get("tribunal") or banco.envio(envio_id)["tribunal"]
        else:
            campos.update(identificador=str(meta.get("identificador") or "").strip() or None,
                          cnj=None, tribunal="INSS")
            tribunal = "INSS"
        campos["roteiro"] = meta.get("roteiro") or banco.roteiro_do_tribunal(tribunal)
        banco.atualizar(envio_id, **campos)
        banco.registrar(envio_id, f"Aprovado no painel por {meta.get('aprovado_por') or 'Dra. Luana'} "
                                  f"(referência {id_externo})")

        envio = banco.envio(envio_id)
        falha = ("erro", erro) if erro else validacao.problema(
            cfg, banco, envio, bool(meta.get("confirmar_duplicado")), qualquer_duplicado=False)
        if falha:
            banco.mudar_status(envio_id, falha[0], falha[1])
        else:
            banco.mudar_status(envio_id, "aprovado", "Na fila do robô")
            executor.enfileirar(envio_id, ensaio=False)
        return {**publico(banco, banco.envio(envio_id)), "ja_existia": False}

    @r.get("/envios")
    def buscar(id_externo: str):
        envio = banco.por_id_externo(id_externo)
        if not envio:
            raise HTTPException(404, "Nenhum envio com essa referência")
        return publico(banco, envio)

    @r.get("/envios/{envio_id}")
    def detalhe(envio_id: int):
        return publico(banco, obter(envio_id))

    @r.get("/envios/{envio_id}/comprovante")
    def comprovante(envio_id: int):
        envio = obter(envio_id)
        if not envio["comprovante"] or not Path(envio["comprovante"]).exists():
            raise HTTPException(404, "Sem comprovante")
        return FileResponse(envio["comprovante"])

    @r.post("/envios/{envio_id}/continuar")
    def continuar(envio_id: int):
        obter(envio_id)
        executor.continuar(envio_id)
        return {"ok": True}

    @r.post("/consultas")
    def nova_consulta(dados: dict):
        nome, id_externo = dados.get("roteiro"), dados.get("id_externo")
        try:
            roteiro = roteiros.carregar(cfg.pasta_roteiros, nome or "")
        except (roteiros.RoteiroInvalido, ValueError) as exc:
            raise HTTPException(422, str(exc))
        if roteiro.get("tipo") != "consulta":
            raise HTTPException(422, "Este roteiro protocola; consultas só usam roteiros do tipo 'consulta'.")
        if id_externo:
            anterior = banco.consulta_por_id_externo(id_externo)
            if anterior and anterior["status"] != "erro":
                return anterior
        consulta_id = banco.inserir_consulta(nome, id_externo)
        executor.enfileirar_consulta(consulta_id)
        return banco.consulta(consulta_id)

    @r.get("/consultas/{consulta_id}")
    def ver_consulta(consulta_id: int):
        consulta = banco.consulta(consulta_id)
        if not consulta:
            raise HTTPException(404, "Consulta não encontrada")
        return consulta

    @r.post("/consultas/{consulta_id}/continuar")
    def continuar_consulta(consulta_id: int):
        executor.continuar_consulta(consulta_id)
        return {"ok": True}

    return r
