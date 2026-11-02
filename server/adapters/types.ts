export interface TribunalCfg {
  id: number;
  sigla: string;
  nome: string;
  sistema: "eproc" | "pje" | "projudi" | "outro";
  adaptador: string;
  url_portal: string | null;
}

export interface DocumentoCfg {
  id: number;
  nome_original: string;
  arquivo: string;
  tipo: string;
  ordem: number;
}

export interface PeticaoCfg {
  id: number;
  tipo: "inicial" | "intermediaria";
  numero_processo: string | null;
  movimentacao: string | null;
  dados: Record<string, unknown>;
  certificado_id: number | null;
  enviado_por: number;
}

export interface ContextoProtocolo {
  peticao: PeticaoCfg;
  tribunal: TribunalCfg;
  documentos: DocumentoCfg[];
  /** Decifra o certificado (auditado). Só deve ser chamado no momento da assinatura/envio. */
  obterCertificado(): { pfx: Buffer; senha: string };
}

export type ResultadoProtocolo =
  | {
      tipo: "concluido";
      numeroProcesso: string | null;
      protocolo: string;
      reciboPdf?: Buffer;
    }
  | {
      tipo: "manual";
      instrucoes: string[];
    };

/** Falha de protocolo. `motivo` é exibido na fila e enviado na notificação. */
export class ErroProtocolo extends Error {
  constructor(public motivo: string, public podeRepetir = true) {
    super(motivo);
  }
}

export interface Adaptador {
  chave: string;
  descricao: string;
  sistemas: Array<TribunalCfg["sistema"]>;
  disponivel(): boolean;
  protocolar(ctx: ContextoProtocolo): Promise<ResultadoProtocolo>;
}
