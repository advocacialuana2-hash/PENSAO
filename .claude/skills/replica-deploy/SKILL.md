---
name: replica-deploy
description: Última etapa da sequência replica. Publica a versão própria em produção no domínio do usuário, com HTTPS, variáveis de ambiente, banco, backups, monitoramento e plano de reversão. Use quando o usuário pedir para "colocar no ar", "publicar", "fazer deploy", "apontar o domínio", ou rodar /replica-deploy.
---

# /replica-deploy — colocar no ar com segurança

Objetivo: o app rodando no domínio do usuário, de forma reproduzível e recuperável.

## Pré-requisitos (confira antes de qualquer ação)

- `replica/06-test.md` sem defeitos bloqueantes ou altos em aberto.
- `replica/07-diff.md` sem pendência na verificação de originalidade.
- Provedor de hospedagem escolhido pelo usuário e acesso concedido por ele (você não cria contas pagas por conta própria).
- Domínio registrado em nome do usuário e acesso ao DNS.

Se faltar algo, pare e liste o que falta.

## Procedimento

1. **Ambiente**: produção separada de teste; variáveis de ambiente configuradas no painel do provedor (nunca commitadas); chaves novas para produção.
2. **Banco**: instância gerenciada ou volume persistente; migrações aplicadas; backup automático diário com retenção definida; **teste de restauração** feito ao menos uma vez.
3. **Build e publicação**: pipeline reproduzível (ex.: GitHub Actions ou build do provedor) a partir da branch principal; o deploy é uma ação que o usuário autoriza.
4. **Domínio e HTTPS**: registros DNS (A/AAAA/CNAME), certificado TLS automático, redirecionamento de `http` para `https` e de `www` para o domínio principal (ou o inverso).
5. **Segurança**: cabeçalhos (HSTS, CSP adequada, X-Content-Type-Options), CORS restrito, limite de requisições, cookies `Secure`, modo simulação desligado, contas e senhas padrão removidas.
6. **Observabilidade**: logs centralizados sem dados sensíveis, alerta de indisponibilidade (uptime) e de erros, uso de disco e banco.
7. **Verificação pós-deploy**: rodar o fluxo principal em produção com conta de teste, conferir HTTPS, e-mails/notificações e webhooks de pagamento em modo real com valor mínimo autorizado pelo usuário.
8. **Reversão**: documentar como voltar à versão anterior em minutos.

## Ações que exigem confirmação explícita do usuário

Apontar DNS, publicar em produção, ativar cobrança real, enviar e-mails a clientes, migrar dados reais. Pergunte antes de cada uma.

## Saída: `replica/11-deploy.md`

URL de produção, provedor, como fazer deploy e reverter, onde ficam logs e backups, variáveis necessárias (nomes, sem valores), resultado da verificação pós-deploy e próximas manutenções (renovação de domínio, rotação de chaves, revisão de backups).
