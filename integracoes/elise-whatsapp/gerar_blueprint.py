"""Gera o blueprint do cenário Make "LA Elise - Atendente WhatsApp".

Uso: python3 gerar_blueprint.py  ->  grava blueprint.json ao lado deste arquivo.

O prompt de sistema é lido, a cada mensagem, do Google Doc DOC_PROMPT_ID
(cópia de prompt-sistema-elise.md). Editar o Doc altera a Elise sem mexer no Make.
O prompt vai para a API da Anthropic com cache de 1 hora.
"""
import json
from pathlib import Path

AQUI = Path(__file__).parent
DOC_PROMPT_ID = "18has88qkJLGegEvRPn0C1F4s-GJs2kUc3AOC2K7dbsI"
PLANILHA_ID = "1LJ4LehuDw-T95WKJrrkAwnHaSaybsdNhGRCMQzdyDIk"
ABA = "Conversas"
MODELO = "claude-sonnet-5-5"
FUSO = "America/Campo_Grande"  # Naviraí/MS
PAUSA_HORAS = 12
LIMITE_HIST = 6000


_pos = {"x": 0}


def meta():
    _pos["x"] += 300
    return {"designer": {"x": _pos["x"], "y": 0}}


def hist_aparado(expr):
    return (f"{{{{if(length({expr}) > {LIMITE_HIST}; "
            f"substring({expr}; length({expr}) - {LIMITE_HIST}; length({expr})); {expr})}}}}")


def cond(a, o, b=None):
    c = {"a": a, "o": o}
    if b is not None:
        c["b"] = b
    return c


def sheets_base():
    return {
        "mode": "map",
        "spreadsheetId": PLANILHA_ID,
        "sheetId": ABA,
        "tableFirstRow": "A1:Z1",
        "valueInputOption": "RAW",
    }


def buscar_linha(mid, wa_id_expr):
    return {
        "id": mid,
        "module": "google-sheets:filterRows",
        "version": 2,
        "parameters": {},
        "mapper": {
            "from": "share",
            "spreadsheetId": PLANILHA_ID,
            "sheetId": ABA,
            "includesHeaders": True,
            "tableFirstRow": "A1:Z1",
            "filter": [[cond("0", "text:equal", wa_id_expr)]],
            "sortOrder": "",
            "orderBy": "",
            "limit": 1,
        },
        "metadata": meta(),
    }


def atualizar(mid, linha_expr, valores, nome_filtro=None, filtro=None):
    m = {
        "id": mid,
        "module": "google-sheets:updateRow",
        "version": 2,
        "parameters": {},
        "mapper": {**sheets_base(), "rowNumber": linha_expr, "values": valores},
        "metadata": meta(),
    }
    if filtro:
        m["filter"] = {"name": nome_filtro, "conditions": filtro}
    return m


def inserir(mid, valores, nome_filtro=None, filtro=None):
    m = {
        "id": mid,
        "module": "google-sheets:addRow",
        "version": 2,
        "parameters": {},
        "mapper": {**sheets_base(), "insertUnformatted": False, "insertDataOption": "INSERT_ROWS",
                   "values": valores},
        "metadata": meta(),
    }
    if filtro:
        m["filter"] = {"name": nome_filtro, "conditions": filtro}
    return m


def upsert(mid_router, mid_upd, mid_add, linha_expr, valores):
    """Atualiza a linha do cliente se existir; senão, cria."""
    return {
        "id": mid_router,
        "module": "builtin:BasicRouter",
        "version": 1,
        "mapper": None,
        "metadata": meta(),
        "routes": [
            {"flow": [atualizar(mid_upd, linha_expr, valores, "Cliente já na planilha",
                                [[cond(linha_expr, "exist")]])]},
            {"flow": [inserir(mid_add, valores, "Cliente novo",
                              [[cond(linha_expr, "notexist")]])]},
        ],
    }


AGORA_ISO = "{{formatDate(now; \"YYYY-MM-DDTHH:mm:ssZ\")}}"
LINHA = "{{4.__ROW_NUMBER__}}"
COL = lambda i: f"{{{{4.`{i}`}}}}"  # coluna i (0 = A) da linha encontrada no módulo 4

# --- Rota A: alguém do escritório respondeu pelo app (coexistência) -> pausa a Elise
rota_humano = [
    buscar_linha(20, "{{1.value.message_echoes[1].to}}"),
    atualizar(
        21, "{{20.__ROW_NUMBER__}}",
        {"3": f"{{{{formatDate(addHours(now; {PAUSA_HORAS}); \"YYYY-MM-DDTHH:mm:ssZ\")}}}}",
         "8": AGORA_ISO},
        "Conversa existe na planilha", [[cond("{{20.__ROW_NUMBER__}}", "exist")]],
    ),
]

