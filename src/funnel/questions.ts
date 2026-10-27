export type QuestionId =
  | 'momento'
  | 'vinculo'
  | 'empregoAtual'
  | 'semContribuir'
  | 'contribuicoes'
  | 'provasRurais'
  | 'pedidoInss'
  | 'advogado';

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

const is = (id: QuestionId, ...values: string[]) => (a: Answers) => values.includes(a[id] ?? '');

export const QUESTIONS: Question[] = [
  {
    id: 'momento',
    title: 'Você está grávida ou já teve o bebê?',
    summaryLabel: 'Momento',
    options: [
      { value: 'gravida', label: 'Estou grávida' },
      { value: 'nasceu', label: 'Meu bebê já nasceu', hint: 'Há menos de 5 anos' },
      { value: 'adocao', label: 'Adotei uma criança' },
      { value: 'mais5', label: 'Meu filho tem mais de 5 anos' },
    ],
  },
  {
    id: 'vinculo',
    title: 'Como você trabalhava?',
    subtitle: 'Pense no período antes de engravidar ou durante a gravidez.',
    summaryLabel: 'Trabalho',
    options: [
      { value: 'clt', label: 'Com carteira assinada' },
      { value: 'contribuinte', label: 'Pagava o INSS por conta própria', hint: 'MEI, autônoma ou carnê' },
      { value: 'rural', label: 'No campo, na pesca ou no extrativismo' },
      { value: 'nenhum', label: 'Nunca trabalhei registrada nem paguei o INSS' },
    ],
  },
  {
    id: 'empregoAtual',
    title: 'Você ainda trabalha nessa empresa?',
    summaryLabel: 'Emprego atual',
    showIf: is('vinculo', 'clt'),
    options: [
      { value: 'sim', label: 'Sim, ainda trabalho lá' },
      { value: 'demitidaGravida', label: 'Não, fui demitida grávida' },
      { value: 'saiu', label: 'Não, saí antes da gravidez' },
    ],
  },
  {
    id: 'semContribuir',
    title: 'Há quanto tempo você está sem trabalhar registrada ou sem pagar o INSS?',
    subtitle: 'Conte até o nascimento do bebê. Se ainda está grávida, conte até hoje.',
    summaryLabel: 'Tempo sem contribuir',
    showIf: (a) => (a.vinculo === 'clt' && a.empregoAtual !== 'sim') || a.vinculo === 'contribuinte',
    options: [
      { value: 'contribuindo', label: 'Eu ainda pagava ou trabalhava' },
      { value: 'menos1', label: 'Menos de 1 ano' },
      { value: '1a2', label: 'De 1 a 2 anos' },
      { value: '2a3', label: 'De 2 a 3 anos' },
      { value: 'mais3', label: 'Mais de 3 anos' },
    ],
  },
  {
    id: 'contribuicoes',
    title: 'Quantos meses você pagou o INSS, no total?',
    summaryLabel: 'Meses pagos ao INSS',
    showIf: is('vinculo', 'contribuinte'),
    options: [
      { value: '10mais', label: '10 meses ou mais' },
      { value: 'menos10', label: 'Menos de 10 meses' },
      { value: 'naoSei', label: 'Não sei' },
    ],
  },
  {
    id: 'provasRurais',
    title: 'Você tem algum papel que mostra o trabalho no campo?',
    subtitle: 'Por exemplo: declaração do sindicato, notas de venda, cadastro rural ou contrato de terra.',
    summaryLabel: 'Provas do trabalho rural',
    showIf: is('vinculo', 'rural'),
    options: [
      { value: 'sim', label: 'Sim, tenho' },
      { value: 'algumas', label: 'Tenho alguns' },
      { value: 'nao', label: 'Não tenho' },
    ],
  },
  {
    id: 'pedidoInss',
    title: 'Você já pediu o salário-maternidade no INSS?',
    summaryLabel: 'Pedido no INSS',
    options: [
      { value: 'naoPediu', label: 'Ainda não pedi' },
      { value: 'negado', label: 'Pedi e foi negado' },
      { value: 'analise', label: 'Pedi e está em análise' },
      { value: 'recebeu', label: 'Já recebi' },
    ],
  },
  {
    id: 'advogado',
    title: 'Algum advogado(a) já cuida desse pedido?',
    summaryLabel: 'Já tem advogado(a)',
    options: [
      { value: 'nao', label: 'Não' },
      { value: 'trocar', label: 'Sim, mas quero trocar' },
      { value: 'sim', label: 'Sim, e vou continuar com ele(a)' },
    ],
  },
];

export const findQuestion = (id: QuestionId) => QUESTIONS.find((q) => q.id === id)!;

export const optionLabel = (id: QuestionId, value: string | undefined) =>
  findQuestion(id).options.find((o) => o.value === value)?.label ?? '';
