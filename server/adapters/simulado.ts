import { calcularDv } from "../cnj.ts";
import { ErroProtocolo, type Adaptador, type ContextoProtocolo, type ResultadoProtocolo } from "./types.ts";

/** Segmento (J) e tribunal (TR) da numeração CNJ, usados só para gerar números de simulação. */
const JTR: Record<string, [string, string]> = {
  TJGO: ["8", "09"],
  TRT18: ["5", "18"],
  TRF1: ["4", "01"],
  TRF4: ["4", "04"],
};

/**
 * Adaptador de SIMULAÇÃO. Não acessa tribunal algum: gera um número fictício
 * com dígito verificador válido para testar a fila, as notificações e o painel.
 * Só fica disponível com SIMULACAO=1.
 */
export const adaptadorSimulado: Adaptador = {
  chave: "simulado",
  descricao: "SIMULAÇÃO — nada é enviado ao tribunal",
  sistemas: ["eproc", "pje", "projudi", "outro"],
  disponivel: () => process.env.SIMULACAO === "1",
  async protocolar(ctx: ContextoProtocolo): Promise<ResultadoProtocolo> {
    await new Promise((r) => setTimeout(r, 1500));
    if (ctx.documentos.length === 0) throw new ErroProtocolo("Nenhum documento anexado.", false);
    const [j, tr] = JTR[ctx.tribunal.sigla] ?? ["8", "09"];
    const ano = String(new Date().getFullYear());
    const seq = String(Math.floor(Math.random() * 9_999_999)).padStart(7, "0");
    const origem = "0001";
    const numero =
      ctx.peticao.tipo === "inicial"
        ? `${seq}-${calcularDv(seq, ano, j, tr, origem)}.${ano}.${j}.${tr}.${origem}`
        : ctx.peticao.numero_processo;
    return {
      tipo: "concluido",
      numeroProcesso: numero,
      protocolo: `SIMULACAO-${Date.now()}`,
    };
  },
};
