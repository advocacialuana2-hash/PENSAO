from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

import yaml

RAIZ = Path(__file__).resolve().parent.parent


@dataclass
class Config:
    pastas_entrada: list[Path] = field(default_factory=list)
    pasta_dados: Path = RAIZ / "dados"
    pasta_roteiros: Path = RAIZ / "roteiros"
    limite_mb: float = 10.0
    intervalo_varredura: int = 10
    porta: int = 8765
    canal_navegador: str | None = "chrome"
    caminho_navegador: str | None = None
    headless: bool = False
    tempo_limite_passo: int = 30

    @property
    def pasta_arquivos(self) -> Path:
        return self.pasta_dados / "arquivos"

    @property
    def pasta_comprovantes(self) -> Path:
        return self.pasta_dados / "comprovantes"

    @property
    def perfil_navegador(self) -> Path:
        return self.pasta_dados / "perfil-navegador"

    @property
    def banco(self) -> Path:
        return self.pasta_dados / "protocolos.db"

    def preparar_pastas(self) -> None:
        for p in (self.pasta_dados, self.pasta_arquivos, self.pasta_comprovantes,
                  self.pasta_roteiros, self.perfil_navegador):
            p.mkdir(parents=True, exist_ok=True)


def _caminho(valor: str, base: Path) -> Path:
    p = Path(os.path.expandvars(os.path.expanduser(valor)))
    return p if p.is_absolute() else (base / p).resolve()


def carregar(caminho: str | Path | None = None) -> Config:
    arquivo = Path(caminho or os.environ.get("PROTOCOLO_CONFIG") or RAIZ / "config.yaml")
    dados = {}
    if arquivo.exists():
        dados = yaml.safe_load(arquivo.read_text(encoding="utf-8")) or {}
    base = arquivo.parent.resolve()
    cfg = Config()
    cfg.pastas_entrada = [_caminho(p, base) for p in dados.get("pastas_entrada") or []]
    if "pasta_dados" in dados:
        cfg.pasta_dados = _caminho(dados["pasta_dados"], base)
    if "pasta_roteiros" in dados:
        cfg.pasta_roteiros = _caminho(dados["pasta_roteiros"], base)
    navegador = dados.get("navegador") or {}
    cfg.canal_navegador = navegador.get("canal", cfg.canal_navegador) or None
    cfg.headless = bool(navegador.get("headless", cfg.headless))
    cfg.caminho_navegador = navegador.get("caminho") or None
    for chave in ("limite_mb", "intervalo_varredura", "porta", "tempo_limite_passo"):
        if chave in dados:
            setattr(cfg, chave, type(getattr(cfg, chave))(dados[chave]))
    return cfg
