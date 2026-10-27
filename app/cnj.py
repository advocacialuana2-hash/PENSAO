"""Número único de processo (Resolução CNJ nº 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.

Valida o dígito verificador (ISO 7064, módulo 97) e identifica o tribunal
a partir dos campos J (segmento do Judiciário) e TR (tribunal).
"""
from __future__ import annotations

import re
from dataclasses import dataclass

PADRAO = re.compile(r"(?<!\d)(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})(?!\d)")

# Ordem alfabética das unidades da Federação usada pelo CNJ nos campos TR.
UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SE", "SP", "TO",
]
TJM = {"13": "TJMMG", "21": "TJMRS", "26": "TJMSP"}


@dataclass(frozen=True)
class NumeroCNJ:
    sequencial: str
    digito: str
    ano: str
    segmento: str
    tribunal_codigo: str
    origem: str

    @property
    def formatado(self) -> str:
        return (f"{self.sequencial}-{self.digito}.{self.ano}."
                f"{self.segmento}.{self.tribunal_codigo}.{self.origem}")

    @property
    def digitos(self) -> str:
        return self.formatado.replace("-", "").replace(".", "")

    @property
    def tribunal(self) -> str | None:
        return identificar_tribunal(self.segmento, self.tribunal_codigo)


def calcular_digito(sequencial: str, ano: str, segmento: str, tribunal: str, origem: str) -> str:
    resto = int(f"{sequencial}{ano}{segmento}{tribunal}{origem}00") % 97
    return f"{98 - resto:02d}"


def identificar_tribunal(segmento: str, tr: str) -> str | None:
    n = int(tr)
    if segmento == "1":
        return "STF"
    if segmento == "2":
        return "CNJ"
    if segmento == "3":
        return "STJ"
    if segmento == "4":
        return f"TRF{n}" if 1 <= n <= 6 else None
    if segmento == "5":
        if n == 0:
            return "TST"
        return f"TRT{n}" if 1 <= n <= 24 else None
    if segmento == "6":
        if n == 0:
            return "TSE"
        return f"TRE-{UFS[n - 1]}" if 1 <= n <= 27 else None
    if segmento == "7":
        return "STM"
    if segmento == "8":
        return f"TJ{UFS[n - 1]}" if 1 <= n <= 27 else None
    if segmento == "9":
        return TJM.get(tr)
    return None


def interpretar(texto: str) -> NumeroCNJ | None:
    """Interpreta um número CNJ e retorna None se o formato ou o dígito forem inválidos."""
    m = PADRAO.search(texto.strip())
    if not m:
        return None
    seq, dd, ano, j, tr, oooo = m.groups()
    if calcular_digito(seq, ano, j, tr, oooo) != dd:
        return None
    return NumeroCNJ(seq, dd, ano, j, tr, oooo)


def encontrar_todos(texto: str) -> list[NumeroCNJ]:
    """Todos os números CNJ válidos do texto, sem repetição, na ordem em que aparecem."""
    vistos: dict[str, NumeroCNJ] = {}
    for m in PADRAO.finditer(texto):
        numero = interpretar(m.group(0))
        if numero and numero.formatado not in vistos:
            vistos[numero.formatado] = numero
    return list(vistos.values())
