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
PLANILHA_ID = "16As1XW0a_dos0IhBuy_tnHZJr8F_x9L-EtThbtbSAFo"
CALENDARIO = "primary"  # agenda principal da conta Google conectada
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
            {"name": "hist_cliente", "value": COL(2) + "\nCliente: {{14.texto}}"},
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

ASAAS_CONN = 11902246  # conexão Asaas já existente no Make
IGNORAR = lambda mid: [{"id": mid, "module": "builtin:Ignore", "version": 1, "mapper": None,
                        "metadata": {"designer": {"x": _pos["x"], "y": 300}}}]

# --- CPF: o da planilha (coluna K) ou um CPF digitado na última mensagem
CAND = "replace(14.texto; /^[\\s\\S]*?(\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2})[\\s\\S]*$/; \"$1\")"
DIG = f"replace({CAND}; /\\D/g; \"\")"
CPF_EXPR = f"{{{{ifempty(4.`10`; if(length({DIG}) = 11; if(length({CAND}) <= 14; {DIG}; \"\"); \"\"))}}}}"

def asaas_get(mid, url, filtro=None):
    m = {"id": mid, "module": "asaas:apiCall", "version": 1,
         "parameters": {"__IMTCONN__": ASAAS_CONN},
         "mapper": {"url": url, "method": "GET", "headers": [{"key": "Content-Type", "value": "application/json"}]},
         "metadata": meta(), "onerror": IGNORAR(mid + 100)}
    if filtro:
        m["filter"] = filtro
    return m

def lista(mod, campo):
    return f"{{{{ifempty(join(map({mod}.body.data; \"{campo}\"); \"; \"); \"nenhuma\")}}}}"

ASAAS_TXT = ("Cadastro: {{52.body.data[1].name}}\n"
             "VENCIDAS: vencimentos: " + lista(53, "dueDate") + " | valores: " + lista(53, "value")
             + " | links: " + lista(53, "invoiceUrl") + "\n"
             "A VENCER: vencimentos: " + lista(57, "dueDate") + " | valores: " + lista(57, "value")
             + " | links: " + lista(57, "invoiceUrl"))

rota_asaas = [
    asaas_get(52, "/v3/customers?cpfCnpj={{50.cpf}}",
              {"name": "CPF disponível", "conditions": [[cond("{{50.cpf}}", "exist")]]}),
    {"id": 56, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [{"name": "asaas_txt", "value": "cliente não encontrado"}]}},
    asaas_get(53, "/v3/payments?customer={{52.body.data[1].id}}&status=OVERDUE&limit=10",
              {"name": "Cliente encontrado", "conditions": [[cond("{{52.body.data[1].id}}", "exist")]]}),
    asaas_get(57, "/v3/payments?customer={{52.body.data[1].id}}&status=PENDING&limit=10"),
    {"id": 58, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [
         {"name": "asaas_txt", "value": ASAAS_TXT},
         {"name": "cpf_valido", "value": "{{50.cpf}}"}]}},
]

def cal_call(mid, url, body, filtro=None):
    m = {"id": mid, "module": "google-calendar:makeApiCall", "version": 5, "parameters": {},
         "mapper": {"url": url, "method": "POST",
                    "headers": [{"key": "Content-Type", "value": "application/json"}], "body": body},
         "metadata": meta(), "onerror": IGNORAR(mid + 100)}
    if filtro:
        m["filter"] = filtro
    return m

ISO = lambda expr: f"{{{{formatDate({expr}; \"YYYY-MM-DDTHH:mm:ssZ\")}}}}"
rota_agenda = [
    cal_call(60, "/v3/freeBusy",
             "{\"timeMin\": \"" + ISO("now") + "\", \"timeMax\": \"" + ISO("addDays(now; 14)")
             + f"\", \"timeZone\": \"{FUSO}\", \"items\": [{{\"id\": \"{CALENDARIO}\"}}]}}",
             {"name": "Caso aceito pela Dra. Luana", "conditions": [[cond("{{4.`9`}}", "text:equal:ci", "SIM")]]}),
    {"id": 61, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [{"name": "agenda_txt", "value":
         f"inícios: {{{{ifempty(join(map(60.body.calendars.{CALENDARIO}.busy; \"start\"); \"; \"); \"nenhum período ocupado\")}}}}\n"
         f"fins: {{{{join(map(60.body.calendars.{CALENDARIO}.busy; \"end\"); \"; \")}}}}"}]}},
]

