# Playbook do funil de captação — Pensão Alimentícia

Funil: anúncio → landing page → quiz de qualificação → WhatsApp com resumo pronto → atendimento → contrato assinado on-line → cobrança → onboarding.

## 1. Como o funil funciona

| Etapa | O que acontece | Onde |
|---|---|---|
| 1. Clique no anúncio | UTMs e `fbclid` são gravados na sessão | `src/funnel/tracking.ts` |
| 2. Qualquer CTA da página | Abre o quiz (nenhum botão leva direto ao WhatsApp) | `src/funnel/QuizFunnel.tsx` |
| 3. Quiz (6 a 8 perguntas) | Perguntas mudam conforme o tipo de caso | `src/funnel/questions.ts` |
| 4. Filtro | Quem já tem advogado e quer continuar, ou não pode pagar honorários, recebe orientação e **não** gera lead | `src/funnel/qualify.ts` |
| 5. Formulário | Nome, WhatsApp, cidade/UF e consentimento LGPD | `QuizFunnel.tsx` |
| 6. Envio | Webhook (Make/CRM) recebe tudo, inclusive prioridade e alertas internos; Pixel registra `Lead` | `tracking.ts` |
| 7. WhatsApp | Em 4 s a cliente cai no WhatsApp do escritório com o resumo do caso já escrito | `qualify.ts` |

A cliente vê apenas o resumo das próprias respostas e o protocolo. Pontuação, prioridade e alertas jurídicos vão só para o webhook.

## 2. Leitura do protocolo

Formato: `PA-<CASO><PRIORIDADE>-<CÓDIGO>` — exemplo `PA-EXA-K7Q2`.

| Código | Caso | Medida principal |
|---|---|---|
| FX | Fixação | Ação de alimentos com pedido de provisórios (Lei 5.478/68, art. 4º) |
| EX | Execução | Cumprimento de sentença ou execução de alimentos (CPC, arts. 528 e 911) |
| RV | Revisão | Revisional (CC, art. 1.699) |
| GR | Gestante | Alimentos gravídicos (Lei 11.804/2008) |
| PG | Quem paga | Defesa, revisional ou exoneração (Súmula 358/STJ para filho maior) |

| Prioridade | Pontuação | Prazo recomendado de primeira resposta |
|---|---|---|
| A — quente | 80 ou mais | Imediato, no horário comercial |
| B — morno | 50 a 79 | Mesmo dia |
| C — frio | abaixo de 50 | Até o dia útil seguinte |

Os pesos e os limites estão em `WEIGHTS` e `TIER_THRESHOLDS` (`src/funnel/qualify.ts`). Revise-os após as primeiras semanas, comparando a prioridade com a taxa real de fechamento.

## 3. Roteiro de atendimento no WhatsApp

Regra geral: uma pergunta por mensagem, sem promessa de resultado, sem prazo garantido.

### 3.1 Abertura (até 5 min após a mensagem)

> Olá, {nome}! Aqui é {atendente}, da equipe do escritório. Recebi a análise do seu caso (protocolo {protocolo}) e já li suas respostas.
>
> Para eu entender melhor e indicar o caminho certo, vou fazer algumas perguntas rápidas. Pode ser agora?

### 3.2 Confirmação e aprofundamento por caso

**FX — Fixação**
1. Qual o nome completo do pai? Você tem o CPF dele?
2. Quantos filhos são e quais as idades?
3. Quanto você gasta por mês com a criança (escola, saúde, alimentação, moradia)?
4. Ele ajuda com alguma coisa hoje, mesmo que informalmente?
5. Você sabe quanto ele ganha ou como ele vive (carro, viagens, redes sociais)?

**EX — Execução**
1. Você tem o número do processo ou uma cópia da decisão ou do acordo?
2. Qual o valor mensal definido e qual foi o último mês pago integralmente?
3. Ele paga parte do valor? Quanto, e desde quando?
4. Onde ele trabalha hoje?