# --- Rota B: mensagem recebida do cliente
TEXTO = ("{{ifempty(1.value.messages[1].text.body; "
         "join(add(emptyarray; \"[mídia:\"; 1.value.messages[1].type; \"]\"); \" \"))}}")

variaveis_entrada = {
    "id": 3,
    "module": "util:SetVariables",
    "version": 1,
    "parameters": {},
    "mapper": {
        "scope": "roundtrip",
        "variables": [
            {"name": "wa_id", "value": "{{1.value.messages[1].from}}"},
            {"name": "nome", "value": "{{ifempty(1.value.contacts[1].profile.name; \"(sem nome)\")}}"},
            {"name": "texto", "value": TEXTO},
            {"name": "hora", "value": f"{{{{parseNumber(formatDate(now; \"H\"; \"{FUSO}\"))}}}}"},
        ],
    },
    "metadata": meta(),
}

historico_cliente = {
    "id": 5,
    "module": "util:SetVariables",
    "version": 1,
    "parameters": {},
    "mapper": {
        "scope": "roundtrip",
        "variables": [
            {"name": "hist_cliente", "value": COL(2) + "\nCliente: {{3.texto}}"},
        ],
    },
    "metadata": meta(),
}

PAUSADA = [[cond(COL(3), "exist"), cond(COL(3), "date:greater", "{{now}}")]]
NAO_PAUSADA_E = lambda extra: [
    [cond(COL(3), "notexist"), *extra],
    [cond(COL(3), "date:lessorequal", "{{now}}"), *extra],
]
FORA = (NAO_PAUSADA_E([cond("{{3.hora}}", "number:less", "7")])
        + NAO_PAUSADA_E([cond("{{3.hora}}", "number:greaterorequal", "19")]))
DENTRO = NAO_PAUSADA_E([cond("{{3.hora}}", "number:greaterorequal", "7"),
                        cond("{{3.hora}}", "number:less", "19")])

so_registrar_pausada = atualizar(
    30, LINHA, {"2": hist_aparado("5.hist_cliente"), "8": AGORA_ISO},
    "Elise pausada (humano assumiu)", PAUSADA,
)

valores_fora = {
    "0": "{{3.wa_id}}", "1": "{{3.nome}}", "2": hist_aparado("5.hist_cliente"),
    "4": "{{ifempty(4.`4`; \"NAO\")}}", "7": "SIM", "8": AGORA_ISO,
}
rota_fora = [{
    "id": 31, "module": "builtin:BasicRouter", "version": 1, "mapper": None, "metadata": meta(),
    "filter": {"name": "Fora do horário (7h-19h)", "conditions": FORA},
    "routes": [
        {"flow": [atualizar(32, LINHA, valores_fora, "Cliente já na planilha", [[cond(LINHA, "exist")]])]},
        {"flow": [inserir(33, valores_fora, "Cliente novo", [[cond(LINHA, "notexist")]])]},
    ],
}]

CONVERSA = ("CONVERSA\nPerfil: {{3.nome}}\n"
            f"Agora: {{{{formatDate(now; \"dddd, DD/MM/YYYY HH:mm\"; \"{FUSO}\")}}}}\n"
            "Histórico (a última linha é a mensagem a responder):\n{{5.hist_cliente}}")

corpo_api = (
    "{\"model\": " + json.dumps(MODELO) + ", \"max_tokens\": 1024, "
    "\"system\": [{\"type\": \"text\", \"text\": {{39.json}} , \"cache_control\": {\"type\": \"ephemeral\", \"ttl\": \"1h\"}}], "
    "\"messages\": [{\"role\": \"user\", \"content\": {{40.json}} }]}"
)