CONVERSA = ("CONVERSA\nPerfil: {{3.nome}}\n"
            f"Agora: {{{{formatDate(now; \"dddd, DD/MM/YYYY HH:mm\"; \"{FUSO}\")}}}}\n"
            "Histórico (a última linha é a mensagem a responder):\n{{5.hist_cliente}}\n\n"
            "DADOS DO SISTEMA\n"
            "caso_aceito: {{ifempty(4.`9`; \"NAO\")}}\n"
            "AGENDA (períodos ocupados): {{ifempty(62.agenda_txt; \"não consultada (caso não aceito)\")}}\n"
            "ASAAS: {{ifempty(62.asaas_txt; \"CPF não informado\")}}")

corpo_api = (
    "{\"model\": " + json.dumps(MODELO) + ", \"max_tokens\": 1024, "
    "\"system\": [{\"type\": \"text\", \"text\": {{39.json}} , \"cache_control\": {\"type\": \"ephemeral\", \"ttl\": \"1h\"}}], "
    "\"messages\": [{\"role\": \"user\", \"content\": [{{13.midia_bloco}} {\"type\": \"text\", \"text\": {{40.json}} }]}]}"
)

R = "41.body.content[1].text"
def marcador(nome):
    return (f"{{{{if(contains({R}; \"<<{nome}\"); "
            f"trim(replace(replace({R}; /^[\\s\\S]*<<{nome}:/; \"\"); />>[\\s\\S]*$/; \"\")); \"\")}}}}")

INI = "trim(first(split(42.reservar; \"|\")))"
MODO = "lower(trim(last(split(42.reservar; \"|\"))))"
INI_DATA = f"parseDate({INI}; \"YYYY-MM-DDTHH:mm\"; \"{FUSO}\")"
NOME_SEGURO = "replace(3.nome; /[\"\\\\]/g; \"\")"

def evento(online):
    """Corpo JSON do evento. Expressões {{...}} usam aspas simples do Python para conter aspas do Make."""
    modo = "online" if online else "presencial"
    fim = '{{formatDate(addHours(' + INI_DATA + '; 1); "YYYY-MM-DDTHH:mm:ss"; "' + FUSO + '")}}'
    conf = (', "conferenceData": {"createRequest": {"requestId": "elise-{{3.wa_id}}-{{formatDate(now; "X")}}", '
            '"conferenceSolutionKey": {"type": "hangoutsMeet"}}}') if online else ''
    return ('{"summary": "A CONFIRMAR - Consulta ' + modo + ' - {{' + NOME_SEGURO + '}}", "colorId": "5", '
            '"description": "Reserva feita pela Elise (WhatsApp). Cliente: {{' + NOME_SEGURO + '}} | WhatsApp: +{{3.wa_id}}. '
            'Confirme com o cliente e depois retire o A CONFIRMAR do título.", '
            '"start": {"dateTime": "{{' + INI + '}}:00", "timeZone": "' + FUSO + '"}, '
            '"end": {"dateTime": "' + fim + '", "timeZone": "' + FUSO + '"}' + conf + '}')

LIVRE = cond(f"{{{{length(72.body.calendars.{CALENDARIO}.busy)}}}}", "number:equal", "0")
rota_reserva = [
    {"id": 71, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "filter": {"name": "Cliente escolheu horário", "conditions": [[cond("{{42.reservar}}", "exist")]]},
     "mapper": {"scope": "roundtrip", "variables": [{"name": "reserva_txt", "value":
         f"NÃO RESERVADO: o horário escolhido ({{{{{INI}}}}}, {{{{{MODO}}}}}) estava ocupado ou inválido na reconferência. Oferecer outra opção ao cliente."}]}},
    cal_call(72, "/v3/freeBusy",
             "{\"timeMin\": \"" + ISO(INI_DATA) + "\", \"timeMax\": \"" + ISO(f"addHours({INI_DATA}; 1)")
             + f"\", \"timeZone\": \"{FUSO}\", \"items\": [{{\"id\": \"{CALENDARIO}\"}}]}}"),
    {"id": 73, "module": "builtin:BasicRouter", "version": 1, "mapper": None, "metadata": meta(), "routes": [
        {"flow": [
            cal_call(74, f"/v3/calendars/{CALENDARIO}/events?conferenceDataVersion=1", evento(True),
                     {"name": "Livre e on-line", "conditions": [[LIVRE, cond(f"{{{{{MODO}}}}}", "text:contain", "on")]]}),
            {"id": 75, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
             "mapper": {"scope": "roundtrip", "variables": [{"name": "reserva_txt", "value":
                 f"Reserva A CONFIRMAR criada: {{{{{INI}}}}} (on-line). Meet: {{{{74.body.hangoutLink}}}}"}]}},
        ]},
        {"flow": [
            cal_call(76, f"/v3/calendars/{CALENDARIO}/events", evento(False),
                     {"name": "Livre e presencial", "conditions": [[LIVRE, cond(f"{{{{{MODO}}}}}", "text:notcontain", "on")]]}),
            {"id": 77, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
             "mapper": {"scope": "roundtrip", "variables": [{"name": "reserva_txt", "value":
                 f"Reserva A CONFIRMAR criada: {{{{{INI}}}}} (presencial)."}]}},
        ]},
    ]},
]

