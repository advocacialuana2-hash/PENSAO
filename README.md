# Protocolo Automático — L.A. Advogados Associados

Sistema que pega a peça pronta em PDF, identifica o processo e o tribunal, mostra para aprovação e, com o seu clique, faz o protocolo no sistema judicial. Ao final, guarda o comprovante.

**Nada é protocolado sem aprovação.** A aprovação é feita no painel **L.A. Office** (aba *Prontos p/ protocolo*, botão 🤖, ou aba *INSS*) ou no painel local deste sistema. O andamento e o comprovante aparecem na aba **Protocoladas** do L.A. Office.

## Ligação com o painel L.A. Office

```
L.A. Office (nuvem)                      Mac da Dra. Luana
─────────────────────                    ──────────────────────────────────────
Prontos p/ protocolo ─ 🤖 Aprovar ──┐
Aba INSS ─ Aprovar / Consultar ─────┤
                                    ▼
                        protocolos_auto · inss_pedidos
                                    │   ponte (Claude no Mac, a cada 10 min
                                    │   ou quando ela pedir) ─ ponte/SKILL.md
                                    ▼
                             API local (127.0.0.1:8765/api, com token)
                                    ▼
                         robô no Chrome + token A3 ─► tribunal / Meu INSS
                                    │
Protocoladas ◄─ número, comprovante, pendências ◄───┘
INSS ◄─ exigências e andamentos lidos no Meu INSS
```

- A **ponte** é o Claude rodando no Mac (Claude Desktop ou Claude Code). As instruções dela estão em `ponte/SKILL.md`. Ela só leva ao robô o que estiver *aprovado* e só marca *protocolado* quando o robô devolve o número.
- A **API local** só aceita conexões do próprio Mac e exige o token gravado em `dados/api_token.txt`, criado na primeira execução.
- Se `meta/ponte.trigger_id` estiver preenchido no painel com o id de uma tarefa agendada que acorda a ponte, a aprovação aciona a ponte na hora. Sem isso, ela age na próxima verificação.

---

## Como funciona

```
Peça em PDF (pasta do computador, pasta sincronizada da nuvem ou envio manual)
        │
        ▼
Análise automática ── lê o número CNJ, valida o dígito verificador, identifica
        │             o tribunal, sugere o tipo de petição, bloqueia PDF
        │             corrompido, protegido ou grande demais e acusa duplicidade
        ▼
Painel de aprovação (http://localhost:8765) ── você revisa e clica em
        │                                       "Aprovar e protocolar"
        ▼
Robô no navegador ── executa o roteiro do tribunal: entra, localiza o processo,
        │            escolhe o tipo, anexa o PDF e assina com o token A3
        ▼
Comprovante ── captura o número do protocolo, salva a tela final (PNG + HTML)
               e registra tudo no histórico do envio
```

### Por que roda no computador do escritório

O certificado **A3** fica no token ou no cartão e não pode ser copiado. A assinatura só acontece no computador onde o token está conectado. Por isso:

- o **robô e o painel rodam no computador do escritório**, com o token conectado e o PJeOffice / Web PKI instalados;
- as **peças guardadas na nuvem** entram pela pasta sincronizada (Google Drive para computador, OneDrive ou Dropbox), configurada em `config.yaml`;
- o painel só aceita conexões do próprio computador (`127.0.0.1`), porque controla protocolos feitos com o seu certificado.

Dependendo do sistema e da configuração do assinador, o PIN do token pode ser pedido a cada assinatura ou uma vez por sessão. Quando o sistema pede uma ação sua (PIN, captcha, confirmação), o painel mostra um aviso amarelo e o robô espera.

---

## Instalação no Mac

1. Instale o **Python 3.11 ou superior** em <https://www.python.org/downloads/macos/>.
2. Confirme que o **Google Chrome**, o **PJeOffice** e o **Web PKI** (ou os assinadores que você já usa) funcionam com o token.
3. Copie esta pasta para a sua pasta pessoal (`~/protocolo-automatico`).
4. Dê dois cliques em **`instalar.command`**. Na primeira vez, o macOS pode bloquear: clique com o botão direito, escolha **Abrir** e confirme.
5. Ajuste `config.yaml` (pastas de entrada).
6. Dê dois cliques em **`iniciar.command`**. O painel local abre em http://localhost:8765. Deixe essa janela aberta enquanto quiser que o robô trabalhe.
7. Para gravar um roteiro novo, use **`gravar.command`**.

## Instalação (Windows)

1. Instale o **Python 3.11 ou superior** em <https://www.python.org/downloads/>, marcando **"Add python.exe to PATH"**.
2. Confirme que o **Google Chrome**, o **PJeOffice** e o **Web PKI** (ou os assinadores que você já usa) estão instalados e funcionando com o token.
3. Copie esta pasta para o computador (por exemplo, `C:\ProtocoloAutomatico`).
4. Dê dois cliques em **`instalar.bat`**.
5. Abra o `config.yaml` no Bloco de Notas e ajuste `pastas_entrada` para as pastas onde você salva as peças.
6. Dê dois cliques em **`iniciar.bat`**. O painel abre no navegador.