Ponto técnico para a equipe: a prisão civil abrange as 3 prestações anteriores ao ajuizamento e as que vencerem no curso do processo (CPC, art. 528, § 7º; Súmula 309/STJ). O restante segue pelo rito da penhora. Com vínculo CLT, servidor ou benefício, avaliar desconto em folha (CPC, art. 529).

**RV — Revisão**
1. Qual o valor atual e quando foi definido?
2. O que mudou desde então: despesas da criança, renda dele, ou os dois?
3. Você consegue comprovar os gastos atuais?

**GR — Gestante**
1. Qual a data provável do parto?
2. Ele sabe da gravidez? Como reagiu?
3. Que provas você tem do relacionamento (conversas, fotos, testemunhas)?
4. Quais despesas a gestação já gerou (consultas, exames, medicamentos, enxoval)?

Ponto técnico: o juiz fixa os alimentos gravídicos com base em indícios de paternidade, e eles se convertem em pensão após o nascimento (Lei 11.804/2008, art. 6º). Ajuizar antes do parto evita perda de tempo.

**PG — Quem paga**
1. Existe processo em curso contra você? Recebeu intimação ou mandado? Em que data?
2. Qual o valor atual e qual a sua renda hoje?
3. O que mudou (desemprego, novo filho, maioridade)?

Ponto técnico: intimado no cumprimento pelo rito da prisão, o devedor tem 3 dias para pagar, provar que pagou ou justificar a impossibilidade (CPC, art. 528). Alerta `URGENTE` no webhook = atender primeiro.

### 3.3 Diagnóstico e proposta

> {nome}, pelo que você me contou, o caminho indicado é {medida}. Funciona assim: {2 frases sobre o procedimento}.
>
> Para dar entrada precisamos de alguns documentos, que você pode mandar por foto aqui mesmo. Os honorários são {valor e forma de pagamento conforme a tabela do escritório}.
>
> Se fizer sentido para você, já te envio o contrato para assinatura pelo celular. Leva 2 minutos.

Se a renda da cliente for baixa, informar que ela pode pedir gratuidade das custas mesmo com advogado particular (CPC, art. 99, §§ 3º e 4º).

### 3.4 Documentos por caso

| Documento | FX | EX | RV | GR | PG |
|---|---|---|---|---|---|
| RG/CNH e CPF da cliente | ✓ | ✓ | ✓ | ✓ | ✓ |
| Comprovante de residência | ✓ | ✓ | ✓ | ✓ | ✓ |
| Certidão de nascimento do(s) filho(s) | ✓ | ✓ | ✓ | | ✓ |
| Comprovantes de despesas da criança | ✓ | | ✓ | | |
| Dados do outro genitor (nome, CPF, endereço, trabalho) | ✓ | ✓ | ✓ | ✓ | |
| Prints de redes sociais ou bens do outro genitor | ✓ | ✓ | ✓ | ✓ | |
| Sentença, acordo homologado ou número do processo | | ✓ | ✓ | | ✓ |
| Relação dos meses e valores não pagos | | ✓ | | | |
| Exame ou laudo de gravidez e despesas da gestação | | | | ✓ | |
| Provas do relacionamento | | | | ✓ | |
| Comprovantes de renda e dos pagamentos já feitos | | | | | ✓ |
| Intimação ou mandado recebido | | | | | ✓ |

### 3.5 Fechamento on-line

1. Gerar na plataforma de assinatura (ZapSign, Clicksign, D4Sign ou Docusign) o kit: contrato de honorários, procuração *ad judicia* e, quando houver pedido de gratuidade, declaração de hipossuficiência.
2. Enviar o link pelo WhatsApp com selfie e documento como fator de autenticação. A assinatura eletrônica aceita pelas partes é válida (MP 2.200-2/2001, art. 10, § 2º).
3. Após a assinatura, gerar a cobrança pelo cenário do Make de contratação e cobrança no Asaas e enviar o link de pagamento.
4. Confirmar recebimento, enviar a lista de documentos pendentes e informar o próximo contato.

> Pronto, {nome}! Contrato assinado e seu caso já está com a equipe. Agora preciso só de {documentos pendentes}. Assim que chegarem, preparamos a ação e te aviso por aqui.

### 3.6 Objeções frequentes

