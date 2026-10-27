"""Roteiros de protocolo: a sequência de passos de cada sistema/tribunal, em JSON.

Cada tribunal tem telas diferentes mesmo usando o mesmo sistema (PJe, e-SAJ,
eproc, Projudi), por isso o roteiro é gravado a partir de um protocolo real
e não é escrito de memória.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ACOES = {
    "abrir": {"url"},
    "clicar": {"seletor"},
    "preencher": {"seletor", "valor"},
    "selecionar": {"seletor", "valor"},
    "anexar": {"seletor", "valor"},
    "pressionar": {"seletor", "tecla"},
    "aguardar": {"seletor"},
    "aguardar_texto": {"texto"},
    "aguardar_usuario": {"mensagem"},
    "esperar": {"segundos"},
    "conferir_texto": {"texto"},
    "capturar_protocolo": {"regex"},
    "extrair": {"seletor", "campo"},
}
MODOS_EXTRAIR = {"texto", "lista", "tabela"}
NOME_VALIDO = re.compile(r"^[a-z0-9][a-z0-9_-]*$")
VARIAVEL = re.compile(r"\{(\w+)\}")


class RoteiroInvalido(ValueError):
    pass


def validar(roteiro: dict, nome: str = "") -> dict:
    passos = roteiro.get("passos")
    if not isinstance(passos, list) or not passos:
        raise RoteiroInvalido(f"Roteiro {nome}: 'passos' precisa ser uma lista não vazia.")
    consulta = roteiro.get("tipo") == "consulta"
    finais = extracoes = 0
    for i, passo in enumerate(passos, 1):
        acao = passo.get("acao")
        if acao not in ACOES:
            raise RoteiroInvalido(f"Roteiro {nome}, passo {i}: ação desconhecida '{acao}'.")
        faltando = ACOES[acao] - passo.keys()
        if faltando:
            raise RoteiroInvalido(f"Roteiro {nome}, passo {i} ({acao}): faltam {sorted(faltando)}.")
        if acao == "extrair" and passo.get("modo", "texto") not in MODOS_EXTRAIR:
            raise RoteiroInvalido(f"Roteiro {nome}, passo {i}: modo de extração deve ser {sorted(MODOS_EXTRAIR)}.")
        finais += bool(passo.get("envio_final"))
        extracoes += acao == "extrair"
    if consulta:
        if finais:
            raise RoteiroInvalido(f"Roteiro {nome}: roteiro de consulta não pode ter envio final.")
        if not extracoes:
            raise RoteiroInvalido(f"Roteiro {nome}: roteiro de consulta precisa de ao menos um passo \"extrair\".")
        return roteiro
    if finais != 1:
        raise RoteiroInvalido(f"Roteiro {nome}: marque exatamente um passo com \"envio_final\": true "
                              f"(o clique que efetivamente protocola). Encontrados: {finais}.")
    return roteiro


def listar(pasta: Path) -> dict[str, dict]:
    roteiros = {}
    for arquivo in sorted(pasta.glob("*.json")):
        try:
            roteiros[arquivo.stem] = carregar(pasta, arquivo.stem)
        except (RoteiroInvalido, json.JSONDecodeError) as exc:
            roteiros[arquivo.stem] = {"nome": arquivo.stem, "erro": str(exc)}
    return roteiros


def carregar(pasta: Path, nome: str) -> dict:
    if not NOME_VALIDO.match(nome or ""):
        raise RoteiroInvalido(f"Nome de roteiro inválido: {nome!r}")
    arquivo = pasta / f"{nome}.json"
    if not arquivo.exists():
        raise RoteiroInvalido(f"Roteiro '{nome}' não encontrado em {pasta}.")
    roteiro = json.loads(arquivo.read_text(encoding="utf-8"))
    roteiro.setdefault("nome", nome)
    return validar(roteiro, nome)


def substituir(valor, variaveis: dict[str, str]):
    """Troca {variavel} pelos dados do envio; chaves desconhecidas ficam intactas."""
    if not isinstance(valor, str):
        return valor
    return VARIAVEL.sub(lambda m: str(variaveis.get(m.group(1), m.group(0))), valor)
