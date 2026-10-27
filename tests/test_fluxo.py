"""Fluxo completo: painel → aprovação → robô no navegador → comprovante."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import ingestao
from app.executor import Executor
from app.web import criar_app
from tests.conftest import criar_pdf, numero_valido


@pytest.fixture
def sistema(cfg, banco, tmp_path):
    executor = Executor(cfg, banco)
    executor.iniciar = lambda: None  # os testes processam a fila no próprio thread
    cliente = TestClient(criar_app(cfg, banco, executor, monitorar=False))
    yield cliente, executor
    executor.encerrar()


def novo_envio(cfg, banco, tmp_path, tipo="Manifestação"):
    arq = criar_pdf(tmp_path / "peca.pdf", ["MANIFESTAÇÃO", f"Processo {numero_valido()}"])
    envio_id = ingestao.ingerir(cfg, banco, arq, "teste")
    banco.atualizar(envio_id, tipo=tipo)
    return envio_id


def test_nao_aprova_sem_roteiro(cfg, banco, tmp_path, sistema):
    cliente, _ = sistema
    envio_id = novo_envio(cfg, banco, tmp_path)
    r = cliente.post(f"/envio/{envio_id}/aprovar", follow_redirects=False)
    assert "erro=" in r.headers["location"]
    assert banco.envio(envio_id)["status"] == "pendente"


def test_cnj_invalido_recusado(cfg, banco, tmp_path, sistema):
    cliente, _ = sistema
    envio_id = novo_envio(cfg, banco, tmp_path)
    r = cliente.post(f"/envio/{envio_id}/dados", data={"numero": "1234567-00.2024.8.26.0100"},
                     follow_redirects=False)
    assert "inv" in r.headers["location"]


def test_ensaio_nao_executa_envio_final(cfg, banco, tmp_path, sistema, roteiro_simulado):
    cliente, executor = sistema
    envio_id = novo_envio(cfg, banco, tmp_path)
    cliente.post(f"/envio/{envio_id}/dados", data={"numero": numero_valido(), "roteiro": roteiro_simulado,
                                                   "tipo": "Manifestação", "lembrar": "true"})
    assert banco.roteiro_do_tribunal("TJSP") == roteiro_simulado
    cliente.post(f"/envio/{envio_id}/ensaiar")
    executor.processar_pendentes()
    envio = banco.envio(envio_id)
    assert envio["status"] == "ensaio_ok", envio["mensagem"]
    assert not envio["protocolo"]
    assert any("ignorado no ensaio" in e["descricao"] for e in banco.eventos(envio_id))


def test_protocolo_completo(cfg, banco, tmp_path, sistema, roteiro_simulado):
    cliente, executor = sistema
    envio_id = novo_envio(cfg, banco, tmp_path)
    cliente.post(f"/envio/{envio_id}/dados", data={"numero": numero_valido(), "roteiro": roteiro_simulado,
                                                   "tipo": "Manifestação"})
    cliente.post(f"/envio/{envio_id}/aprovar")
    assert banco.envio(envio_id)["status"] == "aprovado"
    executor.processar_pendentes()
    envio = banco.envio(envio_id)
    assert envio["status"] == "protocolado", envio["mensagem"]
    assert envio["protocolo"] == "2024.0001234-5"
    assert Path(envio["comprovante"]).exists()
    assert cliente.get(f"/envio/{envio_id}/comprovante").status_code == 200


def test_falha_depois_do_envio_vai_para_conferencia(cfg, banco, tmp_path, sistema, roteiro_simulado):
    cliente, executor = sistema
    arquivo = cfg.pasta_roteiros / f"{roteiro_simulado}.json"
    roteiro = json.loads(arquivo.read_text())
    roteiro["passos"][-1]["regex"] = r"NUNCA-APARECE (\d+)"
    arquivo.write_text(json.dumps(roteiro))
    envio_id = novo_envio(cfg, banco, tmp_path)
    banco.atualizar(envio_id, cnj=numero_valido(), roteiro=roteiro_simulado)
    cliente.post(f"/envio/{envio_id}/aprovar")
    executor.processar_pendentes()
    envio = banco.envio(envio_id)
    assert envio["status"] == "conferir"
    assert "DEPOIS do envio final" in envio["mensagem"]
    cliente.post(f"/envio/{envio_id}/confirmar", data={"protocolo": "123"})
    assert banco.envio(envio_id)["status"] == "protocolado"


def test_arquivo_alterado_apos_aprovacao_e_bloqueado(cfg, banco, tmp_path, sistema, roteiro_simulado):
    cliente, executor = sistema
    envio_id = novo_envio(cfg, banco, tmp_path)
    banco.atualizar(envio_id, cnj=numero_valido(), roteiro=roteiro_simulado)
    cliente.post(f"/envio/{envio_id}/aprovar")
    Path(banco.envio(envio_id)["arquivo"]).write_bytes(b"%PDF-1.4 adulterado")
    executor.processar_pendentes()
    envio = banco.envio(envio_id)
    assert envio["status"] == "erro" and "Nada foi enviado" in envio["mensagem"]


def test_paginas_do_painel_abrem(cfg, banco, tmp_path, sistema, roteiro_simulado):
    cliente, _ = sistema
    envio_id = novo_envio(cfg, banco, tmp_path)
    for url in ("/", f"/envio/{envio_id}", "/enviar", "/roteiros", f"/envio/{envio_id}/arquivo"):
        assert cliente.get(url).status_code == 200, url
    arq = criar_pdf(tmp_path / "up.pdf", [f"Processo {numero_valido()}"])
    r = cliente.post("/enviar", files={"arquivos": ("up.pdf", arq.read_bytes(), "application/pdf")},
                     follow_redirects=False)
    assert r.status_code == 303
    duplicado = ingestao.ingerir(cfg, banco, Path(banco.envio(envio_id)["arquivo"]), "teste")
    pagina = cliente.get(f"/envio/{duplicado}")
    assert pagina.status_code == 200 and "confirmar_duplicado" in pagina.text
