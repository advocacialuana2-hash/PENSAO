import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ChevronLeft, Lock, X } from 'lucide-react';
import { Answers, QUESTIONS, QUIZ_LENGTH, Question, QuestionId, optionLabel } from './questions';
import {
  CASE_LABELS,
  DisqualifyReason,
  LeadContact,
  answerSummary,
  buildLeadReport,
  buildOfficeOpener,
  buildProtocol,
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

// --- Contexto: qualquer CTA da página abre a conversa ---

// `preset` permite começar já com a primeira resposta escolhida na própria página.
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
    // Devolve o foco ao botão que abriu a conversa (leitores de tela e teclado).
    window.setTimeout(() => opener.current?.focus(), 0);
  }, []);

  return (
    <FunnelContext.Provider value={open}>
      {/* Respeita a preferência do sistema por menos animação. */}
      <MotionConfig reducedMotion="user">
        {children}
        <AnimatePresence>
          {session && <ChatModal origin={session.origin} preset={session.preset} onClose={close} />}
        </AnimatePresence>
      </MotionConfig>
    </FunnelContext.Provider>
  );
}

// --- Conversa no estilo WhatsApp ---

type Phase =
  | { kind: 'questions' }
  | { kind: 'form' }
  | { kind: 'qualified'; contact: LeadContact }
  | { kind: 'disqualified'; reason: DisqualifyReason };

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function ChatModal({ origin, preset, onClose }: { origin: string; preset: Answers; onClose: () => void }) {
  const [answers, setAnswers] = useState<Answers>(preset);
  const [step, setStep] = useState(preset[FIRST_QUESTION] ? 1 : 0);
  const [phase, setPhase] = useState<Phase>({ kind: 'questions' });
  const [typing, setTyping] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  const questions = useMemo(() => visibleQuestions(answers), [answers]);
  const question = questions[step];

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

  // "Digitando…" antes de cada nova mensagem, como numa conversa real.
  useEffect(() => {
    setTyping(true);
    const timer = window.setTimeout(() => setTyping(false), prefersReducedMotion() ? 0 : 700);
    return () => window.clearTimeout(timer);
  }, [step, phase.kind]);

  // Mantém a conversa rolada até a última mensagem e leva o foco para onde a pessoa vai agir.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    if (typing) return;
    const target =
      phase.kind === 'questions' || phase.kind === 'disqualified' || phase.kind === 'qualified'
        ? footerRef.current?.querySelector<HTMLElement>('button')
        : logRef.current?.querySelector<HTMLElement>('input[name="nome"]');
    window.setTimeout(() => target?.focus({ preventScroll: true }), 50);
  }, [typing, phase.kind, step]);

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
    // Do formulário ou de uma recusa, volta para a última pergunta respondida.
    setPhase({ kind: 'questions' });
    setStep(phase.kind === 'form' ? questions.length - 1 : step);
  };

  const submit = (contact: LeadContact) => {
    const result = qualify(answers);
    const protocol = buildProtocol(result);
    const clientPhone = `55${contact.whatsapp}`;
    const attribution = getAttribution();

    sendLead({
      protocolo: protocol,
      criado_em: new Date().toISOString(),
      nome: contact.nome.trim(),
      primeiro_nome: firstName(contact.nome),
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
      relatorio: buildLeadReport({
        contact,
        answers,
        result,
        protocol,
        createdAt: new Date(),
        origin: [attribution.utm_source, attribution.utm_campaign, attribution.utm_content].filter(Boolean).join(' / ') || origin,
      }),
      // Só leads qualificados chegam aqui: o Make usa este campo para disparar a mensagem automática.
      enviar_whatsapp_automatico: true,
      // A equipe toca neste link e já abre a conversa com a cliente, com a primeira mensagem escrita.
      link_whatsapp_cliente: whatsappLink(clientPhone, buildOfficeOpener(contact, protocol)),
      ...answers,
      origem_cta: origin,
      consentimento_lgpd: true,
      ...attribution,
    });
    trackEvent('Lead', { content_category: result.caseType, content_name: result.tier, origem: origin });

    setPhase({ kind: 'qualified', contact });
  };

  // Perguntas já respondidas aparecem como histórico da conversa.
  const answered: Question[] =
    phase.kind === 'questions'
      ? questions.slice(0, step).filter((q) => answers[q.id])
      : phase.kind === 'disqualified'
        ? questions.slice(0, step + 1).filter((q) => answers[q.id])
        : questions.filter((q) => answers[q.id]);

  const progressText =
    phase.kind === 'questions' ? `Pergunta ${step + 1} de ${QUIZ_LENGTH}` : phase.kind === 'form' ? 'Última etapa' : 'Análise do salário-maternidade';

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
        className="relative w-full sm:max-w-md h-[100dvh] sm:h-[min(800px,94vh)] flex flex-col bg-wa-chat sm:rounded-2xl overflow-hidden shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 bg-wa-header text-white px-3 py-2.5 shrink-0">
          <span className="w-11 h-11 shrink-0 rounded-full bg-white border-2 border-black flex items-center justify-center" aria-hidden="true">
            <span className="font-display text-base font-extrabold text-black tracking-tighter">G1</span>
          </span>
          <div className="flex-1 min-w-0">
            <h2 id="chat-title" className="font-bold text-lg leading-tight truncate">
              {BRAND_NAME}
            </h2>
            <p className="text-sm text-white/90 truncate">{progressText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar a conversa"
            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10"
          >
            <X size={26} aria-hidden="true" />
          </button>
        </div>

        <div ref={logRef} role="log" aria-live="polite" aria-label="Conversa" tabIndex={0} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          <p className="mx-auto w-fit max-w-[90%] text-center text-sm text-gray-800 bg-[#fff5c4] rounded-lg px-3 py-1.5 mb-3">
            <Lock size={13} className="inline -mt-0.5 mr-1" aria-hidden="true" />
            Suas respostas ficam protegidas por sigilo profissional.
          </p>
          <Bubble from="bot">Olá! Aqui é a assistente da {BRAND_NAME}.</Bubble>
          <Bubble from="bot">Vou te fazer {QUIZ_LENGTH} perguntas rápidas para ver se você pode ter direito ao salário-maternidade.</Bubble>

          {answered.map((q) => (
            <React.Fragment key={q.id}>
              <Bubble from="bot">{q.title}</Bubble>
              <Bubble from="user">{optionLabel(q.id, answers[q.id])}</Bubble>
            </React.Fragment>
          ))}

          {typing ? (
            <TypingBubble />
          ) : (
            <>
              {phase.kind === 'questions' && question && (
                <Bubble from="bot">
                  <span className="block font-bold">{question.title}</span>
                  {question.subtitle && <span className="block mt-1 text-base text-gray-700">{question.subtitle}</span>}
                </Bubble>
              )}

              {phase.kind === 'form' && (
                <>
                  <Bubble from="bot">Pelas suas respostas, seu caso pode ser analisado pela nossa equipe.</Bubble>
                  <Bubble from="bot">Para a equipe falar com você, preencha seus dados:</Bubble>
                  <ContactForm onSubmit={submit} />
                </>
              )}

              {phase.kind === 'qualified' && (
                <>
                  <Bubble from="user">Dados enviados</Bubble>
                  <Bubble from="bot">
                    <span className="block font-bold">Pronto, {firstName(phase.contact.nome)}! Recebemos suas respostas.</span>
                  </Bubble>
                  <Bubble from="bot">
                    Nossa equipe de advogados especialistas vai entrar em contato com você.
                  </Bubble>
                </>
              )}

              {phase.kind === 'disqualified' && (
                <>
                  <Bubble from="bot">
                    <span className="block font-bold">{DISQUALIFIED_CONTENT[phase.reason].title}</span>
                  </Bubble>
                  <Bubble from="bot">
                    {DISQUALIFIED_CONTENT[phase.reason].text}
                  </Bubble>
                </>
              )}
            </>
          )}
        </div>

        <div ref={footerRef} className="shrink-0 bg-[#f0f2f5] border-t border-black/10 px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {phase.kind === 'questions' && question && !typing && (
            <div role="group" aria-label={question.title} className="space-y-2">
              {question.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={answers[question.id] === option.value}
                  onClick={() => answer(question.id, option.value)}
                  className="w-full min-h-[56px] px-4 py-2.5 rounded-2xl bg-white border-2 border-wa-teal text-wa-teal hover:bg-wa-bubble text-left"
                >
                  <span className="block text-lg font-bold leading-snug">{option.label}</span>
                  {option.hint && <span className="block text-base text-gray-700">{option.hint}</span>}
                </button>
              ))}
            </div>
          )}

          {phase.kind === 'disqualified' && !typing && (
            <div className="space-y-2">
              <button type="button" onClick={back} className="w-full min-h-[56px] rounded-2xl bg-wa text-wa-ink hover:bg-wa-hover font-bold text-lg">
                Mudar minha resposta
              </button>
              <button type="button" onClick={onClose} className="w-full min-h-[56px] rounded-2xl bg-white border-2 border-wa-teal text-wa-teal font-bold text-lg">
                Voltar ao site
              </button>
            </div>
          )}

          {phase.kind === 'qualified' && !typing && (
            <button type="button" onClick={onClose} className="w-full min-h-[56px] rounded-2xl bg-white border-2 border-wa-teal text-wa-teal font-bold text-lg">
              Voltar ao site
            </button>
          )}

          {((phase.kind === 'questions' && step > 0) || phase.kind === 'form') && (
            <button
              type="button"
              onClick={back}
              className="mt-2 mx-auto flex items-center gap-1 min-h-[44px] px-3 text-base font-semibold text-gray-800 hover:text-black"
            >
              <ChevronLeft size={20} aria-hidden="true" /> Corrigir a resposta anterior
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Bubble({ from, children }: { from: 'bot' | 'user'; children: React.ReactNode }) {
  const isBot = from === 'bot';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-fit max-w-[85%] px-3.5 py-2 text-lg leading-snug text-[#111b21] shadow-sm ${
        isBot ? 'bg-white rounded-2xl rounded-tl-sm' : 'ml-auto bg-wa-bubble rounded-2xl rounded-tr-sm'
      }`}
    >
      <span className="sr-only">{isBot ? `${BRAND_NAME}: ` : 'Você: '}</span>
      {children}
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="w-fit bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex gap-1.5" aria-label="Digitando" role="status">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2.5 h-2.5 rounded-full bg-gray-500"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
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

// --- Formulário dentro da conversa ---

function ContactForm({ onSubmit }: { onSubmit: (contact: LeadContact) => void }) {
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
    `w-full min-h-[56px] scroll-mt-4 px-4 py-3 rounded-xl border-2 text-lg text-gray-900 bg-white focus:outline-none focus:border-wa-teal ${
      errors[field] ? 'border-red-700' : 'border-gray-400'
    }`;
  const a11y = (field: string) => ({
    name: field,
    id: `campo-${field}`,
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `erro-${field}` : undefined,
  });

  return (
    <motion.form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-sm space-y-4"
    >
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
      <div className="grid grid-cols-[1fr_100px] gap-3">
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
            className="mt-1 w-6 h-6 accent-wa-teal shrink-0"
          />
          <span>
            Autorizo a {BRAND_NAME} a usar estes dados e minhas respostas para analisar meu caso e falar comigo pelo WhatsApp (Lei Geral de Proteção de Dados).
          </span>
        </label>
        {errors.consent && (
          <p id="erro-consent" className="mt-1 text-base text-red-800 font-semibold">{errors.consent}</p>
        )}
      </div>
      <button type="submit" className="w-full min-h-[60px] bg-wa hover:bg-wa-hover text-wa-ink rounded-xl font-bold text-xl">
        Enviar
      </button>
    </motion.form>
  );
}

function Field({ label, field, error, children }: { label: string; field: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`campo-${field}`} className="block text-lg font-bold text-gray-900 mb-1">
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

const DISQUALIFIED_CONTENT: Record<DisqualifyReason, { title: string; text: string }> = {
  prazo: {
    title: 'O prazo para esse filho já passou.',
    text: 'O pedido do salário-maternidade tem prazo de 5 anos. Para filhos com mais de 5 anos, em regra, não é mais possível receber. Se você tiver outro filho mais novo, pode fazer a análise de novo.',
  },
  semVinculo: {
    title: 'Por enquanto, o INSS não paga nesse caso.',
    text: 'O salário-maternidade é pago a quem trabalhou registrada, pagou o INSS ou trabalha no campo. Se você começar a pagar o INSS, pode ter direito numa próxima gravidez.',
  },
  empregada: {
    title: 'Quem paga é a sua empresa.',
    text: 'Quando você continua empregada, a própria empresa paga o salário-maternidade e depois acerta com o INSS. Fale com o RH. Se a empresa se recusar a pagar, procure orientação.',
  },
  semQualidade: {
    title: 'O tempo de proteção do INSS acabou.',
    text: 'Depois que a pessoa para de trabalhar registrada ou de pagar o INSS, a proteção dura um tempo limitado: até 3 anos nos casos mais favoráveis. Se você trabalhou ou pagou o INSS depois disso, mude a resposta.',
  },
  jaRecebeu: {
    title: 'Você já recebeu o benefício.',
    text: 'O salário-maternidade é pago uma vez para cada nascimento ou adoção. Se você tiver outro filho, pode fazer a análise de novo.',
  },
};
