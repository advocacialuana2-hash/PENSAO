"""Entrada das peças: pastas monitoradas (computador e nuvem sincronizada) e envio manual."""
from __future__ import annotations

import shutil
import threading
import time
from pathlib import Path

from . import pdf
from .config import Config
from .db import Banco


def ingerir(cfg: Config, banco: Banco, origem_arquivo: Path, origem: str, nome: str | None = None) -> int:
    analise = pdf.analisar(origem_arquivo, cfg.limite_mb)
    destino = cfg.pasta_arquivos / f"{analise.hash[:16]}.pdf"
    if not destino.exists():
        shutil.copy2(origem_arquivo, destino)
    alertas = list(analise.alertas)
    for anterior in banco.com_hash(analise.hash):
        alertas.append(f"DUPLICADO: o mesmo arquivo já entrou como envio #{anterior['id']} "
                       f"(status: {anterior['status']}).")
    numero = analise.numeros_cnj[0] if len(analise.numeros_cnj) == 1 else None
    tribunal = numero.tribunal if numero else None
    return banco.inserir_envio(
        origem=origem,
        nome_original=nome or origem_arquivo.name,
        arquivo=str(destino),
        hash=analise.hash,
        paginas=analise.paginas,
        tamanho=analise.tamanho,
        cnj=numero.formatado if numero else None,
        tribunal=tribunal,
        roteiro=banco.roteiro_do_tribunal(tribunal),
        tipo=analise.tipo_sugerido,
        alertas=alertas,
    )


def varrer(cfg: Config, banco: Banco) -> list[int]:
    novos = []
    agora = time.time()
    for pasta in cfg.pastas_entrada:
        if not pasta.is_dir():
            continue
        for arquivo in pasta.rglob("*"):
            if arquivo.suffix.lower() != ".pdf" or not arquivo.is_file():
                continue
            estado = arquivo.stat()
            if agora - estado.st_mtime < 5:  # ainda sendo copiado ou sincronizado
                continue
            assinatura = f"{estado.st_size}:{int(estado.st_mtime)}"
            chave = str(arquivo.resolve())
            if banco.ja_visto(chave, assinatura):
                continue
            banco.marcar_visto(chave, assinatura)
            novos.append(ingerir(cfg, banco, arquivo, f"pasta {pasta.name}"))
    return novos


def monitorar(cfg: Config, banco: Banco) -> threading.Thread:
    def laco():
        while True:
            try:
                varrer(cfg, banco)
            except Exception as exc:  # pasta de rede fora do ar não pode derrubar o sistema
                print(f"[monitor] {exc}")
            time.sleep(cfg.intervalo_varredura)

    t = threading.Thread(target=laco, name="monitor-pastas", daemon=True)
    t.start()
    return t
