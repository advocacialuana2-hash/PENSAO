import { Answers, QUESTIONS, Question, QuestionId, optionLabel } from './questions';

export type CaseType = 'fixacao' | 'execucao' | 'revisao' | 'gravidez';
export type Tier = 'quente' | 'morno' | 'frio';
export type DisqualifyReason = 'representado' | 'gratuidade';

export interface LeadContact {
  nome: string;
  whatsapp: string; // somente dígitos, com DDD, sem o 55
  cidade: string;
  uf: string;
}

export interface QualifyResult {
  qualified: boolean;
  disqualifyReason?: DisqualifyReason;
  caseType: CaseType;
  score: number;
  tier: Tier;
  // Alertas para a equipe; nunca aparecem na mensagem enviada pela cliente.
  flags: string[];
}

export const CASE_LABELS: Record<CaseType, string> = {
  fixacao: 'Ação de alimentos (fixação)',
  execucao: 'Execução de alimentos',
  revisao: 'Revisional de alimentos',
  gravidez: 'Alimentos gravídicos',
};

const CASE_CODES: Record<CaseType, string> = {
  fixacao: 'FX',
  execucao: 'EX',
  revisao: 'RV',
  gravidez: 'GR',
};

const TIER_CODES: Record<Tier, string> = { quente: 'A', morno: 'B', frio: 'C' };

const WEIGHTS: Partial<Record<keyof Answers, Record<string, number>>> = {
  situacao: { execucao: 30, gravidez: 30, fixacao: 25, revisao: 15 },
  titulo: { judicial: 10, extrajudicial: 10, naoSei: 5 },
  atraso: { mais3: 25, '1a3': 20, parcial: 10, ate1: 5 },
  gestacao: { '7mais': 15, '4a6': 10, ate3: 5 },
  indicios: { sim: 10, algumas: 5 },
  idade: { menor: 10, estudante: 5 },
  renda: { clt: 20, servidor: 20, autonomo: 10, naoSei: 5 },
  advogado: { trocar: -5 },
  honorarios: { sim: 15, valores: 5 },
};

export const TIER_THRESHOLDS = { quente: 70, morno: 45 };

export const visibleQuestions = (answers: Answers): Question[] =>
  QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));

export const disqualification = (answers: Answers): DisqualifyReason | undefined => {
  if (answers.advogado === 'sim') return 'representado';
  if (answers.honorarios === 'nao') return 'gratuidade';
  return undefined;
};

export function qualify(answers: Answers): QualifyResult {
  let caseType = (answers.situacao ?? 'fixacao') as CaseType;
  const flags: string[] = [];

  // Acordo verbal ou particular sem homologação não é título executivo: o caminho é fixar os alimentos.
  if (caseType === 'execucao' && answers.titulo === 'informal') {
    caseType = 'fixacao';
    flags.push('Acordo sem homologação: avaliar ação de alimentos ou homologação, não execução');
  }
  if (caseType === 'execucao' && answers.titulo === 'naoSei') {
    flags.push('Confirmar a existência de título executivo (sentença, acordo homologado ou extrajudicial)');
  }
  if (answers.situacao === 'execucao' && answers.atraso === 'mais3') {
    flags.push('Atraso superior a 3 meses: avaliar cumulação dos ritos de prisão e de penhora');
  }
  if (answers.idade === 'maior') {
    flags.push('Filho(a) maior que não estuda: necessidade precisa ser demonstrada, análise individual');
  }
  if (caseType === 'gravidez' && answers.gestacao === '7mais') {
    flags.push('URGENTE: gestação avançada, ajuizar antes do parto');
  }
  if (caseType === 'gravidez' && answers.indicios === 'nao') {
    flags.push('Sem indícios de paternidade informados: orientar coleta de provas antes do ajuizamento');
  }
  if (answers.advogado === 'trocar') {
    flags.push('Já possui patrono: comunicar o advogado anterior antes de aceitar a procuração (CED, art. 14)');
  }
  if (answers.honorarios === 'valores') {
    flags.push('Sensível a preço: apresentar opções de parcelamento');
  }

  let score = 0;
  for (const [id, weights] of Object.entries(WEIGHTS)) {
    const value = answers[id as keyof Answers];
    if (value && weights) score += weights[value] ?? 0;
  }

  const tier: Tier =
    score >= TIER_THRESHOLDS.quente ? 'quente' : score >= TIER_THRESHOLDS.morno ? 'morno' : 'frio';
  const disqualifyReason = disqualification(answers);

  return { qualified: !disqualifyReason, disqualifyReason, caseType, score, tier, flags };
}

const PROTOCOL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function buildProtocol(result: QualifyResult, random: () => number = Math.random): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += PROTOCOL_ALPHABET[Math.floor(random() * PROTOCOL_ALPHABET.length)];
  return `PA-${CASE_CODES[result.caseType]}${TIER_CODES[result.tier]}-${suffix}`;
}

export const answerSummary = (answers: Answers, omit: QuestionId[] = []): { label: string; value: string }[] =>
  visibleQuestions(answers)
    .filter((q) => answers[q.id] && !omit.includes(q.id))
    .map((q) => ({ label: q.summaryLabel, value: optionLabel(q.id, answers[q.id]) }));

export const firstName = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';

// Texto que a própria cliente envia ao abrir o WhatsApp.
export function buildWhatsAppMessage(contact: LeadContact, answers: Answers, protocol: string): string {
  const lines = [
    `Olá! Me chamo ${contact.nome.trim()} e fiz a análise do meu caso no site.`,
    `Protocolo: ${protocol}`,
    '',
    // Representação e honorários ficam só no webhook: na voz da cliente soariam estranhos.
    ...answerSummary(answers, ['advogado', 'honorarios']).map(({ label, value }) => `• ${label}: ${value}`),
    `• Cidade: ${contact.cidade.trim()}/${contact.uf}`,
    '',
    'Gostaria de continuar o atendimento.',
  ];
  return lines.join('\n');
}

export const whatsappLink = (number: string, message: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

// Celular brasileiro: DDD válido + 9 dígitos começando com 9. Aceita com ou sem o 55.
export function normalizeWhatsApp(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length !== 11) return null;
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99 || digits[2] !== '9') return null;
  return digits;
}

export function formatWhatsApp(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
