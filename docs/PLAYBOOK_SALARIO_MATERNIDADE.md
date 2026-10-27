# Playbook do funil — Salário-maternidade

Funil: anúncio → página → teste de qualificação → WhatsApp com resumo pronto → atendimento → contrato assinado on-line → requerimento no INSS.

## 1. Como o funil funciona

| Etapa | O que acontece | Onde |
|---|---|---|
| 1. Clique no anúncio | UTMs e `fbclid` são gravados na sessão | `src/funnel/tracking.ts` |
| 2. Página | Estrutura da referência G7: foto em círculo, selo "Mesmo sem carteira assinada", valor mínimo em destaque, botão verde | `src/App.tsx` |
| 3. Teste (sempre 4 perguntas) | Momento, tipo de trabalho, uma pergunta do perfil e pedido no INSS | `src/funnel/questions.ts` |
| 4. Filtro | Casos inviáveis recebem explicação e opção de mudar a resposta, sem deixar dados | `src/funnel/qualify.ts` |
| 5. Formulário | Nome, WhatsApp, cidade/UF e consentimento LGPD | `src/funnel/QuizFunnel.tsx` |
| 6. Envio | Webhook recebe respostas, prioridade, alertas e UTMs; Pixel registra `Lead` | `tracking.ts` |
| 7. WhatsApp | Em 4 s (ou ao tocar no botão) a cliente abre o WhatsApp com o resumo escrito | `qualify.ts` |

### Quem é barrado no teste

| Resposta | Motivo |
|---|---|
| Filho com mais de 5 anos | Prescrição quinquenal das parcelas (Lei 8.213/91, art. 103, parágrafo único) |
| Nunca trabalhou registrada, nunca contribuiu e não é rural | Sem qualidade de segurada |
| Ainda empregada de carteira | Pagamento cabe à empresa (art. 72, § 1º) |
| Mais de 3 anos sem contribuir | Excede o período de graça máximo (art. 15, II e §§ 1º e 2º) |
| Já recebeu o benefício por esse filho | Benefício já concedido |

## 2. Leitura do protocolo

Formato: `SM-<PERFIL><PRIORIDADE>-<CÓDIGO>` — exemplo `SM-DEA-K7Q2`.

| Código | Perfil | Ponto de atenção |
|---|---|---|
| DE | Ex-empregada (CLT) | Período de graça: 12 meses, prorrogável por desemprego e por mais de 120 contribuições (art. 15) |
| CI | Contribuinte individual, MEI ou facultativa | Carência de 10 contribuições (art. 25, III): conferir o entendimento atual após o julgamento das ADIs 2110 e 2111 pelo STF |
| RU | Segurada especial (rural) | Atividade rural nos 10 meses anteriores ao parto, ainda que descontínua, com início de prova material (art. 25, III; Decreto 3.048/99, art. 93, § 2º). Valor de um salário mínimo (art. 39, parágrafo único) |

| Prioridade | Pontuação | Primeira resposta |
|---|---|---|
| A — quente | 80 ou mais | Imediata, no horário comercial |
| B — morno | 55 a 79 | Mesmo dia |
| C — frio | abaixo de 55 | Até o dia útil seguinte |

Pesos e limites: `WEIGHTS` e `TIER_THRESHOLDS` em `src/funnel/qualify.ts`. Ajuste depois das primeiras semanas, comparando a prioridade com o fechamento real.

## 3. Roteiro no WhatsApp

Regra geral: frases curtas, uma pergunta por mensagem, sem promessa de resultado ou prazo. Áudios curtos ajudam quem tem dificuldade de leitura.

### 3.1 Abertura

> Oi, {nome}! Aqui é {atendente}, da equipe. Recebi seu teste (protocolo {protocolo}) e já li suas respostas.
>
> Vou te fazer algumas perguntas rápidas para confirmar seu direito. Pode ser agora?

### 3.2 Confirmação por perfil

**DE — Ex-empregada**
1. Qual foi a data de saída do último emprego?
2. Você recebeu seguro-desemprego?
3. Quanto tempo, no total, você trabalhou registrada?
4. Qual a data do parto (ou a data prevista)?

Com o CNIS em mãos, conferir se o parto caiu dentro do período de graça. Demitida grávida: avaliar também a estabilidade (ADCT, art. 10, II, *b*) e encaminhar à área trabalhista.

**CI — Contribuinte, MEI ou facultativa**
1. Desde quando você paga o INSS? Paga como MEI, carnê ou autônoma?
2. Pagou todos os meses? Algum atrasado?
3. Qual a data do parto (ou a data prevista)?

**RU — Rural**
1. Que trabalho você faz no campo, na pesca ou no extrativismo? Desde quando?
2. Trabalha sozinha ou com a família? Em terra própria, arrendada ou de terceiros?
3. Que papéis você tem (declaração do sindicato, notas de venda, cadastro rural, contrato de terra)?

**Todos os perfis**
1. Algum advogado já cuida desse pedido? Se sim e ela quiser trocar, o advogado anterior deve ser comunicado antes (Código de Ética da OAB, art. 14).
2. MEI ou autônoma: quantos meses pagou no total? Algum mês atrasado?
3. Ex-empregada: foi demitida grávida? Se sim, avaliar estabilidade (ADCT, art. 10, II, *b*) com a área trabalhista.

**Pedido já negado**
1. Você tem a carta do INSS com o motivo da negativa? Pode mandar uma foto?

### 3.3 Proposta

> {nome}, pelo que você me contou, seu caso tem os requisitos para pedir o salário-maternidade. Nós fazemos o pedido no INSS e acompanhamos até a resposta.
>
> Os honorários são {modelo de honorários do escritório}. Se estiver de acordo, te mando o contrato para assinar pelo celular. Leva 2 minutos.

