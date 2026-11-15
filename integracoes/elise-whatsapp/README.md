# Elise no WhatsApp: atendimento em tempo real (Make + API oficial da Meta + Claude)

Quando uma mensagem chega, a Elise responde na hora pela API oficial do WhatsApp (Cloud API), no **modo coexistência**: o número continua funcionando no aplicativo WhatsApp Business do celular.

## Peças

| Peça | Onde está | Função |
|---|---|---|
| Cenário **LA Elise - Atendente WhatsApp** (id 7048216) | Make, equipe "My Team" | Recebe a mensagem, decide se a Elise responde, chama o Claude, envia a resposta e grava a memória |
| Planilha **LA Elise - Memória WhatsApp** | Google Drive (id `16As1XW0a_dos0IhBuy_tnHZJr8F_x9L-EtThbtbSAFo`) | Histórico por cliente, pausa, fila de encaminhamentos para a Dra. Luana |
| Doc **LA Elise - Prompt do atendente (WhatsApp)** | Google Drive (id `18has88qkJLGegEvRPn0C1F4s-GJs2kUc3AOC2K7dbsI`) | Regras da Elise. Editar o Doc muda o comportamento sem mexer no Make |
| `prompt-sistema-elise.md` | este diretório | Cópia versionada do prompt: o cabeçalho `cabecalho-api.md` mais a skill *elise-whatsapp-assistente* |
| `gerar_blueprint.py` / `blueprint.json` | este diretório | Gera o cenário, para revisão e para recriá-lo se preciso |

## Regras do fluxo

1. **O escritório respondeu pelo app** (evento `smb_message_echoes`): a Elise fica **pausada por 12 horas** naquela conversa. Para religar antes, apague a célula `pausado_ate` na planilha.
2. **Mensagem fora das 7h às 19h** (horário de MS): nada é enviado. A conversa fica marcada com `fora_horario = SIM` para a rodada interna responder.
3. **Dentro do horário e sem pausa:** o cenário lê o prompt do Doc e o histórico da planilha, chama o Claude (modelo `claude-sonnet-5-5`, prompt em cache por 1 hora), envia a resposta e grava a conversa.
4. **Encaminhamento:** se a resposta trouxer a linha `<<ENCAMINHAR: ...>>`, ela é retirada antes do envio, e a conversa fica com `encaminhar = SIM` e o motivo na planilha. Para ver a fila, filtre a coluna E. Depois de tratar, troque para `NAO`.
5. **Falha do Claude:** o cenário não envia nada e a mensagem fica para a rodada interna.
6. **Asaas:** quando o cliente informa o CPF (ou ele já está na coluna K), o cenário consulta no Asaas o cadastro e as cobranças vencidas e a vencer, usando a conexão Asaas que já existe no Make. A Elise informa vencimento, valor e link exatamente como estão no Asaas. Ela não calcula juros, não dá desconto e não confirma pagamento nem baixa. O CPF só é gravado na planilha se o Asaas encontrar o cadastro.
7. **Agenda:** só funciona quando a Dra. Luana marca **SIM** na coluna J (`caso_aceito`). Nesse caso o cenário lê os horários ocupados da agenda principal do Google nos próximos 14 dias, e a Elise oferece duas opções de segunda a sexta, entre 13h e 18h, com consulta de 1 hora (Parte IV). Quando o cliente escolhe, o cenário confere de novo se o horário continua livre e cria no Google Agenda um evento amarelo **"A CONFIRMAR - Consulta ..."**, com link do Meet se a consulta for on-line. A conversa entra na fila (encaminhar = SIM), com a reserva descrita. A Elise diz ao cliente que vai confirmar; ela nunca confirma sozinha.
8. **Confirmar uma reserva:** no Google Agenda, retire o "A CONFIRMAR" do título e mande a confirmação ao cliente pelo app, com o link do Meet se for on-line. Responder pelo app pausa a Elise por 12 horas naquela conversa. Para recusar, apague o evento e responda ao cliente.

## Limites desta versão

- A Elise consulta somente o Asaas (pelo CPF) e a agenda (com caso aceito). Ela não acessa pastas, contratos nem Gmail. Essas tarefas continuam com as rodadas internas.
- O CPF é reconhecido na mensagem por padrão de 11 dígitos. Um telefone com 11 dígitos pode ser lido como CPF, mas nesse caso o Asaas não encontra o cadastro e nada é gravado.
- Áudio, imagem e documento chegam como `[mídia: tipo]`. A Elise confirma o recebimento e não analisa o conteúdo.
- O histórico guarda até 6.000 caracteres por cliente.

## Ativação (passos que só o titular da conta pode fazer)

1. **WhatsApp:** no cenário, abra o módulo 1 (*Watch Events*) → *Create a webhook* → *Create a connection* → tipo **WhatsApp Business Cloud** → *Signup Mode* = **Coexistence**. Escaneie o QR com o app WhatsApp Business do número do escritório, que precisa estar na versão 2.24.17 ou superior. Desative antes a verificação em duas etapas do número. Marque os eventos **messages** e **smb_message_echoes**. Se a Meta disser que o número não é elegível para coexistência, pare e me avise.
2. **Meta Billing Hub:** cadastre um meio de pagamento. Desde 1º/10/2026, as respostas além de 1.000 por mês não são entregues sem cartão, e o Make mostra "sucesso" mesmo assim.
3. **Anthropic:** crie uma chave de API em console.anthropic.com e conecte-a no módulo 41.
4. **Google:** conecte a conta Google nos módulos de planilha (4, 20, 21, 30, 32, 33, 46, 47), no módulo 38 (Drive) e nos módulos de agenda (60, 72, 74, 76). Use a conta Google **cuja agenda principal é a da Dra. Luana**, porque o cenário usa a agenda "primary". O Asaas (52, 53, 57) já usa a conexão existente. Nos módulos de planilha, confira se aparecem a planilha "LA Elise - Memória WhatsApp" e a aba "Conversas". Nas buscas (4 e 20), o filtro deve ser **coluna A = número**.
5. **Envio:** no módulo 43, escolha o *Sender ID* (o número do escritório).
6. **Teste antes de ligar:** clique em *Run once* e mande uma mensagem de outro celular. Confira o caminho no histórico de execuções do Make. Se o módulo 3 vier vazio, os campos do evento têm outro nome: abra o pacote do módulo 1 e me envie a estrutura.
7. **Ativar:** ligue o cenário (*Scheduling* → *Immediately*). Depois dos testes, ative **Data is confidential** nas configurações do cenário, para que o conteúdo das conversas não fique no log do Make (LGPD).

## Pontos de atenção (LGPD e OAB)

- As conversas passam por Meta, Make, Google e Anthropic. Atualize a política de privacidade e o registro de operações de tratamento.
- O prompt manda a Elise se identificar como IA quando perguntada (item 1 da skill) e proíbe orientação jurídica, promessa de resultado e informação de valores.
- A planilha contém dados pessoais e sigilosos. Mantenha-a sem compartilhamento por link.