TEM_RESERVA = "length(78.reserva_txt) > 0"
rota_gravar = [
    {"id": 78, "module": "util:GetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"variables": ["reserva_txt"]}},
    upsert(45, 46, 47, LINHA, {
        "0": "{{3.wa_id}}",
        "1": "{{3.nome}}",
        "2": hist_aparado("44.hist_full"),
        "4": f"{{{{if({TEM_RESERVA}; \"SIM\"; if(42.encaminhar = \"SIM\"; \"SIM\"; ifempty(4.`4`; \"NAO\")))}}}}",
        "5": f"{{{{if({TEM_RESERVA}; 78.reserva_txt; if(42.encaminhar = \"SIM\"; 42.motivo; 4.`5`))}}}}",
        "6": f"{{{{if({TEM_RESERVA}; {AGORA_ISO[2:-2]}; if(42.encaminhar = \"SIM\"; {AGORA_ISO[2:-2]}; 4.`6`))}}}}",
        "7": "NAO",
        "8": AGORA_ISO,
        "10": "{{ifempty(62.cpf_valido; 4.`10`)}}",
        "11": "{{if(contains(78.reserva_txt; \"criada\"); 78.reserva_txt; 4.`11`)}}",
    }),
]

rota_principal = [
    {"id": 62, "module": "util:GetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"variables": ["asaas_txt", "agenda_txt", "cpf_valido"]}},
    {"id": 38, "module": "google-drive:makeApiCall", "version": 4, "parameters": {},
     "mapper": {"url": f"/v3/files/{DOC_PROMPT_ID}/export", "method": "GET",
                "qs": [{"key": "mimeType", "value": "text/plain"}], "headers": []},
     "metadata": meta(), "onerror": IGNORAR(138)},
    {"id": 39, "module": "json:TransformToJSON", "version": 1,
     "parameters": {"space": ""}, "mapper": {"object": "{{38.body}}"}, "metadata": meta()},
    {"id": 40, "module": "json:TransformToJSON", "version": 1,
     "parameters": {"space": ""}, "mapper": {"object": CONVERSA}, "metadata": meta()},
    {"id": 41, "module": "anthropic-claude:makeAnApiCall", "version": 1, "parameters": {},
     "mapper": {"url": "/v1/messages", "method": "POST",
                "headers": [{"key": "anthropic-version", "value": "2023-06-01"},
                            {"key": "content-type", "value": "application/json"}],
                "body": corpo_api},
     "metadata": meta(), "onerror": IGNORAR(49)},
    {"id": 42, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [
         {"name": "resposta", "value":
             f"{{{{trim(replace(replace({R}; /<<ENCAMINHAR:[\\s\\S]*?>>/g; \"\"); /<<RESERVAR:[\\s\\S]*?>>/g; \"\"))}}}}"},
         {"name": "encaminhar", "value": f"{{{{if(contains({R}; \"<<ENCAMINHAR\"); \"SIM\"; \"NAO\")}}}}"},
         {"name": "motivo", "value": marcador("ENCAMINHAR")},
         {"name": "reservar", "value": marcador("RESERVAR")},
     ]}},
    {"id": 43, "module": "whatsapp-business-cloud:sendMessage", "version": 1, "parameters": {},
     "mapper": {"to": "{{3.wa_id}}", "type": "text", "text": {"body": "{{42.resposta}}", "preview_url": False}},
     "metadata": meta(),
     "filter": {"name": "Há resposta", "conditions": [[cond("{{42.resposta}}", "exist")]]}},
    {"id": 44, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [
         {"name": "hist_full", "value": "{{5.hist_cliente}}\nElise: {{42.resposta}}"}]}},
    {"id": 70, "module": "builtin:BasicRouter", "version": 1, "mapper": None, "metadata": meta(), "routes": [
        {"flow": rota_reserva},
        {"flow": rota_gravar},
    ]},
]

