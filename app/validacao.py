"""Regras que um envio precisa cumprir antes de ir para o robô (painel local e API)."""
from __future__ import annotations

from . import roteiros
from .config import Config
from .db import Banco

EDITAVEL = {"pendente", "erro", "ensaio_ok", "falta_roteiro"}
# Envio anterior com o mesmo arquivo nesses estados pode já ter entrado no tribunal ou estar entrando.
ARRISCADOS = {"aprovado", "executando", "aguardando_voce", "protocolado", "conferir"}


def problema(cfg: Config, banco: Banco, envio: dict, confirmar_duplicado: bool,
             qualquer_duplicado: bool = True) -> tuple[str, str] | None:
    """Retorna (status, mensagem) quando o envio não pode seguir; None quando pode."""
    if envio["status"] not in EDITAVEL:
        return "erro", "Este envio não está disponível para execução."
    if envio.get("destino") == "inss":
        if not envio.get("identificador"):
            return "erro", "Informe o número do requerimento ou protocolo do INSS."
    elif not envio["cnj"]:
        return "erro", "Informe o número do processo (CNJ válido)."
    if not envio["roteiro"]:
        local = envio["tribunal"] or ("INSS" if envio.get("destino") == "inss" else "este sistema")
        return "falta_roteiro", f"Ainda não há roteiro gravado para {local}. Grave um protocolo real com o gravador."
    try:
        roteiro = roteiros.carregar(cfg.pasta_roteiros, envio["roteiro"])
    except (roteiros.RoteiroInvalido, ValueError) as exc:
        return "falta_roteiro", str(exc)
    if roteiro.get("tipo") == "consulta":
        return "erro", f"O roteiro '{envio['roteiro']}' é de consulta e não protocola."
    if any(a.startswith("BLOQUEIO") for a in envio["alertas"]):
        return "erro", "A peça tem um bloqueio (veja os alertas). Corrija o arquivo e envie de novo."
    if not confirmar_duplicado:
        if qualquer_duplicado and any(a.startswith("DUPLICADO") for a in envio["alertas"]):
            return "erro", "Arquivo duplicado: marque a confirmação para prosseguir."
        anteriores = [e for e in banco.com_hash(envio["hash"], exceto=envio["id"]) if e["status"] in ARRISCADOS]
        if anteriores:
            ref = anteriores[0]
            return "erro", (f"O mesmo arquivo já está no envio #{ref['id']} ({ref['status']}). "
                            "Para protocolar de novo, confirme expressamente.")
    return None
