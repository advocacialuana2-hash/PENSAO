import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Lock, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { Answers, QuestionId } from './questions';
import {
  CASE_LABELS,
  DisqualifyReason,
  LeadContact,
  answerSummary,
  buildProtocol,
  buildWhatsAppMessage,
  disqualification,
  firstName,
  formatWhatsApp,
  normalizeWhatsApp,
  qualify,
  visibleQuestions,
  whatsappLink,
} from './qualify';
import { REDIRECT_DELAY_SECONDS, WHATSAPP_NUMBER } from './config';
import { getAttribution, sendLead, trackEvent } from './tracking';

// --- Contexto: qualquer CTA da página abre o quiz ---

const FunnelContext = createContext<(origin: string) => void>(() => {});

export const useOpenFunnel = () => useContext(FunnelContext);

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  const [origin, setOrigin] = useState<string | null>(null);
  const open = useCallback((from: string) => {
    setOrigin(from);
    trackEvent('QuizIniciado', { origem: from }, true);
  }, []);

  return (
    <FunnelContext.Provider value={open}>
      {children}
      <AnimatePresence>{origin && <QuizModal origin={origin} onClose={() => setOrigin(null)} />}</AnimatePresence>
    </FunnelContext.Provider>
  );
}

// --- Modal ---

type Phase =
  | { kind: 'questions' }
  | { kind: 'form' }
  | { kind: 'qualified'; link: string; nome: string }
  | { kind: 'disqualified'; reason: DisqualifyReason };

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