Na primeira execução, o robô abre um Chrome com **perfil próprio**. Instale nele as extensões de assinatura que os tribunais pedem. Elas ficam salvas para as próximas vezes.

---

## Uso diário

1. Salve a peça pronta em PDF na pasta monitorada, ou use **Enviar peça** no painel.
2. Em até 10 segundos, ela aparece na **Fila**, com status *Aguardando aprovação*.
3. Abra o envio e confira:
   - a peça (visualização ao lado);
   - o número do processo e o tribunal identificado;
   - o roteiro (sistema e tribunal);
   - o tipo de petição, escrito exatamente como aparece no sistema do tribunal.
4. Clique em **Aprovar e protocolar**.
5. Se aparecer o aviso amarelo, faça a ação pedida (por exemplo, digitar o PIN) e clique em **Já fiz, continuar**.
6. Ao final, o status muda para **Protocolado**, com o número do protocolo e o comprovante.

### O que cada status significa

| Status | Significado | O que fazer |
|---|---|---|
| Aguardando aprovação | Peça analisada, esperando você | Revisar e aprovar |
| Na fila / Executando | O robô está trabalhando | Acompanhar |
| Aguardando você | O sistema pede PIN, captcha ou confirmação | Agir no navegador do robô e clicar em continuar |
| Protocolado | Enviado, com número de protocolo capturado | Nada |
| Ensaio concluído | O roteiro funcionou até antes do envio | Aprovar de verdade |
| **Conferir no tribunal** | O envio final foi clicado, mas algo falhou depois | **Verificar no sistema do tribunal antes de reenviar** e registrar o resultado |
| Erro | Falhou **antes** do envio. Nada foi protocolado | Ler a mensagem, corrigir e tentar de novo |

### Travas de segurança

- **Aprovação obrigatória** em cada envio.
- **Integridade do arquivo:** o sistema guarda o SHA-256 da peça analisada e confere de novo antes de protocolar. Se o arquivo mudou, cancela.
- **Duplicidade:** o mesmo arquivo enviado duas vezes exige confirmação expressa.
- **Número CNJ validado** pelo dígito verificador (Resolução CNJ nº 65/2008). Número digitado errado é recusado.
- **Falha depois do envio** nunca vira "erro" silencioso. Vai para *Conferir no tribunal*, para evitar protocolo em dobro.
- **Ensaio:** executa o roteiro inteiro e para imediatamente antes do clique que protocola. Use sempre que criar ou alterar um roteiro.
- **Histórico** de cada envio: quem aprovou, quando, cada passo e cada falha.

---

## Roteiros: como o robô aprende cada tribunal

Cada tribunal tem telas próprias, mesmo quando usa o mesmo sistema (PJe, e-SAJ, eproc, Projudi). O robô segue um **roteiro** por tribunal, gravado a partir de um protocolo real.

### Gravar um roteiro novo

1. Dê dois cliques em **`gravar.bat`**.
2. Informe o endereço da página de login do sistema e um nome curto (por exemplo, `tjsp-esaj`).
3. No navegador que abrir, faça **um protocolo completo e real**, como faria normalmente.
4. Feche o navegador. A gravação fica em `dados\gravacoes\<nome>.py`.
5. Envie esse arquivo para conversão em roteiro. Ele vira `roteiros\<nome>.json`.
6. No painel, faça um **Ensaio** com uma peça qualquer e confira o resultado antes do primeiro protocolo real.

Ordem sugerida: comece pelo tribunal onde você mais protocola e grave os demais à medida que surgirem peças para eles.

### Formato do roteiro

Arquivo JSON em `roteiros/`. Exemplo de estrutura, com seletores ilustrativos:

```json
{
  "nome": "Nome do tribunal e sistema",
  "url_inicial": "endereço da página de entrada do sistema",
  "tempo_limite": 30,
  "passos": [
    {"acao": "abrir", "url": "{url_inicial}"},
    {"acao": "aguardar_usuario", "mensagem": "Entre com o certificado e digite o PIN",
     "ate_aparecer": "#menu-principal", "minutos": 5, "se_visivel": "#botao-certificado"},
    {"acao": "preencher", "seletor": "#numeroProcesso", "valor": "{cnj}"},
    {"acao": "clicar", "seletor": "text=Pesquisar"},
    {"acao": "selecionar", "seletor": "#tipoPeticao", "valor": "{tipo}"},
    {"acao": "anexar", "seletor": "input[type=file]", "valor": "{arquivo}"},
    {"acao": "clicar", "seletor": "#assinarEnviar", "envio_final": true},
    {"acao": "aguardar_texto", "texto": "protocolad"},
    {"acao": "capturar_protocolo", "regex": "Protocolo[:\\s]+([\\d./-]+)"}
  ]
}
```

