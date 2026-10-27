import { Answers, QUESTIONS, Question, QuestionId, optionLabel } from './questions';

export type CaseType = 'desempregada' | 'contribuinte' | 'rural';
export type Tier = 'quente' | 'morno' | 'frio';
export type DisqualifyReason = 'prazo' | 'semVinculo' | 'empregada' | 'semQualidade' | 'jaRecebeu' | 'representado';

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
  desempregada: 'Salário-maternidade: ex-empregada no período de graça',
  contribuinte: 'Salário-maternidade: contribuinte individual, MEI ou facultativa',
  rural: 'Salário-maternidade: segurada especial (rural)',
};

const CASE_CODES: Record<CaseType, string> = { desempregada: 'DE', contribuinte: 'CI', rural: 'RU' };

const TIER_CODES: Record<Tier, string> = { quente: 'A', morno: 'B', frio: 'C' };

const WEIGHTS: Partial<Record<QuestionId, Record<string, number>>> = {
  momento: { nasceu: 30, gravida: 20, adocao: 20 },
  vinculo: { clt: 25, contribuinte: 20, rural: 20 },
  empregoAtual: { demitidaGravida: 5 },
  semContribuir: { contribuindo: 25, menos1: 25, '1a2': 10, '2a3': -10 },
  contribuicoes: { '10mais': 15, naoSei: 5, menos10: 5 },
  provasRurais: { sim: 25, algumas: 10 },
  pedidoInss: { negado: 25, naoPediu: 20, analise: 10 },
  advogado: { trocar: -5 },
};

export const TIER_THRESHOLDS = { quente: 80, morno: 55 };

export const visibleQuestions = (answers: Answers): Question[] =>
  QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));

// Barra o lead assim que a resposta torna o pedido inviável, sem pedir dados pessoais.
export const disqualification = (answers: Answers): DisqualifyReason | undefined => {
  if (answers.momento === 'mais5') return 'prazo';
  if (answers.vinculo === 'nenhum') return 'semVinculo';
  if (answers.empregoAtual === 'sim') return 'empregada';
  if (answers.semContribuir === 'mais3') return 'semQualidade';
  if (answers.pedidoInss === 'recebeu') return 'jaRecebeu';
  if (answers.advogado === 'sim') return 'representado';
  return undefined;
};

export function qualify(answers: Answers): QualifyResult {
  const caseType: CaseType =
    answers.vinculo === 'rural' ? 'rural' : answers.vinculo === 'contribuinte' ? 'contribuinte' : 'desempregada';
  const flags: string[] = [];

  if (answers.momento === 'gravida') {
    flags.push('Gestante: requerimento possível a partir de 28 dias antes do parto (Lei 8.213/91, art. 71)');
  }
  if (answers.momento === 'adocao') {
    flags.push('Adoção ou guarda para adoção: conferir termo judicial (art. 71-A)');
  }
  if (answers.empregoAtual === 'demitidaGravida') {
    flags.push('Demitida gestante: avaliar também estabilidade (ADCT, art. 10, II, b), demanda trabalhista');
  }
  if (answers.semContribuir === '1a2') {
    flags.push('Período de graça além de 12 meses: verificar prorrogação por desemprego ou por 120 contribuições (art. 15, §§ 1º e 2º)');
  }
  if (answers.semContribuir === '2a3') {
    flags.push('Só cabe com as duas prorrogações do período de graça (art. 15, §§ 1º e 2º): conferir CNIS antes de seguir');
  }
  if (answers.contribuicoes === 'menos10' || answers.contribuicoes === 'naoSei') {
    flags.push('Conferir carência de 10 contribuições (art. 25, III) à luz do julgamento das ADIs 2110 e 2111 pelo STF');
  }
  if (answers.provasRurais === 'nao') {
    flags.push('Sem início de prova material rural: orientar levantamento de documentos antes do requerimento');
  }
  if (answers.pedidoInss === 'negado') {
    flags.push('Indeferido: pedir a carta de indeferimento e avaliar recurso ou ação judicial');
  }
  if (answers.advogado === 'trocar') {
    flags.push('Já possui patrono: comunicar o advogado anterior antes de aceitar a procuração (CED, art. 14)');
  }

  let score = 0;
  for (const [id, weights] of Object.entries(WEIGHTS)) {
    const value = answers[id as QuestionId];
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
  return `SM-${CASE_CODES[result.caseType]}${TIER_CODES[result.tier]}-${suffix}`;
}

export const answerSummary = (answers: Answers, omit: QuestionId[] = []): { label: string; value: string }[] =>
  visibleQuestions(answers)
    .filter((q) => answers[q.id] && !omit.includes(q.id))
    .map((q) => ({ label: q.summaryLabel, value: optionLabel(q.id, answers[q.id]) }));

export const firstName = (nome: string) => nome.trim().split(/\s+/)[0] ?? '';

// Texto que a própria cliente envia ao abrir o WhatsApp.
export function buildWhatsAppMessage(contact: LeadContact, answers: Answers, protocol: string): string {
  const lines = [
    `Olá! Me chamo ${contact.nome.trim()} e fiz o teste do salário-maternidade no site.`,
    `Protocolo: ${protocol}`,
    '',
    // A resposta sobre advogado fica só no webhook: na voz da cliente soaria estranha.
    ...answerSummary(answers, ['advogado']).map(({ label, value }) => `• ${label}: ${value}`),
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
