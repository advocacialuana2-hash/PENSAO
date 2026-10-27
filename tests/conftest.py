import json
import os
from pathlib import Path

import pytest
from reportlab.pdfgen import canvas

from app.cnj import calcular_digito
from app.config import Config
from app.db import Banco

CHROMIUM_LOCAL = Path("/opt/pw-browsers/chromium-1243/chrome-linux64/chrome")
FIXTURES = Path(__file__).parent / "fixtures"


def numero_valido(seq="1234567", ano="2024", j="8", tr="26", origem="0100") -> str:
    return f"{seq}-{calcular_digito(seq, ano, j, tr, origem)}.{ano}.{j}.{tr}.{origem}"


def criar_pdf(caminho: Path, linhas: list[str]) -> Path:
    c = canvas.Canvas(str(caminho))
    y = 800
    for linha in linhas:
        c.drawString(50, y, linha)
        y -= 20
    c.showPage()
    c.save()
    return caminho


@pytest.fixture
def cfg(tmp_path):
    c = Config()
    c.pasta_dados = tmp_path / "dados"
    c.pasta_roteiros = tmp_path / "roteiros"
    c.pastas_entrada = [tmp_path / "entrada"]
    c.pastas_entrada[0].mkdir()
    c.headless = True
    c.canal_navegador = None
    caminho = os.environ.get("CHROMIUM_TESTE") or (str(CHROMIUM_LOCAL) if CHROMIUM_LOCAL.exists() else None)
    c.caminho_navegador = caminho
    c.tempo_limite_passo = 5
    c.preparar_pastas()
    return c


@pytest.fixture
def banco(cfg):
    return Banco(cfg.banco)


@pytest.fixture
def roteiro_simulado(cfg):
    """Roteiro contra uma página local que imita um sistema de peticionamento."""
    url = (FIXTURES / "tribunal_simulado.html").resolve().as_uri()
    roteiro = {
        "nome": "Tribunal simulado (teste)",
        "url_inicial": url,
        "passos": [
            {"acao": "abrir", "url": "{url_inicial}"},
            {"acao": "clicar", "seletor": "#entrar", "se_visivel": "#entrar", "descricao": "login"},
            {"acao": "preencher", "seletor": "#numero", "valor": "{cnj}"},
            {"acao": "clicar", "seletor": "#pesquisar"},
            {"acao": "aguardar", "seletor": "#form-peticao"},
            {"acao": "selecionar", "seletor": "#tipo", "valor": "{tipo}"},
            {"acao": "anexar", "seletor": "#arquivo", "valor": "{arquivo}"},
            {"acao": "clicar", "seletor": "#assinar", "envio_final": True, "descricao": "assinar e enviar"},
            {"acao": "aguardar_texto", "texto": "Petição protocolada"},
            {"acao": "capturar_protocolo", "regex": r"Protocolo n[ºo]\s*([\d./-]+)"},
        ],
    }
    (cfg.pasta_roteiros / "simulado.json").write_text(json.dumps(roteiro), encoding="utf-8")
    return "simulado"
