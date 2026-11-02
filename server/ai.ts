import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { UPLOAD_DIR } from "./db.ts";

export const TIPOS_DOCUMENTO = [
  "peticao_inicial",
  "peticao_intermediaria",
  "procuracao",
  "documento_pessoal",
  "comprovante_endereco",
  "comprovante_renda",
  "declaracao_hipossuficiencia",
  "certidao",
  "contrato",
  "documento_medico",
  "comprovante_pagamento",
  "outro",
] as const;

const Parte = z.object({
  nome: z.string(),
  tipo_pessoa: z.enum(["fisica", "juridica", "nao_identificado"]),
  documento: z.string().nullable().describe("CPF ou CNPJ apenas com dígitos, se constar no texto"),
  endereco: z.string().nullable(),
  representado_por: z.string().nullable().describe("Representante legal, se houver (ex.: genitora de menor)"),
});

const Campo = <T extends z.ZodType>(valor: T) =>
  z.object({
    valor: valor.nullable(),
    trecho: z.string().nullable().describe("Trecho literal curto do documento que fundamenta o valor"),
    pagina: z.number().int().nullable(),
  });

export const ExtracaoSchema = z.object({
  comarca: Campo(z.string()),
  uf: Campo(z.string()),
  juizo: Campo(z.string()).describe("Juízo/vara endereçada, se indicada"),
  area: Campo(z.enum(["civel", "familia", "consumidor", "trabalhista", "previdenciario", "criminal", "fazenda_publica", "outra"])),
  classe: Campo(z.string()).describe("Nome da classe processual conforme a petição (ex.: Alimentos – Lei Especial nº 5.478/68)"),
  assunto: Campo(z.string()),
  valor_causa: Campo(z.number()).describe("Valor da causa em reais, número decimal"),
  gratuidade: Campo(z.boolean()).describe("Há pedido de gratuidade da justiça?"),
  prioridade: Campo(z.enum(["idoso", "doenca_grave", "pessoa_com_deficiencia", "crianca_adolescente", "nenhuma"])),
  segredo_justica: Campo(z.boolean()),
  pedido_liminar: Campo(z.boolean()).describe("Há pedido de tutela de urgência/liminar?"),
  polo_ativo: z.array(Parte),
  polo_passivo: z.array(Parte),
  documentos: z
    .array(
      z.object({
        indice: z.number().int().describe("Índice do documento na ordem enviada, começando em 0"),
        tipo: z.enum(TIPOS_DOCUMENTO),
        observacao: z.string().nullable(),
      }),
    )
    .describe("Classificação de cada arquivo enviado"),
  alertas: z.array(z.string()).describe("Inconsistências ou ausências que o advogado deve conferir"),
});

export type Extracao = z.infer<typeof ExtracaoSchema>;

const SYSTEM = `Você extrai dados estruturados de petições iniciais brasileiras e classifica os anexos, para preparar o cadastro do processo no sistema do tribunal.

Regras:
- Use somente o que está escrito nos documentos. Se a informação não constar, devolva valor null. Não deduza comarca, valor, CPF, endereço ou classe a partir de indícios.
- Para cada campo preenchido, copie em "trecho" a passagem literal (curta) que o fundamenta e informe a página.
- Classe e assunto: transcreva como a petição os nomeia. Não invente códigos da Tabela Processual Unificada.
- Valor da causa: converta "R$ 12.345,67" para 12345.67.
- CPF/CNPJ: apenas dígitos.
- Classifique cada arquivo pelo conteúdo, não pelo nome do arquivo. O primeiro arquivo costuma ser a petição, mas confirme.
- Em "alertas", aponte o que um advogado precisa conferir antes do protocolo: ausência de procuração, divergência de nomes ou CPF entre petição e documentos, valor da causa ausente, pedido de gratuidade sem declaração de hipossuficiência, documento ilegível.`;

let cliente: Anthropic | null = null;
function client(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error("ANTHROPIC_API_KEY não configurada: a extração por IA está indisponível.");
  }
  cliente ??= new Anthropic();
  return cliente;
}

export interface ArquivoParaIa {
  arquivo: string;
  nomeOriginal: string;
}

const LIMITE_BYTES = 30 * 1024 * 1024;

export async function extrairDados(arquivos: ArquivoParaIa[]): Promise<Extracao> {
  let total = 0;
  const content: Anthropic.ContentBlockParam[] = [];
  arquivos.forEach((a, i) => {
    const buf = fs.readFileSync(path.join(UPLOAD_DIR, a.arquivo));
    total += buf.length;
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") },
      title: `[${i}] ${a.nomeOriginal}`,
    });
  });
  if (total > LIMITE_BYTES) {
    throw new Error("Os PDFs somam mais de 30 MB. Comprima os anexos ou envie a extração só com a petição.");
  }
  content.push({
    type: "text",
    text: `Foram enviados ${arquivos.length} arquivo(s), na ordem dos índices indicados no título de cada um. Extraia os dados da petição inicial e classifique todos os arquivos.`,
  });

  const response = await client().messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "high", format: zodOutputFormat(ExtracaoSchema) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("A IA recusou processar estes documentos.");
  if (response.stop_reason === "max_tokens") throw new Error("A resposta da IA foi interrompida. Tente novamente com menos anexos.");
  if (!response.parsed_output) throw new Error("A IA devolveu um formato inesperado. Tente novamente.");
  return response.parsed_output;
}
