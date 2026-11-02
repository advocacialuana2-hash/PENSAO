import type { Adaptador, ContextoProtocolo, ResultadoProtocolo } from "./types.ts";

const ROTULO: Record<string, string> = {
  peticao_inicial: "Petição inicial",
  peticao_intermediaria: "Petição",
  procuracao: "Procuração",
  documento_pessoal: "Documento de identificação",
  comprovante_endereco: "Comprovante de endereço",
  comprovante_renda: "Comprovante de renda",
  declaracao_hipossuficiencia: "Declaração de hipossuficiência",
  certidao: "Certidão",
  contrato: "Contrato",
  documento_medico: "Documento médico",
  comprovante_pagamento: "Comprovante de pagamento",
  outro: "Outros documentos",
};

/**
 * Adaptador padrão: prepara o pacote conferido e deixa a petição aguardando
 * o protocolo pelo operador no portal do tribunal. Ao concluir, o operador
 * registra o número e anexa o recibo no painel.
 */
export const adaptadorManual: Adaptador = {
  chave: "manual",
  descricao: "Pacote conferido + protocolo pelo operador no portal",
  sistemas: ["eproc", "pje", "projudi", "outro"],
  disponivel: () => true,
  async protocolar(ctx: ContextoProtocolo): Promise<ResultadoProtocolo> {
    const { peticao, tribunal, documentos } = ctx;
    const passos: string[] = [];
    passos.push(`Acesse ${tribunal.url_portal ?? `o portal ${tribunal.sistema.toUpperCase()} do ${tribunal.sigla}`} com o certificado indicado.`);
    if (peticao.tipo === "inicial") {
      const d = peticao.dados as Record<string, { valor?: unknown } | unknown>;
      const v = (k: string) => {
        const x = d[k] as { valor?: unknown } | undefined;
        return x && typeof x === "object" && "valor" in x ? x.valor : x;
      };
      passos.push(`Novo processo → comarca ${v("comarca") ?? "(conferir)"}, classe "${v("classe") ?? "(conferir)"}", assunto "${v("assunto") ?? "(conferir)"}".`);
      passos.push(`Valor da causa: ${typeof v("valor_causa") === "number" ? (v("valor_causa") as number).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "(conferir)"}. Gratuidade: ${v("gratuidade") === true ? "sim" : "não"}.`);
      passos.push("Cadastre as partes conforme a aba Dados da petição.");
    } else {
      passos.push(`Processo ${peticao.numero_processo} → peticionar → tipo "${peticao.movimentacao ?? "Petição"}".`);
    }
    documentos
      .sort((a, b) => a.ordem - b.ordem)
      .forEach((doc, i) => passos.push(`Anexo ${i + 1}: ${doc.nome_original} — tipo "${ROTULO[doc.tipo] ?? doc.tipo}".`));
    passos.push("Assine, envie e baixe o recibo. Depois registre aqui o número/protocolo e anexe o recibo.");
    return { tipo: "manual", instrucoes: passos };
  },
};
