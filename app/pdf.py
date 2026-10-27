"""Análise da peça em PDF antes do protocolo."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from . import cnj

# Ordem importa: o primeiro termo encontrado no início da peça define a sugestão.
TIPOS = [
    ("EMBARGOS DE DECLARAÇÃO", "Embargos de declaração"),
    ("CONTRARRAZÕES", "Contrarrazões"),
    ("AGRAVO DE INSTRUMENTO", "Agravo de instrumento"),
    ("AGRAVO INTERNO", "Agravo interno"),
    ("RECURSO ORDINÁRIO", "Recurso ordinário"),
    ("RECURSO INOMINADO", "Recurso inominado"),
    ("APELAÇÃO", "Apelação"),
    ("CONTESTAÇÃO", "Contestação"),
    ("RÉPLICA", "Réplica"),
    ("IMPUGNAÇÃO À CONTESTAÇÃO", "Réplica"),
    ("CUMPRIMENTO DE SENTENÇA", "Cumprimento de sentença"),
    ("ALEGAÇÕES FINAIS", "Alegações finais"),
    ("MEMORIAIS", "Memoriais"),
    ("EXECUÇÃO DE ALIMENTOS", "Execução de alimentos"),
    ("MANIFESTAÇÃO", "Manifestação"),
]


@dataclass
class Analise:
    hash: str
    tamanho: int
    paginas: int = 0
    numeros_cnj: list[cnj.NumeroCNJ] = field(default_factory=list)
    tipo_sugerido: str | None = None
    tem_texto: bool = False
    alertas: list[str] = field(default_factory=list)

    @property
    def bloqueante(self) -> bool:
        return any(a.startswith("BLOQUEIO") for a in self.alertas)


def hash_arquivo(caminho: Path) -> str:
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 16), b""):
            h.update(bloco)
    return h.hexdigest()


def sugerir_tipo(texto: str) -> str | None:
    inicio = texto[:3000].upper()
    posicoes = [(inicio.find(termo), rotulo) for termo, rotulo in TIPOS if termo in inicio]
    return min(posicoes)[1] if posicoes else None


def analisar(caminho: Path, limite_mb: float) -> Analise:
    analise = Analise(hash=hash_arquivo(caminho), tamanho=caminho.stat().st_size)
    if analise.tamanho > limite_mb * 1024 * 1024:
        analise.alertas.append(
            f"BLOQUEIO: arquivo com {analise.tamanho / 1048576:.1f} MB excede o limite "
            f"configurado de {limite_mb:g} MB. Divida ou comprima o PDF.")
    try:
        leitor = PdfReader(caminho)
        if leitor.is_encrypted:
            analise.alertas.append("BLOQUEIO: PDF protegido por senha. Os sistemas judiciais recusam.")
            return analise
        analise.paginas = len(leitor.pages)
        texto = "\n".join((p.extract_text() or "") for p in leitor.pages[:3])
    except (PdfReadError, OSError, ValueError) as exc:
        analise.alertas.append(f"BLOQUEIO: PDF ilegível ou corrompido ({exc}).")
        return analise

    analise.tem_texto = bool(texto.strip())
    if not analise.tem_texto:
        analise.alertas.append("Sem texto pesquisável (PDF digitalizado). Informe o número do "
                               "processo manualmente e confira se o tribunal exige OCR.")
    analise.numeros_cnj = cnj.encontrar_todos(texto)
    if len(analise.numeros_cnj) > 1:
        lista = ", ".join(n.formatado for n in analise.numeros_cnj)
        analise.alertas.append(f"Mais de um número de processo na peça ({lista}). "
                               "Confirme qual é o destino.")
    elif analise.tem_texto and not analise.numeros_cnj:
        analise.alertas.append("Nenhum número CNJ válido encontrado nas 3 primeiras páginas.")
    analise.tipo_sugerido = sugerir_tipo(texto)
    return analise
