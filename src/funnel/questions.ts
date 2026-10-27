export type QuestionId =
  | 'situacao'
  | 'titulo'
  | 'atraso'
  | 'gestacao'
  | 'indicios'
  | 'idade'
  | 'renda'
  | 'advogado'
  | 'honorarios';

export type Answers = Partial<Record<QuestionId, string>>;

export interface Option {
  value: string;
  label: string;
  hint?: string;
}

export interface Question {
  id: QuestionId;
  title: string;
  subtitle?: string;
  // Rótulo curto usado no resumo enviado ao WhatsApp e ao CRM.
  summaryLabel: string;
  options: Option[];
  showIf?: (answers: Answers) => boolean;
}

const isCase = (...cases: string[]) => (a: Answers) => cases.includes(a.situacao ?? '');
const notCase = (...cases: string[]) => (a: Answers) => !cases.includes(a.situacao ?? '');

export const QUESTIONS: Question[] = [
  {
    id: 'situacao',
    title: 'Qual é a sua situação hoje?',
    summaryLabel: 'Situação',
    options: [
      { value: 'gravidez', label: 'Estou grávida e o pai não ajuda' },
      { value: 'fixacao', label: 'O pai não paga pensão', hint: 'Ainda não tem acordo nem processo' },
      { value: 'execucao', label: 'Ele atrasa ou não paga o combinado', hint: 'A pensão já foi definida' },
      { value: 'revisao', label: 'O valor não dá para as despesas' },
    ],
  },
  {
    id: 'titulo',
    title: 'Como a pensão foi definida?',
    summaryLabel: 'Pensão definida',
    showIf: isCase('execucao'),
    options: [
      { value: 'judicial', label: 'Pelo juiz, em um processo' },
      { value: 'extrajudicial', label: 'Em cartório, Defensoria ou Promotoria' },
      { value: 'informal', label: 'Só combinamos entre nós' },
      { value: 'naoSei', label: 'Não sei' },
    ],
  },
  {
    id: 'atraso',
    title: 'Há quanto tempo ele não paga?',
    summaryLabel: 'Atraso',
    showIf: isCase('execucao'),
    options: [
      { value: 'ate1', label: 'Menos de 1 mês' },
      { value: '1a3', label: 'De 1 a 3 meses' },
      { value: 'mais3', label: 'Mais de 3 meses' },
      { value: 'parcial', label: 'Ele paga só uma parte' },
    ],
  },
  {
    id: 'gestacao',
    title: 'De quantos meses você está?',
    summaryLabel: 'Gestação',
    showIf: isCase('gravidez'),
    options: [
      { value: 'ate3', label: 'Até 3 meses' },
      { value: '4a6', label: 'De 4 a 6 meses' },
      { value: '7mais', label: '7 meses ou mais' },
    ],
  },
  {
    id: 'indicios',
    title: 'Você consegue mostrar que vocês se relacionaram?',
    subtitle: 'Conversas, fotos ou pessoas que sabiam do relacionamento já ajudam.',
    summaryLabel: 'Provas do relacionamento',
    showIf: isCase('gravidez'),
    options: [
      { value: 'sim', label: 'Sim' },
      { value: 'algumas', label: 'Um pouco' },
      { value: 'nao', label: 'Não' },
    ],
  },
  {
    id: 'idade',
    title: 'Quantos anos tem seu filho ou filha?',
    subtitle: 'Se tiver mais de um, pense no mais novo.',
    summaryLabel: 'Idade do(a) filho(a)',
    showIf: notCase('gravidez'),
    options: [
      { value: 'menor', label: 'Até 17 anos' },
      { value: 'estudante', label: 'De 18 a 24 anos, estudando' },
      { value: 'maior', label: '18 anos ou mais, sem estudar' },
    ],
  },
  {
    id: 'renda',
    title: 'O pai trabalha com quê?',
    summaryLabel: 'Trabalho do pai',
    options: [
      { value: 'clt', label: 'Tem carteira assinada' },
      { value: 'servidor', label: 'É servidor, militar ou aposentado' },
      { value: 'autonomo', label: 'Trabalha por conta própria ou faz bicos' },
      { value: 'desempregado', label: 'Está desempregado' },
      { value: 'naoSei', label: 'Não sei' },
    ],
  },
  {
    id: 'advogado',
    title: 'Você já tem advogado(a) cuidando disso?',
    subtitle: 'Vale também a Defensoria Pública.',
    summaryLabel: 'Já tem advogado(a)',
    options: [
      { value: 'nao', label: 'Não' },
      { value: 'trocar', label: 'Tenho, mas quero trocar' },
      { value: 'sim', label: 'Tenho e vou continuar com ele(a)' },
    ],
  },
  {
    id: 'honorarios',
    title: 'Nosso atendimento é particular, com pagamento facilitado. Tudo bem para você?',
    summaryLabel: 'Atendimento particular',
    options: [
      { value: 'sim', label: 'Sim, tudo bem' },
      { value: 'valores', label: 'Quero saber os valores antes' },
      { value: 'nao', label: 'Não tenho como pagar advogado(a)' },
    ],
  },
];

export const findQuestion = (id: QuestionId) => QUESTIONS.find((q) => q.id === id)!;

export const optionLabel = (id: QuestionId, value: string | undefined) =>
  findQuestion(id).options.find((o) => o.value === value)?.label ?? '';
