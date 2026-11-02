---
name: replica-backend
description: Quinta etapa da sequência replica. Implementa autenticação, banco de dados, regras de negócio, pagamentos e integrações da versão própria, substituindo os mocks do front-end. Use quando o usuário pedir para "fazer o back-end", "ligar o banco", "integrar pagamento/WhatsApp/e-mail", ou rodar /replica-backend [módulo].
---

# /replica-backend — servidor, dados e integrações

Objetivo: entregar a API definida em `replica/02-architecture.md` funcionando de ponta a ponta com o front-end, com segurança adequada aos dados tratados.

## Entradas

`replica/02-architecture.md` (modelo de dados, rotas, máquinas de estado) e `replica/04-build.md` (mocks a substituir).

## Regras de implementação

1. **Segredos** só em variáveis de ambiente, documentadas em `.env.example` com explicação de cada uma. Nunca no código nem no repositório.
2. **Autenticação**: senhas com scrypt/argon2/bcrypt; sessão em cookie HttpOnly + SameSite ou token com expiração; limite de tentativas de login; perfis e permissões verificados no servidor em toda rota.
3. **Entrada**: valide tudo no servidor (tipos, tamanhos, formatos, arquivos pelo conteúdo e não só pela extensão). Consultas parametrizadas, sem concatenar SQL.
4. **Estados**: aplique as máquinas de estado no servidor; recuse transições inválidas com erro claro.
5. **Auditoria**: registre ações relevantes (login, criação, alteração, exclusão, envio, pagamento) com usuário, horário e IP.
6. **Dados sensíveis**: cifre em repouso o que for crítico (certificados, documentos, tokens de terceiros). Minimize o que é coletado.
7. **Idempotência** em operações com efeito externo (pagamento, envio, protocolo): nunca repetir automaticamente algo que pode ter sido concluído; marcar para conferência.
8. **Pagamentos**: use o provedor escolhido pelo usuário (ex.: Asaas, Stripe, Mercado Pago) com webhooks assinados e verificação da assinatura. Nunca guarde dados de cartão.
9. **Integrações**: cada uma isolada em um módulo com tratamento de falha e tempo limite; falha de notificação não derruba o fluxo principal.
10. **IA**: carregue a skill `claude-api` antes de escrever chamadas ao Claude; use saída estruturada validada e revisão humana quando o resultado tiver efeito jurídico ou financeiro.

## Verificação

- Testes automatizados das regras críticas (cálculos, validações, permissões, transições).
- Teste de ponta a ponta com o servidor rodando (curl ou Playwright): fluxo feliz, entrada inválida, usuário sem permissão, reinício no meio de uma operação.
- Remova todos os mocks listados em `replica/04-build.md`.

## Saída

- Código do servidor, migrações/esquema, `.env.example`, testes.
- `replica/05-backend.md`: rotas implementadas, integrações e variáveis necessárias, resultado dos testes (com a saída real), pendências.

Sugira o próximo passo: `/replica-test`.
