---
name: protocolo-ponte
description: "Ponte entre o painel L.A. Office e o robô de protocolo no Mac da Dra. Luana. Use quando ela pedir para protocolar o que aprovou, verificar protocolos, consultar o INSS, ou quando a rotina agendada da ponte disparar. Só roda no Mac onde o robô e o token A3 estão."
---

# Ponte de protocolo — painel L.A. Office ↔ robô no Mac

O painel (https://claude.ai/artifact/3EJxejRbZ4yzWqXpDrs6gQ) é onde a Dra. Luana **aprova**. O robô (pasta `protocolo-automatico`, painel local em http://localhost:8765) é quem **executa** com o token A3. Esta ponte só leva o que foi aprovado ao robô e traz de volta o andamento real. Ela nunca aprova, nunca escolhe peça e nunca protocola nada por conta própria.

## Regras absolutas

1. Só envie ao robô documentos com `status: "aprovado"` em `protocolos_auto`. Nada mais.
2. Nunca escreva `protocolado` no painel sem o robô ter respondido `protocolado` com número de protocolo. Sem número, o estado é `conferir`.
3. `conferir` significa que a peça **pode ter entrado**. Nunca reenvie sozinho: só quando a Dra. Luana marcar no painel (campo `reenvio_confirmado: true`).
4. Não invente número de protocolo, prazo, exigência ou requerimento. Copie exatamente o que o robô devolveu.
5. Toda escrita no painel leva `if_version` do documento lido (ArtifactData). Se a versão mudou, releia e refaça.
6. O token da API local fica em `protocolo-automatico/dados/api_token.txt`. Ele nunca vai para o painel, para o chat ou para qualquer outro lugar.

## Preparação (a cada execução)

```bash
cd ~/protocolo-automatico            # ajuste se a pasta estiver em outro lugar
TOKEN=$(cat dados/api_token.txt)
curl -s -H "X-Token: $TOKEN" http://127.0.0.1:8765/api/saude
```

Se a API não responder, o robô está fechado: grave em `meta/ponte` `{status: "robo_fechado", ultima_verificacao: <agora>}` e avise a Dra. Luana: "O robô de protocolo não está aberto no Mac (abra iniciar.command)." Não continue.

## 1. Levar os aprovados ao robô

1. `ArtifactData query` em `protocolos_auto` com `where [["status","==","aprovado"]]`.
2. Para cada documento:
   - Baixe o PDF: `Artifact read` com `url` do painel, `path` = `pdf_asset` e `out_dir` = `~/protocolo-automatico/dados/entrada-ponte`. Sem `pdf_asset`, grave `status: "erro"`, `mensagem: "Sem PDF no painel"` e siga para o próximo.
   - Envie ao robô:
     ```bash
     curl -s -H "X-Token: $TOKEN" -F "arquivo=@<pdf baixado>" \
       -F 'dados={"id_externo":"<chave>","destino":"<destino>","cnj":"<processo>","identificador":"<identificador>","tipo":"<tipo_peticao>","aprovado_por":"<aprovado_por>","aprovado_em":"<aprovado_em>","confirmar_duplicado":<true|false>,"reenvio_confirmado":<true|false>,"nome_arquivo":"<titulo>.pdf"}' \
       http://127.0.0.1:8765/api/envios
     ```
     Use `cnj` só no destino judicial e `identificador` só no INSS.
   - Grave no painel (`update`): `local_id` (= `id` da resposta), `status` (tabela da seção 2), `mensagem`, `atualizado_em`, e acrescente a `historico` `{em, o_que:"Entregue ao robô no Mac", por:"Ponte"}`.

## 2. Trazer o andamento

Para cada documento de `protocolos_auto` com status `na_fila`, `executando` ou `aguardando_voce`: `GET /api/envios/<local_id>` e traduza.

| Robô (local) | Painel (`protocolos_auto.status`) |
|---|---|
| `aprovado` | `na_fila` |
| `executando` | `executando` |
| `aguardando_voce` | `aguardando_voce` (copie `mensagem`: é o que ela precisa fazer, como digitar o PIN) |
| `protocolado` | `protocolado` |
| `conferir` | `conferir` |
| `erro` | `erro` |
| `falta_roteiro` | `falta_roteiro` |

Só grave quando o status ou a mensagem mudarem.

**Quando o robô responder `protocolado`:**
1. Baixe o comprovante: `curl -s -H "X-Token: $TOKEN" -o dados/comprovante-<local_id>.png http://127.0.0.1:8765/api/envios/<local_id>/comprovante`.
2. Suba ao painel: `Artifact publish` com `url` do painel, `file_path` do PNG e `asset: true`. Guarde o `id` e a `url` devolvidos.
3. `batch` no painel, cada entrada com `if_version`:
   - `protocolos_auto/<chave>`: `status "protocolado"`, `numero` (o `protocolo` do robô), `comprovante_asset`, `comprovante_url`, `protocolado_em`, `historico` + "Protocolado pelo robô (nº …)".
   - `protocolo/<chave>`: `set` com `{chave, documento_id, evento_id, cliente, processo, titulo, status:"protocolado", numero, em, por:"Robô (aprovado pela Dra. Luana)", historico}` (é a marcação que a aba Prontos p/ protocolo já usa).
   - `documentos/<documento_id>` (se houver): `status "protocolado"`, `protocolado_em`, `historico` + "Protocolado pelo robô (nº …)".
   - `eventos/<evento_id>` (se houver e não estiver feito): `status "feito"`, `concluido_em`, `resultado "Protocolado pelo robô em <data> (nº …)"`, `ultima_acao "Concluída"`, `ultima_acao_em`, `historico_tarefa` + item.
   - `atividade/<novo id>`: `{em, comando:"Protocolo automático", acao:"protocolo", cliente, processo, resultado:"Protocolado nº …", status:"executado"}`.

**Quando o robô responder `conferir` ou `erro`:** grave a mensagem exatamente como veio. No `conferir`, crie também um item em `eventos` do tipo `falha`, prioridade `critica`: "Conferir no sistema se a peça <titulo> entrou (processo <processo>)".

## 3. INSS — consultar exigências e andamentos

1. `ArtifactData query` em `inss_pedidos` com `where [["status","==","pendente"]]`.
2. Para cada pedido: `POST /api/consultas` com `{"roteiro":"inss-consulta","id_externo":"<id do pedido>"}`. Grave `status "executando"` e `local_id`.
3. Acompanhe com `GET /api/consultas/<local_id>`. Em `aguardando_voce`, copie a mensagem (por exemplo, a confirmação do gov.br no celular).
4. Concluída: `resultado.exigencias` é uma tabela cuja primeira linha é o cabeçalho. Para cada linha seguinte, grave em `inss_notificacoes` o doc id `inss-<requerimento>-<primeiras palavras da exigência, sem acento, com hífens>`:
   `{requerimento, servico, situacao, exigencia, prazo_txt, prazo (AAAA-MM-DD, só se a data estiver completa na tela), capturado_em, origem:"Meu INSS (robô)", lida:false}`.
   Associe as colunas pelo nome do cabeçalho (Requerimento ou Protocolo, Serviço, Situação, Exigência, Prazo). Coluna que não existir fica vazia. Não sobrescreva `lida` nem `cliente` de um documento que já exista.
5. Para exigência com prazo, crie ou atualize em `eventos` uma tarefa `mov_acao`, categoria "Prazo jurídico", `origem "Meu INSS (robô)"`, com o prazo e a ação "Cumprir exigência do INSS: <exigência>". Procure antes para não duplicar.
6. Feche o pedido: `status "concluida"`, `total`, `concluido_em`. Em erro: `status "erro"` e a mensagem.

## 4. Registro da ponte

Ao final, grave em `meta/ponte`: `{status:"ok", ultima_verificacao:<agora>, enviados:n, atualizados:n, maquina:"Mac da Dra. Luana"}`. O painel mostra isso na aba Protocoladas.

## Rotina

- Agende esta ponte no Mac (tarefa agendada do Claude Desktop) a cada 10 minutos, em dias úteis, das 7h às 20h (America/Campo_Grande).
- Se a Dra. Luana disser "protocola os aprovados" ou "consulta o INSS", rode as seções 1 e 2 ou a seção 3 na hora.