| Objeção | Resposta |
|---|---|
| "Vou pensar" | Entendo. Posso te perguntar o que ainda gera dúvida? Se for o valor, temos parcelamento. |
| "A Defensoria faz de graça" | Faz, e é um ótimo serviço. A diferença está no atendimento individual e no acompanhamento direto. A escolha é sua. |
| "Quanto tempo demora?" | Depende da vara e do caso. Pedimos alimentos provisórios logo no início, mas não há como garantir prazo. |
| "E se ele não tiver dinheiro?" | A pensão considera a necessidade da criança e a possibilidade de quem paga (CC, art. 1.694, § 1º). Mesmo desempregado ele continua obrigado. |
| "Já tenho advogado" | Se quiser mudar, o advogado atual precisa ser comunicado antes (Código de Ética da OAB, art. 14). Posso te explicar como fazer. |

### 3.7 Cadência de follow-up

| Quando | Situação | Ação |
|---|---|---|
| 2 h | Não respondeu à abertura | Mensagem curta retomando o protocolo |
| 24 h | Sem resposta | Uma pergunta objetiva sobre o caso |
| 24 h | Recebeu o contrato e não assinou | Perguntar se ficou alguma dúvida no contrato |
| 72 h | Sem resposta | Última mensagem, deixando o canal aberto |

Depois disso, encerrar o contato. Insistência além disso aumenta o risco ético e de bloqueio do número.

## 4. Configuração técnica

Variáveis em `.env.local` (modelo em `.env.example`):

| Variável | Uso |
|---|---|
| `VITE_WHATSAPP_NUMBER` | Número do escritório com 55 + DDD |
| `VITE_LEAD_WEBHOOK_URL` | Webhook do Make (ou outro CRM) que recebe o lead |
| `VITE_META_PIXEL_ID` | Pixel da Meta; se vazio, nenhum script é carregado |

Eventos do Pixel:

| Evento | Quando |
|---|---|
| `PageView` | Carregamento da página |
| `QuizIniciado` (custom) | Abertura do quiz, com a origem do clique |
| `LeadDesqualificado` (custom) | Filtro barrou o lead |
| `Lead` | Lead qualificado enviou o formulário |
| `Contact` | Clique ou redirecionamento para o WhatsApp |

Otimize as campanhas para `Lead`: como desqualificados não disparam esse evento, o algoritmo aprende com o público certo.

Campos enviados ao webhook (formulário `application/x-www-form-urlencoded`): `protocolo`, `criado_em`, `nome`, `whatsapp`, `cidade`, `uf`, `caso`, `caso_descricao`, `prioridade`, `pontuacao`, `alertas`, `respostas`, cada resposta individual (`situacao`, `titulo`, `atraso`, `gestacao`, `indicios`, `pagadorMotivo`, `idade`, `renda`, `localizacao`, `advogado`, `honorarios`), `origem_cta`, `consentimento_lgpd`, UTMs, `fbclid`, `gclid` e `landing_url`.

Cenário sugerido no Make: Webhook → planilha/CRM → mensagem para o grupo da equipe com prioridade e alertas → (prioridade A) notificação imediata ao responsável.

## 5. Conformidade

- **Publicidade e captação (OAB):** o Código de Ética veda angariar ou captar clientela (art. 7º) e o Provimento 205/2021 restringe a publicidade a caráter informativo, sem promessa de resultado. O quiz e as mensagens foram escritos sem promessa de resultado ou prazo. Itens da página atual que devem passar por revisão antes de rodar anúncios: depoimentos com resultados ("o valor dobrou", "em menos de 15 dias"), "+10.000 atuações de sucesso", "Decisão judicial em poucos dias", selo "Online agora" e o número de OAB do rodapé.
- **LGPD:** o consentimento é coletado no formulário, e leads desqualificados não têm dados pessoais coletados (minimização, art. 6º, III). Falta uma política de privacidade publicada e linkada no formulário (art. 9º).
- **Sigilo:** respostas sobre o caso circulam no webhook e no WhatsApp; restrinja o acesso ao cenário do Make e à planilha à equipe do atendimento.