rota_elise = [
    {"id": 50, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "filter": {"name": "Dentro do horário e Elise ativa", "conditions": DENTRO},
     "mapper": {"scope": "roundtrip", "variables": [{"name": "cpf", "value": CPF_EXPR}]}},
    {"id": 51, "module": "builtin:BasicRouter", "version": 1, "mapper": None, "metadata": meta(), "routes": [
        {"flow": rota_asaas},
        {"flow": rota_agenda},
        {"flow": rota_principal},
    ]},
]


GEMINI_MODELO = "gemini-flash-lite-latest"  # transcrição de áudio (mais barato por minuto)
TIPO = "1.value.messages[1].type"
PROMPT_TRANSCRICAO = ("Transcreva este áudio em português do Brasil, palavra por palavra, sem resumir, "
                      "sem comentar e sem acrescentar nada. Marque trechos que não dá para entender como [inaudível]. "
                      "Responda apenas com a transcrição.")

def baixar_midia(mid, id_expr, filtro):
    return {"id": mid, "module": "whatsapp-business-cloud:getMedia", "version": 1, "parameters": {},
            "mapper": {"mediaId": id_expr}, "metadata": meta(), "filter": filtro,
            "onerror": IGNORAR(mid + 100)}

rota_audio = [
    baixar_midia(8, "{{1.value.messages[1].audio.id}}",
                 {"name": "Áudio", "conditions": [[cond("{{" + TIPO + "}}", "text:equal", "audio")]]}),
    {"id": 9, "module": "gemini-ai:makeApiCall", "version": 1, "parameters": {},
     "mapper": {"url": f"/v1beta/models/{GEMINI_MODELO}:generateContent", "method": "POST",
                "headers": [{"key": "Content-Type", "value": "application/json"}],
                "body": ('{"contents": [{"parts": [{"inline_data": {"mime_type": "{{trim(first(split(8.mime_type; ";")))}}", '
                         '"data": "{{toString(8.mediaData; "base64")}}"}}, {"text": ' + json.dumps(PROMPT_TRANSCRICAO, ensure_ascii=False)
                         + '}]}], "generationConfig": {"temperature": 0}}')},
     "metadata": meta(), "onerror": IGNORAR(109),
     "filter": {"name": "Até 15 MB", "conditions": [[cond("{{8.file_size}}", "number:less", "15000000")]]}},
    {"id": 10, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [{"name": "midia_texto", "value":
         "[áudio transcrito] {{trim(9.body.candidates[1].content.parts[1].text)}}"}]},
     "filter": {"name": "Transcrição obtida", "conditions": [[cond("{{9.body.candidates[1].content.parts[1].text}}", "exist")]]}},
]

E_PDF = cond("{{1.value.messages[1].document.mime_type}}", "text:equal:ci", "application/pdf")
rota_anexo = [
    baixar_midia(11, "{{ifempty(1.value.messages[1].image.id; 1.value.messages[1].document.id)}}",
                 {"name": "Imagem ou PDF", "conditions": [
                     [cond("{{" + TIPO + "}}", "text:equal", "image")],
                     [cond("{{" + TIPO + "}}", "text:equal", "document"), E_PDF]]}),
    {"id": 12, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "filter": {"name": "Até 4,5 MB", "conditions": [[cond("{{11.file_size}}", "number:less", "4500000")]]},
     "mapper": {"scope": "roundtrip", "variables": [
         {"name": "midia_bloco", "value":
             '{"type": "{{if(' + TIPO + ' = "image"; "image"; "document")}}", "source": {"type": "base64", '
             '"media_type": "{{trim(first(split(11.mime_type; ";")))}}", "data": "{{toString(11.mediaData; "base64")}}"}},'},
         {"name": "midia_texto", "value":
             '{{if(' + TIPO + ' = "image"; "[imagem enviada, anexada a esta mensagem]"; "[PDF enviado, anexado a esta mensagem]")}} '
             '{{1.value.messages[1].document.filename}} '
             '{{ifempty(1.value.messages[1].image.caption; 1.value.messages[1].document.caption)}}'},
     ]}},
]

rota_seguir = [
    {"id": 13, "module": "util:GetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"variables": ["midia_texto", "midia_bloco"]}},
    {"id": 14, "module": "util:SetVariables", "version": 1, "parameters": {}, "metadata": meta(),
     "mapper": {"scope": "roundtrip", "variables": [{"name": "texto", "value": "{{ifempty(13.midia_texto; 3.texto)}}"}]}},
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

rota_cliente = [
    variaveis_entrada,
    {"id": 7, "module": "builtin:BasicRouter", "version": 1, "mapper": None, "metadata": meta(), "routes": [
        {"flow": rota_audio},
        {"flow": rota_anexo},
        {"flow": rota_seguir},
    ]},
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