function QuizModal({ origin, onClose }: { origin: string; onClose: () => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: 'questions' });

  const questions = useMemo(() => visibleQuestions(answers), [answers]);
  // O formulário conta como uma etapa a mais na barra de progresso.
  const totalSteps = questions.length + 1;
  const currentStep = phase.kind === 'questions' ? step : totalSteps;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const answer = (id: QuestionId, value: string) => {
    // Trocar a situação muda o roteiro: descarta respostas de ramos que deixaram de valer.
    const next: Answers = id === 'situacao' ? { situacao: value } : { ...answers, [id]: value };
    const nextQuestions = visibleQuestions(next);
    const kept = Object.fromEntries(
      nextQuestions.filter((q) => next[q.id]).map((q) => [q.id, next[q.id]]),
    ) as Answers;
    setAnswers(kept);

    const reason = disqualification(kept);
    if (reason) {
      trackEvent('LeadDesqualificado', { motivo: reason, situacao: kept.situacao, origem: origin }, true);
      setPhase({ kind: 'disqualified', reason });
      return;
    }
    const index = nextQuestions.findIndex((q) => q.id === id);
    if (index + 1 < nextQuestions.length) setStep(index + 1);
    else setPhase({ kind: 'form' });
  };

  const back = () => {
    if (phase.kind === 'form') {
      setPhase({ kind: 'questions' });
      setStep(questions.length - 1);
    } else if (step > 0) setStep(step - 1);
  };

  const submit = (contact: LeadContact) => {
    const result = qualify(answers);
    const protocol = buildProtocol(result);
    const message = buildWhatsAppMessage(contact, answers, protocol);
    const link = whatsappLink(WHATSAPP_NUMBER, message);

    sendLead({
      protocolo: protocol,
      criado_em: new Date().toISOString(),
      nome: contact.nome.trim(),
      whatsapp: `55${contact.whatsapp}`,
      cidade: contact.cidade.trim(),
      uf: contact.uf,
      caso: result.caseType,
      caso_descricao: CASE_LABELS[result.caseType],
      prioridade: result.tier,
      pontuacao: result.score,
      alertas: result.flags.join(' | '),
      respostas: answerSummary(answers).map(({ label, value }) => `${label}: ${value}`).join(' | '),
      ...answers,
      origem_cta: origin,
      consentimento_lgpd: true,
      ...getAttribution(),
    });
    trackEvent('Lead', { content_category: result.caseType, content_name: result.tier, origem: origin });

    setPhase({ kind: 'qualified', link, nome: contact.nome });
  };

  const canGoBack = (phase.kind === 'questions' && step > 0) || phase.kind === 'form';
  const question = questions[step];

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-brand-900/60 backdrop-blur-sm sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="relative w-full sm:max-w-xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-brand-50">
          <div className="flex items-center justify-between mb-4">
            {canGoBack ? (
              <button type="button" onClick={back} className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-brand-600">
                <ChevronLeft size={18} /> Voltar
              </button>
            ) : (
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600">Análise do seu caso</span>
            )}
            <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 -m-2 text-gray-400 hover:text-brand-900">
              <X size={22} />
            </button>
          </div>
          {(phase.kind === 'questions' || phase.kind === 'form') && (
            <div className="h-2 bg-brand-50 rounded-full overflow-hidden" aria-hidden="true">
              <motion.div
                className="h-full bg-brand-600 rounded-full"
                animate={{ width: `${Math.round(((currentStep + 1) / (totalSteps + 1)) * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="px-6 pb-8 pt-6">
          <AnimatePresence mode="wait">
            {phase.kind === 'questions' && question && (
              <motion.div key={question.id} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
                <h2 id="quiz-title" className="text-2xl font-serif font-bold text-brand-900 leading-snug mb-2">
                  {question.title}
                </h2>
                {question.subtitle && <p className="text-sm text-gray-500 mb-2">{question.subtitle}</p>}
                <div className="mt-6 space-y-3">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => answer(question.id, option.value)}
                        className={`w-full flex items-center justify-between gap-3 text-left px-5 py-4 rounded-2xl border-2 font-medium transition-all ${
                          selected
                            ? 'border-brand-600 bg-brand-50 text-brand-900'
                            : 'border-brand-100 text-gray-700 hover:border-brand-400 hover:bg-brand-50/50'
                        }`}
                      >
                        {option.label}
                        <ChevronRight size={18} className="shrink-0 text-brand-400" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {phase.kind === 'form' && (
              <motion.div key="form" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
                <ContactForm onSubmit={submit} />
              </motion.div>
            )}

            {phase.kind === 'qualified' && (
              <motion.div key="qualified" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <QualifiedScreen link={phase.link} nome={phase.nome} />
              </motion.div>
            )}

            {phase.kind === 'disqualified' && (
              <motion.div key="disqualified" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <DisqualifiedScreen reason={phase.reason} onClose={onClose} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Etapas finais ---

function ContactForm({ onSubmit }: { onSubmit: (contact: LeadContact) => void }) {
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizeWhatsApp(whatsapp);
    const found: Record<string, string> = {};
    if (nome.trim().split(/\s+/).length < 2) found.nome = 'Informe nome e sobrenome.';
    if (!phone) found.whatsapp = 'Informe um celular com DDD, por exemplo (11) 91234-5678.';
    if (cidade.trim().length < 2) found.cidade = 'Informe sua cidade.';
    if (!uf) found.uf = 'Selecione o estado.';
    if (!consent) found.consent = 'É necessário autorizar o contato para continuar.';
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit({ nome, whatsapp: phone!, cidade, uf });
  };

  const inputClass = 'w-full px-4 py-3.5 rounded-2xl border-2 border-brand-100 focus:border-brand-600 focus:outline-none text-gray-900';

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 id="quiz-title" className="text-2xl font-serif font-bold text-brand-900 leading-snug mb-2">
        Última etapa: para onde enviamos o retorno?
      </h2>
      <p className="text-sm text-gray-500 mb-6">Uma pessoa da equipe vai continuar o atendimento pelo WhatsApp.</p>

      <div className="space-y-4">
        <Field label="Nome completo" error={errors.nome}>
          <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="WhatsApp com DDD" error={errors.whatsapp}>
          <input
            className={inputClass}
            value={whatsapp}
            onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 91234-5678"
          />
        </Field>
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <Field label="Cidade" error={errors.cidade}>
            <input className={inputClass} value={cidade} onChange={(e) => setCidade(e.target.value)} autoComplete="address-level2" />
          </Field>
          <Field label="UF" error={errors.uf}>
            <select className={inputClass} value={uf} onChange={(e) => setUf(e.target.value)} autoComplete="address-level1">
              <option value="" />
              {UFS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
        <label className="flex items-start gap-3 text-xs text-gray-600 leading-relaxed cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-600 shrink-0" />
          <span>
            Autorizo o uso destes dados e das respostas acima exclusivamente para contato e análise do meu caso, nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).
          </span>
        </label>
        {errors.consent && <p className="text-xs text-brand-700 font-medium">{errors.consent}</p>}
      </div>

      <button
        type="submit"
        className="mt-6 w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-brand-200 flex items-center justify-center gap-2"
      >
        Ver resultado da análise <ChevronRight />
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
        <Lock size={14} /> Informações protegidas por sigilo profissional
      </p>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-brand-900 mb-1.5">{label}</span>
      {children}
      {error && <span className="block mt-1 text-xs text-brand-700 font-medium">{error}</span>}
    </label>
  );
}

function QualifiedScreen({ link, nome }: { link: string; nome: string }) {
  const [seconds, setSeconds] = useState(REDIRECT_DELAY_SECONDS);
  const redirected = useRef(false);

  const goToWhatsApp = useCallback(() => {
    if (redirected.current) return;
    redirected.current = true;
    trackEvent('Contact', { canal: 'whatsapp' });
    window.location.href = link;
  }, [link]);

  useEffect(() => {
    if (seconds <= 0) {
      goToWhatsApp();
      return;
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds, goToWhatsApp]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <ShieldCheck className="text-green-600" size={34} />
      </div>
      <h2 id="quiz-title" className="text-2xl font-serif font-bold text-brand-900 mb-3">
        {firstName(nome)}, recebemos sua análise
      </h2>
      <p className="text-gray-600 leading-relaxed mb-8">
        Pelas suas respostas, o caso pode ser avaliado pela nossa equipe. Envie o resumo pelo WhatsApp para continuar o atendimento com prioridade.
      </p>
      <a
        href={link}
        onClick={(e) => {
          e.preventDefault();
          goToWhatsApp();
        }}
        className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2"
      >
        <MessageCircle size={22} /> Continuar no WhatsApp
      </a>
      <p className="mt-4 text-xs text-gray-400" aria-live="polite">
        {seconds > 0 ? `Abrindo o WhatsApp em ${seconds}s…` : 'Abrindo o WhatsApp…'}
      </p>
    </div>
  );
}

function DisqualifiedScreen({ reason, onClose }: { reason: DisqualifyReason; onClose: () => void }) {
  const content =
    reason === 'representado'
      ? {
          title: 'Seu caso já tem quem cuide dele',
          text: 'Como um(a) advogado(a) ou a Defensoria Pública já acompanha o caso, o caminho mais seguro é tratar das próximas etapas diretamente com quem representa você. Se decidir mudar de representante, estamos à disposição.',
        }
      : {
          title: 'Existe atendimento gratuito para o seu caso',
          text: 'Quem não pode pagar advogado(a) particular tem direito a atendimento pela Defensoria Pública do seu estado. Leve documento com foto, comprovante de residência, certidão de nascimento do(a) filho(a) e o que tiver sobre a renda do pai.',
        };

  return (
    <div className="text-center">
      <h2 id="quiz-title" className="text-2xl font-serif font-bold text-brand-900 mb-3">
        {content.title}
      </h2>
      <p className="text-gray-600 leading-relaxed mb-8">{content.text}</p>
      <button type="button" onClick={onClose} className="w-full border-2 border-brand-200 text-brand-700 py-4 rounded-2xl font-bold hover:bg-brand-50">
        Voltar ao site
      </button>
    </div>
  );
}
