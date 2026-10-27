"""Ponte com o painel: API local, protocolos judiciais e do INSS, consultas."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import api, roteiros
from app.executor import Executor
from app.web import criar_app
from tests.conftest import FIXTURES, criar_pdf, numero_valido

INSS_URL = (FIXTURES / "inss_simulado.html").resolve().as_uri()


@pytest.fixture
def sistema(cfg, banco):
    executor = Executor(cfg, banco)
    executor.iniciar = lambda: None
    cliente = TestClient(criar_app(cfg, banco, executor, monitorar=False))
    cliente.headers["X-Token"] = api.token(cfg)
    yield cliente, executor
    executor.encerrar()


def gravar_roteiro(cfg, nome, roteiro):
    (cfg.pasta_roteiros / f"{nome}.json").write_text(json.dumps(roteiro), encoding="utf-8")
    return nome


@pytest.fixture
def roteiros_inss(cfg):
    gravar_roteiro(cfg, "inss-exigencia", {
        "nome": "INSS simulado — cumprimento de exigência", "url_inicial": INSS_URL,
        "passos": [
            {"acao": "abrir", "url": "{url_inicial}"},
            {"acao": "clicar", "seletor": "#entrar", "se_visivel": "#entrar"},
            {"acao": "preencher", "seletor": "#requerimento", "valor": "{identificador}"},
            {"acao": "clicar", "seletor": "#abrir"},
            {"acao": "anexar", "seletor": "#documento", "valor": "{arquivo}"},
            {"acao": "clicar", "seletor": "#enviar", "envio_final": True},
            {"acao": "capturar_protocolo", "regex": r"cumprimento ([\d.]+)"},
        ]})
    gravar_roteiro(cfg, "inss-consulta", {
        "nome": "INSS simulado — exigências", "tipo": "consulta", "url_inicial": INSS_URL,
        "passos": [
            {"acao": "abrir", "url": "{url_inicial}"},
            {"acao": "clicar", "seletor": "#entrar", "se_visivel": "#entrar"},
            {"acao": "extrair", "seletor": "#exigencias", "campo": "exigencias", "modo": "tabela"},
        ]})


def enviar(cliente, arquivo: Path, **meta):
    meta.setdefault("id_externo", "doc-teste")
    return cliente.post("/api/envios", data={"dados": json.dumps(meta)},
                        files={"arquivo": (arquivo.name, arquivo.read_bytes(), "application/pdf")}).json()


def peca(tmp_path, nome="peca.pdf", texto="MANIFESTAÇÃO"):
    return criar_pdf(tmp_path / nome, [texto, f"Processo {numero_valido()}"])


def test_token_obrigatorio(sistema):
    cliente, _ = sistema
    assert cliente.get("/api/saude", headers={"X-Token": "errado"}).status_code == 401
    assert cliente.get("/api/saude").json()["ok"] is True


def test_protocolo_aprovado_no_painel(sistema, tmp_path, roteiro_simulado):
    cliente, executor = sistema
    r = enviar(cliente, peca(tmp_path), cnj=numero_valido(), tipo="Manifestação", roteiro=roteiro_simulado,
               aprovado_por="Dra. Luana")
    assert r["status"] == "aprovado" and r["tribunal"] == "TJSP"
    executor.processar_pendentes()
    final = cliente.get("/api/envios", params={"id_externo": "doc-teste"}).json()
    assert final["status"] == "protocolado", final["mensagem"]
    assert final["protocolo"] == "2024.0001234-5"
    assert cliente.get(f"/api/envios/{final['id']}/comprovante").status_code == 200
    repetido = enviar(cliente, peca(tmp_path), cnj=numero_valido(), roteiro=roteiro_simulado)
    assert repetido["ja_existia"] and repetido["id"] == final["id"]


def test_sem_roteiro_fica_aguardando_gravacao(sistema, banco, tmp_path, roteiro_simulado):
    cliente, executor = sistema
    r = enviar(cliente, peca(tmp_path), cnj=numero_valido(), tipo="Manifestação")
    assert r["status"] == "falta_roteiro" and "TJSP" in r["mensagem"]
    banco.lembrar_roteiro("TJSP", roteiro_simulado)
    r2 = enviar(cliente, peca(tmp_path), cnj=numero_valido(), tipo="Manifestação")
    assert not r2["ja_existia"] and r2["status"] == "aprovado" and r2["id"] != r["id"]
    executor.processar_pendentes()
    assert cliente.get(f"/api/envios/{r2['id']}").json()["status"] == "protocolado"


def test_cnj_invalido_nao_vai_para_o_robo(sistema, tmp_path, roteiro_simulado):
    cliente, _ = sistema
    r = enviar(cliente, peca(tmp_path), cnj="1234567-00.2024.8.26.0100", roteiro=roteiro_simulado)
    assert r["status"] == "erro" and "inválido" in r["mensagem"]


def test_mesmo_arquivo_ja_protocolado_exige_confirmacao(sistema, tmp_path, roteiro_simulado):
    cliente, executor = sistema
    arq = peca(tmp_path)
    enviar(cliente, arq, cnj=numero_valido(), tipo="Manifestação", roteiro=roteiro_simulado)
    executor.processar_pendentes()
    outro = enviar(cliente, arq, id_externo="doc-outro", cnj=numero_valido(), tipo="Manifestação",
                   roteiro=roteiro_simulado)
    assert outro["status"] == "erro" and "confirme" in outro["mensagem"]
    confirmado = enviar(cliente, arq, id_externo="doc-outro-2", cnj=numero_valido(), tipo="Manifestação",
                        roteiro=roteiro_simulado, confirmar_duplicado=True)
    assert confirmado["status"] == "aprovado"


def test_protocolo_no_inss(sistema, tmp_path, roteiros_inss):
    cliente, executor = sistema
    r = enviar(cliente, peca(tmp_path, texto="CTPS"), id_externo="inss-1", destino="inss",
               identificador="123456789", roteiro="inss-exigencia", tipo="Cumprimento de exigência")
    assert r["status"] == "aprovado" and r["tribunal"] == "INSS" and r["cnj"] is None
    executor.processar_pendentes()
    final = cliente.get(f"/api/envios/{r['id']}").json()
    assert final["status"] == "protocolado", final["mensagem"]
    assert final["protocolo"] == "2026.11.0042"


def test_inss_sem_numero_do_requerimento(sistema, tmp_path, roteiros_inss):
    cliente, _ = sistema
    r = enviar(cliente, peca(tmp_path), id_externo="inss-2", destino="inss", roteiro="inss-exigencia")
    assert r["status"] == "erro" and "requerimento" in r["mensagem"]


def test_consulta_de_exigencias(sistema, roteiros_inss):
    cliente, executor = sistema
    c = cliente.post("/api/consultas", json={"roteiro": "inss-consulta", "id_externo": "cons-1"}).json()
    assert c["status"] == "na_fila"
    executor.processar_pendentes()
    final = cliente.get(f"/api/consultas/{c['id']}").json()
    assert final["status"] == "concluida", final["mensagem"]
    linhas = final["resultado"]["exigencias"]
    assert linhas[0][0] == "Requerimento" and linhas[1][3] == "Apresentar CTPS completa" and len(linhas) == 3
    assert cliente.post("/api/consultas", json={"roteiro": "inss-exigencia"}).status_code == 422


def test_validacao_de_roteiro_de_consulta():
    with pytest.raises(roteiros.RoteiroInvalido):
        roteiros.validar({"tipo": "consulta", "passos": [{"acao": "clicar", "seletor": "#x", "envio_final": True},
                                                         {"acao": "extrair", "seletor": "#t", "campo": "t"}]})
    with pytest.raises(roteiros.RoteiroInvalido):
        roteiros.validar({"tipo": "consulta", "passos": [{"acao": "abrir", "url": "x"}]})
