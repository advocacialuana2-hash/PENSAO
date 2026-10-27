import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Lock, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { Answers, QUESTIONS, QUIZ_LENGTH, QuestionId } from './questions';
import {
  CASE_LABELS,
  DisqualifyReason,
  LeadContact,
  answerSummary,
  buildProtocol,
  buildOfficeOpener,
  caseSummary,
  disqualification,
  firstName,
  formatWhatsApp,
  normalizeWhatsApp,
  qualify,
  visibleQuestions,
  whatsappLink,
} from './qualify';
import { getAttribution, sendLead, trackEvent } from './tracking';
import { BRAND_NAME } from './config';

const FIRST_QUESTION = QUESTIONS[0].id;

// --- Contexto: qualquer CTA da página abre o quiz ---

// `preset` permite começar o quiz já com a primeira resposta escolhida na própria página.
type OpenFunnel = (origin: string, preset?: Answers) => void;

const FunnelContext = createContext<OpenFunnel>(() => {});

export const useOpenFunnel = () => useContext(FunnelContext);

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ origin: string; preset: Answers } | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback<OpenFunnel>((origin, preset: Answers = {}) => {
    opener.current = document.activeElement as HTMLElement | null;
    setSession({ origin, preset });
    trackEvent('QuizIniciado', { origem: origin, [FIRST_QUESTION]: preset[FIRST_QUESTION] }, true);
  }, []);

  const close = useCallback(() => {
    setSession(null);
    // Devolve o foco ao botão que abriu o quiz (leitores de tela e teclado).
    window.setTimeout(() => opener.current?.focus(), 0);
  }, []);

  return (
    <FunnelContext.Provider value={open}>
      {/* Respeita a preferência do sistema por menos animação. */}
      <MotionConfig reducedMotion="user">
        {children}
        <AnimatePresence>
          {session && <QuizModal origin={session.origin} preset={session.preset} onClose={close} />}
        </AnimatePresence>
      </MotionConfig>
    </FunnelContext.Provider>
  );
}

// --- Modal ---

