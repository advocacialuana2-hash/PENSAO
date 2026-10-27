"""Executa os roteiros no navegador, um envio por vez.

O navegador abre visível e com perfil próprio, para que o PJeOffice, o Web PKI
e as demais extensões de assinatura usem o token A3 conectado ao computador.
"""
from __future__ import annotations

import queue
import re
import threading
import time
import traceback
from datetime import datetime
from pathlib import Path

from . import roteiros
from .config import Config
from .db import Banco
from .pdf import hash_arquivo


class Interrompido(Exception):
    pass


class Executor:
    def __init__(self, cfg: Config, banco: Banco):
        self.cfg = cfg
        self.banco = banco
        self._fila: queue.Queue[tuple[str, int, bool]] = queue.Queue()
        self._continuar: dict[str, threading.Event] = {}
        self._playwright = None
        self._contexto = None
        self._thread = threading.Thread(target=self._loop, name="executor", daemon=True)

    def iniciar(self) -> None:
        self._thread.start()

    def enfileirar(self, envio_id: int, ensaio: bool) -> None:
        self._fila.put(("envio", envio_id, ensaio))

    def enfileirar_consulta(self, consulta_id: int) -> None:
        self._fila.put(("consulta", consulta_id, False))

    def continuar(self, envio_id: int) -> None:
        self._liberar(f"e{envio_id}")

    def continuar_consulta(self, consulta_id: int) -> None:
        self._liberar(f"c{consulta_id}")

    def _liberar(self, chave: str) -> None:
        evento = self._continuar.get(chave)
        if evento:
            evento.set()

    def processar_pendentes(self) -> None:
        """Processa a fila no próprio thread (uso em testes e linha de comando)."""
        while not self._fila.empty():
            self._despachar(*self._fila.get())

    def encerrar(self) -> None:
        if self._contexto:
            self._contexto.close()
        if self._playwright:
            self._playwright.stop()
        self._contexto = self._playwright = None

    # ----------------------------------------------------------------- interno

    def _loop(self) -> None:
        while True:
            self._despachar(*self._fila.get())

    def _despachar(self, tipo: str, ident: int, ensaio: bool) -> None:
        if tipo == "consulta":
            self._consultar(ident)
        else:
            self._processar(ident, ensaio)

    def _navegador(self):
        if self._contexto is not None:
            try:
                self._contexto.pages  # acesso simples para detectar janela fechada
                return self._contexto
            except Exception:
                self._contexto = None
        if self._playwright is None:
            from playwright.sync_api import sync_playwright
            self._playwright = sync_playwright().start()
        opcoes = dict(
            user_data_dir=str(self.cfg.perfil_navegador),
            headless=self.cfg.headless,
            accept_downloads=True,
            ignore_default_args=["--disable-extensions"],
            viewport=None if not self.cfg.headless else {"width": 1366, "height": 900},
        )
        if self.cfg.caminho_navegador:
            opcoes["executable_path"] = self.cfg.caminho_navegador
        elif self.cfg.canal_navegador:
            opcoes["channel"] = self.cfg.canal_navegador
        self._contexto = self._playwright.chromium.launch_persistent_context(**opcoes)
        self._contexto.on("close", lambda _: setattr(self, "_contexto", None))
        return self._contexto

    def _processar(self, envio_id: int, ensaio: bool) -> None:
        envio = self.banco.envio(envio_id)
        esperado = "ensaio" if ensaio else "aprovado"
        if not envio or envio["status"] != esperado:
            return
        self.banco.mudar_status(envio_id, "executando", "Ensaio (sem envio final)" if ensaio else None)
        envio_final_executado = False
        pagina = None
        alvo = {
            "chave": f"e{envio_id}",
            "registrar": lambda m: self.banco.registrar(envio_id, m),
            "esperando": lambda m: self.banco.mudar_status(envio_id, "aguardando_voce", m),
            "retomado": lambda: self.banco.mudar_status(envio_id, "executando", "Retomado"),
            "extraidos": {},
        }
        try:
            arquivo = Path(envio["arquivo"])
            if hash_arquivo(arquivo) != envio["hash"]:
                raise RuntimeError("O arquivo mudou depois da análise. Protocolo cancelado por segurança.")
            roteiro = roteiros.carregar(self.cfg.pasta_roteiros, envio["roteiro"])
            variaveis = self._variaveis(envio, roteiro, arquivo)
            pagina = self._navegador().new_page()
            pagina.set_default_timeout(int(roteiro.get("tempo_limite", self.cfg.tempo_limite_passo)) * 1000)
            protocolo = None
            for n, passo in enumerate(roteiro["passos"], 1):
                descricao = passo.get("descricao") or passo["acao"]
                if ensaio and passo.get("envio_final"):
                    self.banco.registrar(envio_id, f"Passo {n} ({descricao}) ignorado no ensaio: é o envio "
                                                   "final. O ensaio termina aqui.")
                    break
                condicao = passo.get("se_visivel")
                if condicao and not self._visivel(pagina, roteiros.substituir(condicao, variaveis)):
                    continue
                try:
                    resultado = self._passo(pagina, passo, variaveis, alvo)
                except Interrompido:
                    raise
                except Exception:
                    if passo.get("opcional"):
                        self.banco.registrar(envio_id, f"Passo {n} ({descricao}) opcional não executado.")
                        continue
                    raise
                if passo.get("envio_final"):
                    envio_final_executado = True
                    self.banco.registrar(envio_id, f"Envio final executado no passo {n}.")
                if passo["acao"] == "capturar_protocolo":
                    protocolo = resultado
            comprovante = self._comprovante(pagina, envio)
            if ensaio:
                self.banco.mudar_status(envio_id, "ensaio_ok", "Todos os passos funcionaram até antes do envio.",
                                        comprovante=comprovante)
            elif protocolo:
                self.banco.mudar_status(envio_id, "protocolado", f"Protocolo {protocolo}",
                                        protocolo=protocolo, comprovante=comprovante)
            else:
                self.banco.mudar_status(envio_id, "conferir",
                                        "Envio feito, mas o número do protocolo não foi capturado. "
                                        "Confira no sistema do tribunal e no comprovante.",
                                        comprovante=comprovante)
        except Exception as exc:
            comprovante = self._comprovante(pagina, envio) if pagina else None
            detalhe = f"{type(exc).__name__}: {exc}"
            self.banco.registrar(envio_id, traceback.format_exc(limit=3))
            if envio_final_executado:
                self.banco.mudar_status(envio_id, "conferir",
                                        f"Falha DEPOIS do envio final ({detalhe}). A peça pode ter sido "
                                        "protocolada: confira no tribunal antes de reenviar.",
                                        comprovante=comprovante)
            else:
                self.banco.mudar_status(envio_id, "erro", f"Nada foi enviado. {detalhe}",
                                        comprovante=comprovante)
        finally:
            self._continuar.pop(alvo["chave"], None)
            self._fechar(pagina)

    def _consultar(self, consulta_id: int) -> None:
        """Roteiro de consulta (ex.: exigências e andamentos no Meu INSS): só lê, nunca envia."""
        consulta = self.banco.consulta(consulta_id)
        if not consulta or consulta["status"] != "na_fila":
            return
        self.banco.atualizar_consulta(consulta_id, "executando")
        historico: list[str] = []
        pagina = None
        alvo = {
            "chave": f"c{consulta_id}",
            "registrar": historico.append,
            "esperando": lambda m: self.banco.atualizar_consulta(consulta_id, "aguardando_voce", m),
            "retomado": lambda: self.banco.atualizar_consulta(consulta_id, "executando", "Retomado"),
            "extraidos": {},
        }
        try:
            roteiro = roteiros.carregar(self.cfg.pasta_roteiros, consulta["roteiro"])
            if roteiro.get("tipo") != "consulta":
                raise RuntimeError("Este roteiro é de protocolo, não de consulta.")
            variaveis = {k: str(v) for k, v in (roteiro.get("variaveis") or {}).items()}
            variaveis["url_inicial"] = roteiro.get("url_inicial", "")
            pagina = self._navegador().new_page()
            pagina.set_default_timeout(int(roteiro.get("tempo_limite", self.cfg.tempo_limite_passo)) * 1000)
            for n, passo in enumerate(roteiro["passos"], 1):
                condicao = passo.get("se_visivel")
                if condicao and not self._visivel(pagina, roteiros.substituir(condicao, variaveis)):
                    continue
                try:
                    self._passo(pagina, passo, variaveis, alvo)
                except Interrompido:
                    raise
                except Exception:
                    if passo.get("opcional"):
                        historico.append(f"Passo {n} opcional não executado.")
                        continue
                    raise
            self.banco.atualizar_consulta(consulta_id, "concluida", " ".join(historico) or None, alvo["extraidos"])
        except Exception as exc:
            self.banco.atualizar_consulta(consulta_id, "erro", f"{type(exc).__name__}: {exc}",
                                          alvo["extraidos"] or None)
        finally:
            self._continuar.pop(alvo["chave"], None)
            self._fechar(pagina)

    @staticmethod
    def _fechar(pagina) -> None:
        if pagina:
            try:
                pagina.close()
            except Exception:
                pass

    @staticmethod
    def _variaveis(envio: dict, roteiro: dict, arquivo: Path) -> dict[str, str]:
        cnj_formatado = envio["cnj"] or ""
        digitos = re.sub(r"\D", "", cnj_formatado)
        variaveis = {k: str(v) for k, v in (roteiro.get("variaveis") or {}).items()}
        variaveis.update({
            "cnj": cnj_formatado,
            "cnj_digitos": digitos,
            "cnj_sequencial": digitos[:7],
            "cnj_ano": digitos[9:13],
            "cnj_origem": digitos[-4:],
            "arquivo": str(arquivo.resolve()),
            "tipo": envio["tipo"] or "",
            "identificador": envio.get("identificador") or "",
            "destino": envio.get("destino") or "judicial",
            "observacao": envio["observacao"] or "",
            "url_inicial": roteiro.get("url_inicial", ""),
        })
        return variaveis

    @staticmethod
    def _visivel(pagina, seletor: str) -> bool:
        try:
            return pagina.locator(seletor).first.is_visible()
        except Exception:
            return False

    def _passo(self, pagina, passo: dict, variaveis: dict, alvo: dict):
        s = {k: roteiros.substituir(v, variaveis) for k, v in passo.items()}
        acao = s["acao"]
        if acao == "abrir":
            pagina.goto(s["url"])
        elif acao == "clicar":
            pagina.locator(s["seletor"]).first.click()
        elif acao == "preencher":
            pagina.locator(s["seletor"]).first.fill(s["valor"])
        elif acao == "selecionar":
            alvo = pagina.locator(s["seletor"]).first
            try:
                alvo.select_option(label=s["valor"])
            except Exception:
                alvo.select_option(value=s["valor"])
        elif acao == "anexar":
            pagina.locator(s["seletor"]).first.set_input_files(s["valor"])
        elif acao == "pressionar":
            pagina.locator(s["seletor"]).first.press(s["tecla"])
        elif acao == "aguardar":
            pagina.locator(s["seletor"]).first.wait_for(state="visible")
        elif acao == "aguardar_texto":
            pagina.get_by_text(s["texto"]).first.wait_for(state="visible")
        elif acao == "esperar":
            pagina.wait_for_timeout(float(s["segundos"]) * 1000)
        elif acao == "conferir_texto":
            if s["texto"] not in pagina.locator("body").inner_text():
                raise RuntimeError(f"Texto esperado não apareceu: {s['texto']!r}")
        elif acao == "capturar_protocolo":
            origem = pagina.locator(s["seletor"]).first.inner_text() if s.get("seletor") \
                else pagina.locator("body").inner_text()
            m = re.search(s["regex"], origem)
            if not m:
                raise RuntimeError("Número do protocolo não encontrado na tela de confirmação.")
            protocolo = (m.group(1) if m.groups() else m.group(0)).strip()
            alvo["registrar"](f"Protocolo capturado: {protocolo}")
            return protocolo
        elif acao == "extrair":
            local = pagina.locator(s["seletor"])
            modo = s.get("modo", "texto")
            if modo == "texto":
                valor = local.first.inner_text().strip()
            elif modo == "lista":
                valor = [x.inner_text().strip() for x in local.all()]
            else:
                valor = [[c.inner_text().strip() for c in linha.locator("th, td").all()]
                         for linha in local.locator("tr").all()]
            alvo["extraidos"][s["campo"]] = valor
            return valor
        elif acao == "aguardar_usuario":
            self._aguardar_usuario(pagina, s, alvo)

    def _aguardar_usuario(self, pagina, passo: dict, alvo: dict) -> None:
        evento = threading.Event()
        self._continuar[alvo["chave"]] = evento
        alvo["esperando"](passo["mensagem"])
        limite = time.monotonic() + float(passo.get("minutos", 15)) * 60
        alvo = passo.get("ate_aparecer")
        while time.monotonic() < limite:
            if evento.wait(1):
                break
            if alvo and self._visivel(pagina, alvo):
                break
        else:
            raise Interrompido("Tempo de espera pela sua ação esgotado.")
        self._continuar.pop(alvo["chave"], None)
        alvo["retomado"]()

    def _comprovante(self, pagina, envio: dict) -> str | None:
        try:
            pasta = self.cfg.pasta_comprovantes / re.sub(r"[^\w.-]", "_", envio["cnj"] or envio.get("identificador")
                                                         or "sem-numero")
            pasta.mkdir(parents=True, exist_ok=True)
            base = pasta / f"{datetime.now():%Y%m%d-%H%M%S}-envio{envio['id']}"
            pagina.screenshot(path=f"{base}.png", full_page=True)
            Path(f"{base}.html").write_text(pagina.content(), encoding="utf-8")
            return f"{base}.png"
        except Exception:
            return None
