export class ErroApi extends Error {
  constructor(public status: number, message: string, public pendencias: string[] = []) {
    super(message);
  }
}

async function tratar<T>(res: Response): Promise<T> {
  const corpo = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) {
    if (res.status === 401 && !location.pathname.startsWith("/login")) location.href = "/login";
    throw new ErroApi(res.status, corpo?.erro ?? `Erro ${res.status}`, corpo?.pendencias ?? []);
  }
  return corpo as T;
}

export const api = {
  get: <T>(url: string) => fetch(`/api${url}`).then((r) => tratar<T>(r)),
  post: <T>(url: string, body?: unknown) =>
    fetch(`/api${url}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).then((r) => tratar<T>(r)),
  put: <T>(url: string, body: unknown) =>
    fetch(`/api${url}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => tratar<T>(r)),
  del: <T>(url: string) => fetch(`/api${url}`, { method: "DELETE" }).then((r) => tratar<T>(r)),
  form: <T>(url: string, form: FormData) => fetch(`/api${url}`, { method: "POST", body: form }).then((r) => tratar<T>(r)),
};

export interface Eu { id: number; nome: string; email: string; papel: "admin" | "advogado" | "administrativo"; oab: string | null; simulacao: boolean; ia: boolean }
export interface Tribunal { id: number; sigla: string; nome: string; sistema: string; adaptador: string; url_portal: string | null; ativo: number }
export interface Adaptador { chave: string; descricao: string }
export interface Certificado {
  id: number; titular: string; documento: string | null; serial: string; emissor: string | null; valido_de: string; valido_ate: string;
  ativo: number; dono_nome: string; dono_id: number; posso_usar: number; acessos: Array<{ usuario_id: number; nome: string; concedido_em: string }>;
}
export interface Documento { id: number; nome_original: string; tamanho: number; tipo: string; tipo_origem: "usuario" | "ia"; ordem: number }
export interface Parte { nome: string; tipo_pessoa: "fisica" | "juridica" | "nao_identificado"; documento: string | null; endereco: string | null; representado_por: string | null }
export interface CampoExtraido { valor: unknown; trecho: string | null; pagina: number | null }
export interface Peticao {
  id: number; tipo: "inicial" | "intermediaria"; status: string; tribunal_id: number | null; certificado_id: number | null; lote_id: number | null;
  numero_processo: string | null; movimentacao: string | null; protocolo_numero: string | null; protocolo_em: string | null; recibo_arquivo: string | null;
  erro_motivo: string | null; tentativas: number; criado_em: string; enviado_em: string | null; tribunal_sigla: string | null; certificado_titular: string | null;
  criado_por_nome: string; enviado_por_nome: string | null;
  dados: Record<string, unknown> & { polo_ativo?: Parte[]; polo_passivo?: Parte[]; _instrucoes?: string[] };
  campos_ia: string[];
  extracao: (Record<string, CampoExtraido | unknown> & { alertas?: string[] }) | null;
  documentos: Documento[];
}
export interface PeticaoResumo {
  id: number; tipo: string; status: string; numero_processo: string | null; movimentacao: string | null; protocolo_numero: string | null;
  erro_motivo: string | null; lote_id: number | null; atualizado_em: string; tribunal_sigla: string | null; criado_por_nome: string; autor: string | null; reu: string | null;
}