type Phase =
  | { kind: 'questions' }
  | { kind: 'form' }
  | { kind: 'qualified'; contact: LeadContact }
  | { kind: 'disqualified'; reason: DisqualifyReason };

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function QuizModal({ origin, preset, onClose }: { origin: string; preset: Answers; onClose: () => void }) {
  const [answers, setAnswers] = useState<Answers>(preset);
  const [step, setStep] = useState(preset[FIRST_QUESTION] ? 1 : 0);
  const [phase, setPhase] = useState<Phase>({ kind: 'questions' });
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const questions = useMemo(() => visibleQuestions(answers), [answers]);
  // O formulário conta como uma etapa a mais na barra de progresso.
  const totalSteps = QUIZ_LENGTH + 1;
  const currentStep = phase.kind === 'questions' ? step + 1 : totalSteps;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') trapFocus(e, dialogRef.current);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // A cada nova tela, o foco vai para o título: o leitor de tela anuncia a pergunta.
  useEffect(() => {
    const timer = window.setTimeout(() => titleRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [step, phase.kind]);

  const answer = (id: QuestionId, value: string) => {
    // Trocar uma resposta muda o roteiro: descarta respostas de perguntas que deixaram de aparecer.
    const next: Answers = { ...answers, [id]: value };
    const nextQuestions = visibleQuestions(next);
    const index = nextQuestions.findIndex((q) => q.id === id);
    const kept = Object.fromEntries(
      nextQuestions.slice(0, index + 1).filter((q) => next[q.id]).map((q) => [q.id, next[q.id]]),
    ) as Answers;
    setAnswers(kept);
    setStep(index);

    const reason = disqualification(kept);
    if (reason) {
      trackEvent('LeadDesqualificado', { motivo: reason, origem: origin }, true);
      setPhase({ kind: 'disqualified', reason });
      return;
    }
    if (index + 1 < nextQuestions.length) setStep(index + 1);
    else setPhase({ kind: 'form' });
  };

  const back = () => {
    if (phase.kind === 'questions') {
      if (step > 0) setStep(step - 1);
      return;
    }
    // Do formulário ou de uma tela de recusa, volta para a última pergunta respondida.
    setPhase({ kind: 'questions' });
    setStep(phase.kind === 'form' ? questions.length - 1 : step);
  };

  const submit = (contact: LeadContact) => {
    const result = qualify(answers);
    const protocol = buildProtocol(result);
    const clientPhone = `55${contact.whatsapp}`;

    sendLead({
      protocolo: protocol,
      criado_em: new Date().toISOString(),
      nome: contact.nome.trim(),
      whatsapp: clientPhone,
      cidade: contact.cidade.trim(),
      uf: contact.uf,
      caso: result.caseType,
      caso_descricao: CASE_LABELS[result.caseType],
      prioridade: result.tier,
      pontuacao: result.score,
      alertas: result.flags.join(' | '),
      respostas: answerSummary(answers).map(({ label, value }) => `${label}: ${value}`).join(' | '),
      resumo: caseSummary(contact, answers),
      // A equipe toca neste link e já abre a conversa com a cliente, com a primeira mensagem escrita.
      link_whatsapp_cliente: whatsappLink(clientPhone, buildOfficeOpener(contact, protocol)),
      ...answers,
      origem_cta: origin,
      consentimento_lgpd: true,
      ...getAttribution(),
    });
    trackEvent('Lead', { content_category: result.caseType, content_name: result.tier, origem: origin });

    setPhase({ kind: 'qualified', contact });
  };

  const canGoBack = (phase.kind === 'questions' && step > 0) || phase.kind === 'form' || phase.kind === 'disqualified';
  const question = questions[step];
  const showProgress = phase.kind === 'questions' || phase.kind === 'form';

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-brand-900/70 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="relative w-full sm:max-w-xl max-h-[100dvh] sm:max-h-[92vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white px-5 sm:px-6 pt-4 pb-4 border-b border-brand-100">
          <div className="flex items-center justify-between mb-3 min-h-[48px]">
            {canGoBack ? (
              <button
                type="button"
                onClick={back}
                className="flex items-center gap-1 min-h-[48px] pr-3 text-base font-bold text-brand-700 hover:text-brand-900"
              >
                <ChevronLeft size={22} aria-hidden="true" /> Voltar
              </button>
            ) : phase.kind === 'questions' ? (
              <span className="text-base font-semibold text-brand-700">Leva menos de 1 minuto</span>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar o teste"
              className="w-12 h-12 -mr-2 flex items-center justify-center rounded-full text-gray-700 hover:bg-brand-50"
            >
              <X size={26} aria-hidden="true" />
            </button>
          </div>
          {showProgress && (
            <div
              role="progressbar"
              aria-label="Andamento do teste"
              aria-valuemin={1}
              aria-valuemax={totalSteps}
              aria-valuenow={currentStep}
              aria-valuetext={`Etapa ${currentStep} de ${totalSteps}`}
              className="h-2.5 bg-brand-100 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-brand-600 rounded-full"
                animate={{ width: `${Math.round((currentStep / totalSteps) * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 pb-8 pt-6">
          <AnimatePresence mode="wait">
            {phase.kind === 'questions' && question && (
              <motion.div key={question.id} initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }}>
                <p className="text-base font-semibold text-gray-700 mb-2">
                  Pergunta {step + 1} de {QUIZ_LENGTH}
                </p>
                <h2 id="quiz-title" ref={titleRef} tabIndex={-1} className="text-2xl font-display font-bold text-brand-900 leading-snug mb-2 outline-none">
                  {question.title}
                </h2>
                {question.subtitle && <p className="text-base text-gray-700 mb-2">{question.subtitle}</p>}
                <div className="mt-6 space-y-3" role="group" aria-labelledby="quiz-title">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => answer(question.id, option.value)}
                        className={`w-full min-h-[64px] flex items-center justify-between gap-3 text-left px-5 py-4 rounded-2xl border-2 text-lg transition-colors ${
                          selected
                            ? 'border-brand-600 bg-brand-50 text-brand-900'
                            : 'border-brand-200 bg-cream text-gray-900 hover:border-brand-500 hover:bg-brand-50'
                        }`}
                      >
                        <span>
                          <span className="block font-bold">{option.label}</span>
                          {option.hint && <span className="block text-base text-gray-700 mt-0.5">{option.hint}</span>}
                        </span>
                        <ChevronRight size={22} className="shrink-0 text-brand-600" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {phase.kind === 'form' && (
              <motion.div key="form" initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }}>
                <ContactForm onSubmit={submit} titleRef={titleRef} />
              </motion.div>
            )}

            {phase.kind === 'qualified' && (
              <motion.div key="qualified" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <QualifiedScreen contact={phase.contact} onClose={onClose} titleRef={titleRef} />
              </motion.div>
            )}

            {phase.kind === 'disqualified' && (
              <motion.div key="disqualified" initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <DisqualifiedScreen reason={phase.reason} onClose={onClose} onBack={back} titleRef={titleRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || !container.contains(active))) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (active === last || !container.contains(active))) {
    e.preventDefault();
    first.focus();
  }
}

type TitleRef = React.RefObject<HTMLHeadingElement | null>;

// --- Etapas finais ---

function ContactForm({ onSubmit, titleRef }: { onSubmit: (contact: LeadContact) => void; titleRef: TitleRef }) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizeWhatsApp(whatsapp);
    const found: Record<string, string> = {};
    if (nome.trim().split(/\s+/).length < 2) found.nome = 'Escreva seu nome e sobrenome.';
    if (!phone) found.whatsapp = 'Escreva um celular com DDD. Exemplo: (11) 91234-5678.';
    if (cidade.trim().length < 2) found.cidade = 'Escreva sua cidade.';
    if (!uf) found.uf = 'Escolha o seu estado.';
    if (!consent) found.consent = 'Marque a autorização para continuar.';
    setErrors(found);
    if (Object.keys(found).length === 0) {
      onSubmit({ nome, whatsapp: phone!, cidade, uf });
      return;
    }
    // Leva o foco ao primeiro campo com erro.
    const firstError = Object.keys(found)[0];
    formRef.current?.querySelector<HTMLElement>(`[name="${firstError}"]`)?.focus();
  };

  const inputClass = (field: string) =>
    `w-full min-h-[56px] scroll-mt-40 px-4 py-3 rounded-2xl border-2 text-lg text-gray-900 bg-white focus:outline-none focus:border-brand-700 ${
      errors[field] ? 'border-red-700' : 'border-gray-400'
    }`;
  const a11y = (field: string) => ({
    name: field,
    id: `campo-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `erro-${field}` : undefined,
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <h2 id="quiz-title" ref={titleRef} tabIndex={-1} className="text-2xl font-display font-bold text-brand-900 leading-snug mb-2 outline-none">
        Falta pouco! Como o escritório fala com você?
      </h2>
      <p className="text-base text-gray-700 mb-6">A equipe da {BRAND_NAME} vai entrar em contato com você por este WhatsApp.</p>

      <div className="space-y-5">
        <Field label="Seu nome completo" field="nome" error={errors.nome}>
          <input {...a11y('nome')} className={inputClass('nome')} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Seu WhatsApp com DDD" field="whatsapp" error={errors.whatsapp}>
          <input
            {...a11y('whatsapp')}
            className={inputClass('whatsapp')}
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 91234-5678"
          />
        </Field>
        <div className="grid grid-cols-[1fr_110px] gap-3">
          <Field label="Cidade" field="cidade" error={errors.cidade}>
            <input {...a11y('cidade')} className={inputClass('cidade')} value={cidade} onChange={(e) => setCidade(e.target.value)} autoComplete="address-level2" />
          </Field>
          <Field label="Estado" field="uf" error={errors.uf}>
            <select {...a11y('uf')} className={inputClass('uf')} value={uf} onChange={(e) => setUf(e.target.value)} autoComplete="address-level1">
              <option value="">UF</option>
              {UFS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <label htmlFor="campo-consent" className="flex items-start gap-3 text-base text-gray-800 leading-relaxed cursor-pointer">
            <input
              {...a11y('consent')}
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 w-6 h-6 accent-brand-600 shrink-0"
            />
            <span>Autorizo o uso destes dados e das minhas respostas só para entrarem em contato e analisarem o meu caso (Lei Geral de Proteção de Dados).</span>
          </label>
          {errors.consent && (
            <p id="erro-consent" className="mt-1 text-base text-red-800 font-semibold">{errors.consent}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        className="mt-7 w-full min-h-[60px] bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-2"
      >
        Ver o resultado <ChevronRight aria-hidden="true" />
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-base text-gray-700">
        <Lock size={16} aria-hidden="true" /> Seus dados ficam protegidos por sigilo profissional
      </p>
    </form>
  );
}

function Field({ label, field, error, children }: { label: string; field: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`campo-${field}`} className="block text-lg font-bold text-brand-900 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p id={`erro-${field}`} className="mt-1 text-base text-red-800 font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}

function QualifiedScreen({ contact, onClose, titleRef }: { contact: LeadContact; onClose: () => void; titleRef: TitleRef }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <ShieldCheck className="text-whatsapp" size={34} aria-hidden="true" />
      </div>
      <h2 id="quiz-title" ref={titleRef} tabIndex={-1} className="text-2xl font-display font-bold text-brand-900 mb-3 outline-none">
        Pronto, {firstName(contact.nome)}! Recebemos suas respostas.
      </h2>
      <p className="text-lg text-gray-800 leading-relaxed mb-6">
        Em breve, a <strong>{BRAND_NAME}</strong> entra em contato com você pelo WhatsApp.
      </p>
      <div className="flex items-center justify-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 mb-8">
        <MessageCircle className="text-whatsapp shrink-0" size={26} aria-hidden="true" />
        <p className="text-lg text-gray-900">
          Fique de olho no número <strong className="whitespace-nowrap">{formatWhatsApp(contact.whatsapp)}</strong>
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full min-h-[56px] border-2 border-brand-700 text-brand-800 rounded-2xl font-bold text-lg hover:bg-brand-50"
      >
        Voltar ao site
      </button>
    </div>
  );
}

const DISQUALIFIED_CONTENT: Record<DisqualifyReason, { title: string; text: string }> = {
  prazo: {
    title: 'O prazo para esse filho já passou',
    text: 'O pedido do salário-maternidade tem prazo de 5 anos. Para filhos com mais de 5 anos, em regra, não é mais possível receber. Se você tiver outro filho mais novo, faça o teste de novo.'
  },
  semVinculo: {
    title: 'Por enquanto, o INSS não paga nesse caso',
    text: 'O salário-maternidade é pago a quem trabalhou registrada, pagou o INSS ou trabalha no campo. Se você começar a pagar o INSS, pode ter direito numa próxima gravidez.'
  },
  empregada: {
    title: 'Quem paga é a sua empresa',
    text: 'Quando você continua empregada, a própria empresa paga o salário-maternidade e depois acerta com o INSS. Fale com o RH. Se a empresa se recusar a pagar, procure orientação.'
  },
  semQualidade: {
    title: 'O tempo de proteção do INSS acabou',
    text: 'Depois que a pessoa para de trabalhar registrada ou de pagar o INSS, a proteção dura um tempo limitado: até 3 anos nos casos mais favoráveis. Se você trabalhou ou pagou o INSS depois disso, volte e mude a resposta.'
  },
  jaRecebeu: {
    title: 'Você já recebeu o benefício',
    text: 'O salário-maternidade é pago uma vez para cada nascimento ou adoção. Se você tiver outro filho, pode fazer o teste de novo.'
  },
};

function DisqualifiedScreen({
  reason,
  onClose,
  onBack,
  titleRef,
}: {
  reason: DisqualifyReason;
  onClose: () => void;
  onBack: () => void;
  titleRef: TitleRef;
}) {
  const content = DISQUALIFIED_CONTENT[reason];

  return (
    <div className="text-center">
      <h2 id="quiz-title" ref={titleRef} tabIndex={-1} className="text-2xl font-display font-bold text-brand-900 mb-3 outline-none">
        {content.title}
      </h2>
      <p className="text-lg text-gray-800 leading-relaxed mb-8">{content.text}</p>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="w-full min-h-[56px] bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-lg"
        >
          Mudar minha resposta
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[56px] border-2 border-brand-600 text-brand-700 rounded-2xl font-bold text-lg hover:bg-brand-50"
        >
          Voltar ao site
        </button>
      </div>
    </div>
  );
}