| Ação | Campos | Uso |
|---|---|---|
| `abrir` | `url` | Abre um endereço |
| `clicar` | `seletor` | Clica em um elemento |
| `preencher` | `seletor`, `valor` | Digita em um campo |
| `selecionar` | `seletor`, `valor` | Escolhe uma opção (pelo texto ou pelo valor) |
| `anexar` | `seletor`, `valor` | Anexa o PDF (`{arquivo}`) |
| `pressionar` | `seletor`, `tecla` | Tecla, por exemplo `Enter` |
| `aguardar` | `seletor` | Espera um elemento aparecer |
| `aguardar_texto` | `texto` | Espera um texto aparecer |
| `aguardar_usuario` | `mensagem` (+ `ate_aparecer`, `minutos`) | Pausa para você agir (PIN, captcha) |
| `esperar` | `segundos` | Pausa fixa |
| `conferir_texto` | `texto` | Falha se o texto não estiver na tela |
| `capturar_protocolo` | `regex` (+ `seletor`) | Lê o número do protocolo |

Opções de qualquer passo:
- `envio_final: true`: o clique que efetivamente protocola. Obrigatório em **exatamente um** passo.
- `se_visivel`: só executa o passo se o elemento estiver na tela (útil para login que às vezes já está feito).
- `opcional: true`: falha nesse passo não interrompe o roteiro.
- `descricao`: texto que aparece no histórico.

Variáveis disponíveis: `{identificador}` (requerimento do INSS), `{cnj}` (formatado), `{cnj_digitos}` (20 dígitos), `{cnj_sequencial}`, `{cnj_ano}`, `{cnj_origem}`, `{arquivo}`, `{tipo}`, `{observacao}`, `{url_inicial}`, além das definidas em `"variaveis"` no próprio roteiro.

---

## INSS

- **Consulta:** o roteiro `inss-consulta` (tipo `"consulta"`) entra no Meu INSS e lê a lista de pedidos com exigência usando o passo `extrair` com `"modo": "tabela"`. A ponte grava cada linha em *Exigências e notificações* na aba INSS do painel e cria a tarefa de prazo quando houver data.
- **Protocolo:** o roteiro `inss-exigencia` anexa o PDF ao requerimento (`{identificador}`) e envia. A aprovação vem da aba INSS do painel.
- O login é o **gov.br da Dra. Luana**, no perfil do navegador do robô. Quando o gov.br pedir confirmação no celular ou captcha, o robô espera (passo `aguardar_usuario`) e o painel mostra o aviso.
- Os dois roteiros são gravados a partir do uso real (`gravar.command`). As telas do INSS não foram escritas de memória.

Roteiro de consulta (estrutura):

```json
{
  "nome": "Meu INSS — pedidos com exigência",
  "tipo": "consulta",
  "url_inicial": "endereço de entrada que você usa",
  "passos": [
    {"acao": "abrir", "url": "{url_inicial}"},
    {"acao": "aguardar_usuario", "mensagem": "Entre com o gov.br", "ate_aparecer": "seletor da lista", "minutos": 5},
    {"acao": "extrair", "seletor": "seletor da tabela", "campo": "exigencias", "modo": "tabela"}
  ]
}
```

`extrair` aceita `"modo"`: `texto` (um trecho), `lista` (vários elementos) ou `tabela` (linhas e colunas). Roteiro de consulta nunca tem `envio_final`.

## Limites desta versão

- **Petições intermediárias.** Petição inicial (cadastro de partes, classe, assuntos e custas) não está coberta.
- **Um PDF por envio.** Anexos múltiplos (documentos separados da peça) entram em versão futura.
- O **PIN do token A3** pode exigir digitação manual, conforme o assinador.
- **Captchas** dependem de você.
- Quando um tribunal muda a tela, o roteiro daquele tribunal precisa ser regravado. Os demais continuam funcionando.
- Alguns tribunais restringem acesso automatizado nos termos de uso. Confira os termos dos sistemas que você usa.

## Próximas etapas

1. Gravar e validar o roteiro do tribunal de maior volume.
2. Anexos múltiplos por envio.
3. Leitura de intimações (Domicílio Judicial Eletrônico / DJEN) ligada à fila de prazos.
4. Integração oficial via MNI nos tribunais que liberarem acesso, sem depender de tela.
5. Aviso de protocolo concluído por WhatsApp ou e-mail.

---

## Desenvolvimento

```bash
pip install -r requirements-dev.txt
python -m playwright install chromium
pytest
```

Os testes usam um **sistema de peticionamento simulado** (`tests/fixtures/tribunal_simulado.html`). Nenhum teste acessa tribunal real.
