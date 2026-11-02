---
name: replica-brand
description: Nona etapa da sequência replica. Cria nome, posicionamento, tom de voz e identidade da versão própria, distintos do produto de referência, com checagem prévia de marca no INPI e de domínio. Use quando o usuário pedir para "dar um nome", "criar a marca", "rebrand", "deixar o produto com a minha cara", ou rodar /replica-brand.
---

# /replica-brand — nome e identidade próprios

Objetivo: a versão própria ganhar identidade inconfundível com a do referência, apoiada no ângulo definido em `replica/08-entrepreneur.md`.

## Entradas

`replica/08-entrepreneur.md` (público e ângulo), `replica/03-design.md` (tokens a ajustar) e as preferências do usuário (valores, tom, palavras a evitar).

## Procedimento

1. **Posicionamento** em uma frase: para [público] que [dor], [nome] é [categoria] que [benefício principal], ao contrário de [alternativa].
2. **Nomes**: gere 10–15 opções em categorias diferentes (descritivo, evocativo, inventado, composto). Descarte nomes parecidos em grafia, som ou significado com o referência e com concorrentes diretos.
3. **Pré-checagem** dos 3–5 finalistas:
   - busca de marca no INPI (busca.inpi.gov.br) nas classes pertinentes (ex.: 9 e 42 para software; 45 para serviços jurídicos). Informe o resultado como "busca preliminar"; registro e análise de colidência ficam com o advogado ou agente de propriedade industrial;
   - disponibilidade de domínio `.com.br` e `.com` (consulta real, não suposição);
   - perfis em redes sociais.
   Diga claramente o que foi verificado e o que não foi.
4. **Tom de voz**: 3 atributos com exemplos de "assim sim / assim não" em microtextos do app.
5. **Identidade visual**: ajuste os tokens de `replica/03-design.md` (cores, tipografia) e descreva o conceito do logotipo. Gere ou peça o logotipo apenas com recursos que o usuário possa usar comercialmente.
6. **Aplicação**: substitua nome, cores e textos no código e nos materiais, e confirme com busca no repositório que não restou referência ao produto original.

## Se o produto for de escritório de advocacia

Observe o Código de Ética e Disciplina da OAB e o Provimento nº 205/2021 do CFOAB sobre publicidade: sem promessa de resultado, sem mercantilização, sem captação indevida. Na dúvida, carregue a skill `la-advogados:etica-oab-publicidade`.

## Saída: `replica/09-brand.md`

Posicionamento, nome escolhido com o resultado das checagens (data e fonte), alternativas, tom de voz, tokens atualizados e lista de arquivos alterados.

Sugira o próximo passo: `/replica-launch`.