### 3.4 Documentos

| Documento | DE | CI | RU |
|---|---|---|---|
| RG/CNH e CPF | ✓ | ✓ | ✓ |
| Comprovante de residência | ✓ | ✓ | ✓ |
| Certidão de nascimento (ou, se grávida, atestado/ultrassom com data provável do parto) | ✓ | ✓ | ✓ |
| Carteira de trabalho (digital ou física) e termo de rescisão | ✓ | | |
| Comprovante de seguro-desemprego, se houver | ✓ | | |
| Guias pagas (DAS do MEI ou carnê) | | ✓ | |
| Autodeclaração rural e documentos do trabalho no campo | | | ✓ |
| Carta de indeferimento, se o pedido foi negado | ✓ | ✓ | ✓ |

Acesso ao Meu INSS: cadastrar o advogado como procurador. Não pedir a senha gov.br da cliente.

### 3.5 Fechamento on-line

1. Enviar pela plataforma de assinatura o contrato de honorários e a procuração, com selfie e documento como autenticação. A assinatura eletrônica aceita pelas partes é válida (MP 2.200-2/2001, art. 10, § 2º).
2. Após a assinatura, gerar a cobrança conforme o modelo de honorários e protocolar o requerimento.
3. Gestante: o pedido pode ser feito a partir de 28 dias antes do parto (Lei 8.213/91, art. 71). Agendar o retorno para essa data.

> Pronto, {nome}! Contrato assinado. Agora preciso só de {documentos pendentes}. Assim que chegarem, fazemos o pedido e te avisamos por aqui.

### 3.6 Objeções

| Objeção | Resposta |
|---|---|
| "Posso pedir sozinha no Meu INSS?" | Pode, sim. A diferença é que a equipe confere tudo antes, acompanha o pedido e, se for negado, já cuida do recurso. |
| "Quanto vou receber?" | Depende do seu histórico de contribuições. Para trabalhadora rural, é um salário mínimo. Calculamos depois de ver seu extrato do INSS. |
| "Quanto tempo demora?" | Depende do INSS. Não há como garantir prazo, mas acompanhamos de perto. |
| "Vou pensar" | Claro. Ficou alguma dúvida que eu possa responder agora? |

### 3.7 Follow-up

| Quando | Situação | Ação |
|---|---|---|
| 2 h | Não respondeu | Mensagem curta retomando o protocolo |
| 24 h | Sem resposta | Uma pergunta objetiva |
| 24 h | Recebeu o contrato e não assinou | Perguntar se ficou alguma dúvida |
| 72 h | Sem resposta | Última mensagem, deixando o canal aberto |

## 4. Configuração técnica

| Variável | Uso |
|---|---|
| `VITE_WHATSAPP_NUMBER` | Número do escritório com 55 + DDD |
| `VITE_LEAD_WEBHOOK_URL` | Webhook do Make ou do CRM |
| `VITE_META_PIXEL_ID` | Pixel da Meta; vazio = nenhum script carregado |
| `VITE_BRAND_NAME` | Nome do escritório no rodapé |
| `VITE_OAB_INFO` | Inscrição na OAB no rodapé |

Eventos do Pixel: `PageView`, `QuizIniciado`, `LeadDesqualificado` (com o motivo), `Lead` (só qualificadas) e `Contact` (abertura do WhatsApp). Otimize as campanhas para `Lead`.

Campos do webhook (`application/x-www-form-urlencoded`): `protocolo`, `criado_em`, `nome`, `whatsapp`, `cidade`, `uf`, `caso`, `caso_descricao`, `prioridade`, `pontuacao`, `alertas`, `respostas`, cada resposta (`momento`, `vinculo`, `semContribuir`, `provasRurais`, `pedidoInss`), `origem_cta`, `consentimento_lgpd`, UTMs, `fbclid`, `gclid` e `landing_url`.

## 5. Acessibilidade

A página e o teste passaram na auditoria automática WCAG 2.1 AA (axe-core) sem violações. Recursos implementados:

- Texto de 18 px ou mais, contraste mínimo de 4,5:1 e linguagem simples.
- Botões e campos com pelo menos 56 px de altura.
- Navegação completa por teclado, com foco visível, atalho "Ir direto para o teste" e foco preso dentro do teste enquanto ele está aberto.
- Leitor de tela: cada nova pergunta é anunciada, a barra de progresso informa a etapa e os erros do formulário são lidos junto com o campo.
- Animações desligadas para quem ativa "reduzir movimento" no celular.
- Redirecionamento ao WhatsApp com botão "Esperar".

## 6. Conformidade

- **OAB:** a G7 é assessoria, não escritório de advocacia, e por isso usa "análise gratuita", "+60 mil atendimentos" e "99,6% de aprovação". Para advogados, esses elementos esbarram na vedação à captação, à mercantilização e à promessa de resultado (Código de Ética, art. 7º; Provimento 205/2021). A página mantém a estrutura e o visual da G7, mas troca esses números por fatos do benefício (120 dias, valor mínimo legal, 4 perguntas, atendimento on-line) e não usa "grátis". Nome do escritório e inscrição na OAB devem constar do rodapé (art. 44).
- **Valor mínimo:** o destaque de R$ 6.484,00 é o piso legal (4 meses × salário mínimo de 2026, CF, art. 201, § 2º). Atualize `SALARIO_MINIMO` em `src/funnel/config.ts` quando o salário mínimo mudar.
- **LGPD:** consentimento no formulário; quem é barrado no teste não deixa dados (art. 6º, III). Falta publicar a política de privacidade e linká-la no formulário (art. 9º).
- **Imagem:** manter a autorização de uso de imagem da modelo da foto.