R = "41.body.content[1].text"
rota_elise = [
    {
        "id": 38, "module": "google-drive:makeApiCall", "version": 4, "parameters": {},
        "mapper": {"url": f"/v3/files/{DOC_PROMPT_ID}/export", "method": "GET",
                   "qs": [{"key": "mimeType", "value": "text/plain"}], "headers": []},
        "metadata": meta(),
        "filter": {"name": "Dentro do horário e Elise ativa", "conditions": DENTRO},
    },
    {
        "id": 39, "module": "json:TransformToJSON", "version": 1,
        "parameters": {"space": ""}, "mapper": {"object": "{{38.body}}"}, "metadata": meta(),
    },
    {
        "id": 40, "module": "json:TransformToJSON", "version": 1,
        "parameters": {"space": ""}, "mapper": {"object": CONVERSA}, "metadata": meta(),
    },
    {
        "id": 41, "module": "anthropic-claude:makeAnApiCall", "version": 1,
        "parameters": {},
        "mapper": {
            "url": "/v1/messages",
            "method": "POST",
            "headers": [
                {"key": "anthropic-version", "value": "2023-06-01"},
                {"key": "content-type", "value": "application/json"},
            ],
            "body": corpo_api,
        },
        "metadata": meta(),
        "onerror": [{"id": 49, "module": "builtin:Ignore", "version": 1, "mapper": None,
                     "metadata": {"designer": {"x": _pos["x"], "y": 300}}}],
    },
    {
        "id": 42, "module": "util:SetVariables", "version": 1, "parameters": {},
        "mapper": {
            "scope": "roundtrip",
            "variables": [
                {"name": "resposta",
                 "value": f"{{{{trim(replace({R}; /<<ENCAMINHAR:[\\s\\S]*?>>/g; \"\"))}}}}"},
                {"name": "encaminhar",
                 "value": f"{{{{if(contains({R}; \"<<ENCAMINHAR\"); \"SIM\"; \"NAO\")}}}}"},
                {"name": "motivo",
                 "value": (f"{{{{if(contains({R}; \"<<ENCAMINHAR\"); "
                           f"trim(replace(replace({R}; /^[\\s\\S]*<<ENCAMINHAR:/; \"\"); />>[\\s\\S]*$/; \"\")); \"\")}}}}")},
            ],
        },
        "metadata": meta(),
    },
    {
        "id": 43, "module": "whatsapp-business-cloud:sendMessage", "version": 1,
        "parameters": {},
        "mapper": {
            "to": "{{3.wa_id}}",
            "type": "text",
            "text": {"body": "{{42.resposta}}", "preview_url": False},
        },
        "metadata": meta(),
        "filter": {"name": "Há resposta", "conditions": [[cond("{{42.resposta}}", "exist")]]},
    },
    {
        "id": 44, "module": "util:SetVariables", "version": 1, "parameters": {},
        "mapper": {"scope": "roundtrip", "variables": [
            {"name": "hist_full", "value": "{{5.hist_cliente}}\nElise: {{42.resposta}}"}]},
        "metadata": meta(),
    },
    upsert(45, 46, 47, LINHA, {
        "0": "{{3.wa_id}}",
        "1": "{{3.nome}}",
        "2": hist_aparado("44.hist_full"),
        "4": "{{if(42.encaminhar = \"SIM\"; \"SIM\"; ifempty(4.`4`; \"NAO\"))}}",
        "5": "{{if(42.encaminhar = \"SIM\"; 42.motivo; 4.`5`)}}",
        "6": "{{if(42.encaminhar = \"SIM\"; " + AGORA_ISO[2:-2] + "; 4.`6`)}}",
        "7": "NAO",
        "8": AGORA_ISO,
    }),
]

rota_cliente = [
    variaveis_entrada,
    buscar_linha(4, "{{3.wa_id}}"),
    historico_cliente,
    {
        "id": 6, "module": "builtin:BasicRouter", "version": 1, "mapper": None, "metadata": meta(),
        "routes": [
            {"flow": [so_registrar_pausada]},
            {"flow": rota_fora},
            {"flow": rota_elise},
        ],
    },
]

blueprint = {
    "name": "LA Elise - Atendente WhatsApp",
    "flow": [
        {"id": 1, "module": "whatsapp-business-cloud:watchEvents2", "version": 1,
         "parameters": {}, "mapper": {}, "metadata": {"designer": {"x": 0, "y": 0}}},
        {
            "id": 2, "module": "builtin:BasicRouter", "version": 1, "mapper": None,
            "metadata": {"designer": {"x": 300, "y": 0}},
            "routes": [
                {"flow": [{**rota_humano[0], "filter": {
                    "name": "Escritório respondeu pelo app",
                    "conditions": [[cond("{{1.field}}", "text:equal", "smb_message_echoes")]]}},
                    rota_humano[1]]},
                {"flow": [{**rota_cliente[0], "filter": {
                    "name": "Mensagem recebida do cliente",
                    "conditions": [[cond("{{1.field}}", "text:equal", "messages"),
                                    cond("{{1.value.messages[1].from}}", "exist")]]}},
                    *rota_cliente[1:]]},
            ],
        },
    ],
    "metadata": {
        "version": 1,
        "instant": True,
        "scenario": {"roundtrips": 1, "maxErrors": 3, "autoCommit": True, "autoCommitTriggerLast": True,
                     "sequential": True, "confidential": False, "dataloss": False, "dlq": False,
                     "freshVariables": False},
    },
}

(AQUI / "blueprint.json").write_text(json.dumps(blueprint, ensure_ascii=False, indent=1), encoding="utf-8")
print("blueprint.json gerado:", len(json.dumps(blueprint)), "bytes")
