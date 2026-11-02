export const STATUS: Record<string, { rotulo: string; cor: string }> = {
  rascunho: { rotulo: "Rascunho", cor: "bg-slate-100 text-slate-700" },
  extraindo: { rotulo: "Extraindo com IA", cor: "bg-violet-100 text-violet-700" },
  revisao: { rotulo: "Em revisão", cor: "bg-amber-100 text-amber-800" },
  na_fila: { rotulo: "Na fila", cor: "bg-sky-100 text-sky-700" },
  processando: { rotulo: "Processando", cor: "bg-blue-100 text-blue-700" },
  aguardando_protocolo_manual: { rotulo: "Aguardando protocolo", cor: "bg-orange-100 text-orange-800" },
  concluido: { rotulo: "Concluído", cor: "bg-emerald-100 text-emerald-700" },
  erro: { rotulo: "Erro", cor: "bg-red-100 text-red-700" },
  cancelado: { rotulo: "Cancelado", cor: "bg-slate-200 text-slate-500" },
};

export const TIPOS_DOC: Record<string, string> = {
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
  outro: "Outros",
};

export const AREAS: Record<string, string> = {
  civel: "Cível", familia: "Família", consumidor: "Consumidor", trabalhista: "Trabalhista",
  previdenciario: "Previdenciário", criminal: "Criminal", fazenda_publica: "Fazenda Pública", outra: "Outra",
};

export const PRIORIDADES: Record<string, string> = {
  nenhuma: "Nenhuma", idoso: "Idoso (art. 1.048, I, CPC)", doenca_grave: "Doença grave", pessoa_com_deficiencia: "Pessoa com deficiência", crianca_adolescente: "Criança/adolescente",
};

export const MOVIMENTACOES = [
  "Petição", "Juntada de documento", "Manifestação", "Contestação", "Réplica", "Impugnação ao cumprimento de sentença",
  "Embargos de declaração", "Alegações finais", "Contrarrazões", "Apelação", "Agravo de instrumento", "Recurso inominado",
  "Pedido de cumprimento de sentença", "Execução de alimentos", "Substabelecimento", "Acordo",
];

export const dataHora = (s: string | null) => (s ? new Date(s.replace(" ", "T") + (s.includes("Z") ? "" : "Z")).toLocaleString("pt-BR") : "—");
export const data = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
