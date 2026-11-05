// Sempre 4 perguntas por caminho: momento, vínculo e duas perguntas do perfil.
export type QuestionId =
  | 'momento'
  | 'vinculo'
  | 'semContribuir'
  | 'provasRurais'
  | 'gestacao'
  | 'atividadeAtual'
  | 'pedidoInss';

export const QUIZ_LENGTH = 4;

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
// Grávida que nunca contribuiu: caminho de inscrição e pagamento antes do parto.
const neverPaidPregnant = (a: Answers) => a.vinculo === 'nenhum' && a.momento === 'gravida';

export const QUESTIONS: Question[] = [
  {
    id: 'momento',
    title: 'Você está grávida ou já teve o bebê?',
    summaryLabel: 'Momento',
    options: [
      { value: 'gravida', label: 'Estou grávida' },
      { value: 'nasceu14', label: 'Meu bebê nasceu há até 14 dias' },
      { value: 'nasceu5', label: 'Meu bebê nasceu há mais de 14 dias', hint: 'E tem menos de 5 anos' },
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
      { value: 'clt', label: 'Com carteira assinada, mas saí ou fui demitida' },
      { value: 'cltAtiva', label: 'Com carteira assinada e ainda trabalho lá' },
      { value: 'contribuinte', label: 'Pagava o INSS por conta própria', hint: 'MEI, autônoma ou carnê' },
      { value: 'rural', label: 'No campo, na pesca ou no extrativismo' },
      { value: 'nenhum', label: 'Nunca trabalhei registrada nem paguei o INSS' },
    ],
  },
  {
    id: 'semContribuir',
    title: 'Há quanto tempo você está sem trabalhar registrada ou sem pagar o INSS?',
    subtitle: 'Conte até o nascimento do bebê. Se ainda está grávida, conte até hoje.',
    summaryLabel: 'Tempo sem contribuir',
    showIf: is('vinculo', 'clt', 'contribuinte'),
    options: [
      { value: 'contribuindo', label: 'Eu ainda pagava ou trabalhava' },
      { value: 'menos1', label: 'Menos de 1 ano' },
      { value: '1a2', label: 'De 1 a 2 anos' },
      { value: '2a3', label: 'De 2 a 3 anos' },
      { value: 'mais3', label: 'Mais de 3 anos' },
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
    id: 'gestacao',
    title: 'De quantos meses você está?',
    summaryLabel: 'Gestação',
    showIf: neverPaidPregnant,
    options: [
      { value: 'ate3', label: 'Até 3 meses' },
      { value: '4a6', label: 'De 4 a 6 meses' },
      { value: '7mais', label: '7 meses ou mais' },
    ],
  },
  {
    id: 'atividadeAtual',
    title: 'Você trabalha hoje?',
    summaryLabel: 'Trabalho atual',
    showIf: neverPaidPregnant,
    options: [
      { value: 'naoTrabalha', label: 'Não trabalho fora', hint: 'Cuido da casa, estudo ou estou desempregada' },
      { value: 'contaPropria', label: 'Trabalho por conta própria', hint: 'Sem pagar o INSS' },
    ],
  },
  {
    id: 'pedidoInss',
    title: 'Você já pediu o salário-maternidade no INSS?',
    summaryLabel: 'Pedido no INSS',
    showIf: (a) => a.vinculo !== 'nenhum',
    options: [
      { value: 'naoPediu', label: 'Ainda não pedi' },
      { value: 'negado', label: 'Pedi e foi negado' },
      { value: 'analise', label: 'Pedi e está em análise' },
      { value: 'recebeu', label: 'Já recebi' },
    ],
  },
];

export const findQuestion = (id: QuestionId) => QUESTIONS.find((q) => q.id === id)!;

export const optionLabel = (id: QuestionId, value: string | undefined) =>
  findQuestion(id).options.find((o) => o.value === value)?.label ?? '';
