export type QuestionId =
  | 'situacao'
  | 'titulo'
  | 'atraso'
  | 'gestacao'
  | 'indicios'
  | 'pagadorMotivo'
  | 'idade'
  | 'renda'
  | 'localizacao'
  | 'advogado'
  | 'honorarios';

export type Answers = Partial<Record<QuestionId, string>>;

export interface Option {
  value: string;
  label: string;
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
    title: 'Qual destas situações descreve o seu caso?',
    summaryLabel: 'Situação',
    options: [
      { value: 'fixacao', label: 'O pai não paga pensão e não existe acordo nem processo' },
      { value: 'execucao', label: 'A pensão já foi definida, mas ele atrasa ou não paga' },
      { value: 'revisao', label: 'Recebo pensão, mas o valor não cobre as despesas' },
      { value: 'gravidez', label: 'Estou grávida e o pai não ajuda com as despesas' },
      { value: 'pagador', label: 'Sou eu quem paga a pensão e preciso revisar ou encerrar' },
    ],
  },
  {
    id: 'titulo',
    title: 'Como a pensão foi definida?',
    summaryLabel: 'Pensão definida por',
    showIf: isCase('execucao'),
    options: [
      { value: 'judicial', label: 'Por decisão do juiz ou acordo homologado na Justiça' },
      { value: 'extrajudicial', label: 'Por acordo escrito feito em cartório, na Defensoria ou no Ministério Público' },
      { value: 'informal', label: 'Por acordo verbal ou papel assinado só entre nós' },
      { value: 'naoSei', label: 'Não sei informar' },
    ],
  },
  {
    id: 'atraso',
    title: 'Há quanto tempo a pensão está atrasada?',
    summaryLabel: 'Atraso',
    showIf: isCase('execucao'),
    options: [
      { value: 'ate1', label: 'Menos de 1 mês' },
      { value: '1a3', label: 'De 1 a 3 meses' },
      { value: 'mais3', label: 'Mais de 3 meses' },
      { value: 'parcial', label: 'Ele paga só uma parte do valor' },
    ],
  },
  {
    id: 'gestacao',
    title: 'Com quantos meses de gestação você está?',
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
    title: 'Você tem como demonstrar o relacionamento com o pai?',
    subtitle: 'Por exemplo: mensagens, fotos, testemunhas ou comprovantes.',
    summaryLabel: 'Provas do relacionamento',
    showIf: isCase('gravidez'),
    options: [
      { value: 'sim', label: 'Sim, tenho' },
      { value: 'algumas', label: 'Tenho algumas' },
      { value: 'nao', label: 'Não tenho' },
    ],
  },
  {
    id: 'pagadorMotivo',
    title: 'O que mudou na sua situação?',
    summaryLabel: 'Motivo',
    showIf: isCase('pagador'),
    options: [
      { value: 'renda', label: 'Minha renda diminuiu ou perdi o emprego' },
      { value: 'maioridade', label: 'O filho completou 18 anos ou mais' },
      { value: 'familia', label: 'Tive outro filho ou novas despesas obrigatórias' },
      { value: 'cobranca', label: 'Estou sendo cobrado na Justiça ou com risco de prisão' },
    ],
  },
  {
    id: 'idade',
    title: 'Qual a idade do(a) filho(a)?',
    subtitle: 'Se forem mais de um, considere o mais novo.',
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
    title: 'Qual a situação de trabalho do pai?',
    summaryLabel: 'Trabalho do pai',
    showIf: notCase('pagador'),
    options: [
      { value: 'clt', label: 'Carteira assinada (CLT)' },
      { value: 'servidor', label: 'Servidor público, militar ou aposentado' },
      { value: 'autonomo', label: 'Autônomo, empresário ou trabalho informal' },
      { value: 'desempregado', label: 'Desempregado' },
      { value: 'naoSei', label: 'Não sei' },
    ],
  },
  {
    id: 'localizacao',
    title: 'Você sabe onde ele mora ou trabalha?',
    summaryLabel: 'Localização do pai',
    showIf: notCase('pagador'),
    options: [
      { value: 'sim', label: 'Sei o endereço ou o local de trabalho' },
      { value: 'cidade', label: 'Sei apenas a cidade' },
      { value: 'nao', label: 'Não sei' },
    ],
  },
  {
    id: 'advogado',
    title: 'Algum advogado(a) ou a Defensoria Pública já cuida deste caso?',
    summaryLabel: 'Representação atual',
    options: [
      { value: 'nao', label: 'Não' },
      { value: 'trocar', label: 'Sim, mas quero mudar de advogado(a)' },
      { value: 'sim', label: 'Sim, e quero continuar com quem já me atende' },
    ],
  },
  {
    id: 'honorarios',
    title: 'O atendimento é particular, com honorários que podem ser parcelados. Isso funciona para você?',
    summaryLabel: 'Honorários',
    options: [
      { value: 'sim', label: 'Sim, quero seguir' },
      { value: 'valores', label: 'Quero conhecer os valores antes' },
      { value: 'nao', label: 'Não tenho condições de pagar advogado(a)' },
    ],
  },
];

export const findQuestion = (id: QuestionId) => QUESTIONS.find((q) => q.id === id)!;

export const optionLabel = (id: QuestionId, value: string | undefined) =>
  findQuestion(id).options.find((o) => o.value === value)?.label ?? '';
