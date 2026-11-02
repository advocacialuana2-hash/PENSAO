# Office LA — Peticionamento assistido

Painel interno da L.A. Advogados Associados para preparar, conferir e protocolar petições eletrônicas (eProc, PJe, Projudi), com extração de dados por IA, fila de envio, cofre de certificados A1 e trilha de auditoria.

**Regra central:** a IA prepara, o advogado decide. Nenhuma petição entra na fila sem a confirmação expressa de um usuário com perfil advogado ou administrador.

## Funcionalidades

| Módulo | O que faz |
|---|---|
| Distribuição | Recebe a inicial e os anexos em PDF; a IA (Claude) extrai comarca, UF, juízo, área, classe, assunto, valor da causa, gratuidade, prioridade, segredo de justiça, liminar e as partes, classifica cada anexo e aponta inconsistências. Cada campo preenchido pela IA aparece com o selo **IA** e o trecho do documento que o fundamenta. |
| Manifestação | Petição intermediária em um processo ou a mesma peça em até 50 processos (lote), com validação do número CNJ (dígito verificador mód. 97, Res. CNJ 65/2008) e descarte de duplicados. |
| Fila | Estados: rascunho → revisão → na fila → processando → concluído / aguardando protocolo / erro (com motivo) / cancelado. Reenvio após correção. |
| Protocolo | Por adaptador configurado em cada tribunal. **manual**: gera o roteiro de protocolo no portal e o operador registra número, protocolo e recibo. **simulado**: só com `SIMULACAO=1`, gera números fictícios para teste. |
| Certificados | Cofre de A1 (.pfx) cifrado com AES-256-GCM; leitura de titular, CPF (OID ICP-Brasil 2.16.76.1.3.1), validade; delegação e revogação por usuário; desativação apaga o material. Cada uso é auditado. |
| Auditoria | Login, criação, revisão, extração, envio, protocolo, uso/delegação de certificado, com usuário, IP e horário. |
| Painel | Indicadores por período, por tribunal e por responsável; alerta de certificados vencendo em 30 dias. |
| Notificações | Cada conclusão, erro ou pendência de protocolo é enviada em JSON ao `NOTIFY_WEBHOOK_URL` (ex.: cenário do Make que dispara WhatsApp). |

Perfis: **admin** (tudo), **advogado** (prepara, envia, gere os próprios certificados, vê auditoria), **administrativo** (prepara, revisa e registra protocolos; não envia para a fila).

## Segurança operacional

- Petições que estavam "processando" quando o servidor caiu voltam como **erro**, com instrução de conferir no portal antes de reenviar. O sistema nunca reenvia sozinho, para evitar protocolo em duplicidade.
- O envio exige checkbox de responsabilidade e passa por checagem de pendências (tribunal, partes, valor da causa, petição inicial identificada etc.).
- O PFX e a senha nunca são devolvidos pela API. Só o adaptador os decifra, no momento do envio, e o acesso fica registrado.
- Login com limite de 5 tentativas por IP a cada 15 minutos; senhas com scrypt; sessão em cookie HttpOnly/SameSite=Strict.

## Instalação

Requisitos: Node.js 22.9 ou superior.

```bash
npm install
cp .env.example .env
npm run gen-key        # cole o resultado em OFFICE_LA_MASTER_KEY
# preencha SESSION_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD e ANTHROPIC_API_KEY
npm run dev            # API em :3001 e painel em http://localhost:5173
```

Produção: `npm run build && npm start` (o servidor entrega o painel compilado na mesma porta da API). Use HTTPS, faça backup diário da pasta `data/` e guarde a `OFFICE_LA_MASTER_KEY` fora do servidor: sem ela os certificados ficam ilegíveis.

Testes: `npm test` · Verificação de tipos: `npm run lint`.

## Integração automática com tribunais

O protocolo automático depende de um adaptador por sistema/tribunal (`server/adapters/`). A interface `Adaptador` recebe a petição revisada, os PDFs ordenados e o acesso auditado ao certificado, e devolve número, protocolo e recibo, ou um `ErroProtocolo` com o motivo. Antes de implementar cada um, é preciso decidir a via técnica (MNI/webservice, quando o tribunal disponibiliza credencial para o escritório, ou automação do portal) e conferir os termos de uso do respectivo portal. Até lá, use o adaptador **manual**, que já elimina o preenchimento e organiza o protocolo.

## Estrutura

```
server/            API Express + SQLite (node:sqlite)
  ai.ts            extração estruturada com Claude (PDF → JSON validado por Zod)
  vault.ts         cofre de certificados A1
  queue.ts         fila de protocolo e recuperação após reinício
  cnj.ts           validação da numeração única CNJ
  adapters/        adaptadores de protocolo (manual, simulado)
  routes/          rotas de petições e de gestão
src/               painel React + Tailwind
```
