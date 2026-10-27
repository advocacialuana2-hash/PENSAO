/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Baby,
  CalendarX,
  ChevronRight,
  HandCoins,
  Heart,
  HeartHandshake,
  Lock,
  MessageCircle,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FunnelProvider, useOpenFunnel } from './funnel/QuizFunnel';
import { QUESTIONS } from './funnel/questions';

const SITUATION_ICONS: Record<string, typeof Baby> = {
  gravidez: Baby,
  fixacao: HandCoins,
  execucao: CalendarX,
  revisao: Wallet,
};

const situationQuestion = QUESTIONS[0];

// --- Seções ---

const Logo = () => (
  <span className="flex items-center gap-2">
    <span className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center">
      <Heart className="text-brand-600" size={18} fill="currentColor" />
    </span>
    <span className="font-serif text-xl font-semibold text-brand-900">
      Help <span className="text-brand-600">Pensão</span>
    </span>
  </span>
);

const Header = () => {
  const openFunnel = useOpenFunnel();

  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-brand-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Logo />
        <button
          type="button"
          onClick={() => openFunnel('topo')}
          className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-full font-bold text-sm transition-colors"
        >
          Começar
        </button>
      </div>
    </header>
  );
};

const HeroPhoto = ({ className = '' }: { className?: string }) => (
  <picture>
    <source type="image/webp" srcSet="/img/gestante-600.webp 600w, /img/gestante-900.webp 900w" sizes="(min-width: 1024px) 460px, 100vw" />
    <img
      src="/img/gestante-900.jpg"
      srcSet="/img/gestante-600.jpg 600w, /img/gestante-900.jpg 900w"
      sizes="(min-width: 1024px) 460px, 100vw"
      width={900}
      height={1200}
      alt="Gestante sorrindo, com a mão na barriga, em um gramado ensolarado"
      fetchPriority="high"
      className={`w-full object-cover ${className}`}
    />
  </picture>
);

const SituationPicker = () => {
  const openFunnel = useOpenFunnel();

  return (
    <div className="bg-white rounded-[28px] shadow-xl shadow-brand-900/10 border border-brand-100 p-5 sm:p-6">
      <h2 className="font-serif text-xl sm:text-2xl font-semibold text-brand-900 mb-4">
        Para começar, qual é a sua situação?
      </h2>
      <div className="space-y-3">
        {situationQuestion.options.map((option) => {
          const Icon = SITUATION_ICONS[option.value] ?? Heart;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => openFunnel('topo_pergunta', { situacao: option.value })}
              className="w-full min-h-[64px] flex items-center gap-4 text-left px-4 py-3 rounded-2xl border-2 border-brand-100 bg-cream hover:border-brand-300 hover:bg-brand-50 transition-colors group"
            >
              <span className="w-11 h-11 shrink-0 rounded-full bg-brand-100 flex items-center justify-center">
                <Icon className="text-brand-600" size={22} />
              </span>
              <span className="flex-1">
                <span className="block font-bold text-brand-900 leading-snug">{option.label}</span>
                {option.hint && <span className="block text-sm text-gray-500">{option.hint}</span>}
              </span>
              <ChevronRight className="text-brand-400 group-hover:translate-x-1 transition-transform shrink-0" size={20} />
            </button>
          );
        })}
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
        <Lock size={14} /> Leva menos de 1 minuto. Suas respostas ficam em sigilo.
      </p>
    </div>
  );
};

const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-peach blur-3xl opacity-70 -z-10" />
    <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-sky blur-3xl opacity-70 -z-10" />
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-16 lg:pt-16 lg:pb-24 grid lg:grid-cols-[1fr_460px] gap-10 lg:gap-16 items-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-bold mb-4">
          <HeartHandshake size={16} /> Pensão alimentícia e gestantes
        </span>
        <h1 className="font-serif text-[2.1rem] sm:text-5xl lg:text-6xl font-semibold text-brand-900 leading-[1.1] mb-4">
          Você não precisa enfrentar isso <span className="text-brand-600 italic">sozinha.</span>
        </h1>
        <p className="sm:hidden text-base text-gray-600 leading-relaxed mb-5">
          O pai também tem o dever de ajudar. A gente te orienta pelo WhatsApp.
        </p>
        <p className="hidden sm:block text-xl text-gray-600 leading-relaxed mb-8 max-w-xl">
          Grávida ou já com seu filho nos braços: o pai também tem o dever de ajudar no sustento. A gente te orienta pelo WhatsApp, do jeito mais simples.
        </p>

        {/* No celular a foto aparece antes da pergunta; no computador, ao lado. */}
        <div className="lg:hidden relative mb-[-72px]">
          <div className="rounded-t-[160px] rounded-b-[32px] overflow-hidden border-4 border-white shadow-xl">
            <HeroPhoto className="h-[280px] object-[50%_22%]" />
          </div>
        </div>
        <div className="relative z-10 px-2 sm:px-0">
          <SituationPicker />
        </div>
      </motion.div>

      <motion.div
        className="hidden lg:block relative"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <div className="rounded-t-[230px] rounded-b-[40px] overflow-hidden border-8 border-white shadow-2xl">
          <HeroPhoto className="h-[600px] object-[50%_30%]" />
        </div>
        <div className="absolute -bottom-6 -left-8 bg-white rounded-3xl shadow-xl px-5 py-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <MessageCircle className="text-whatsapp" size={20} />
          </span>
          <span className="text-sm font-bold text-brand-900 leading-tight">
            Atendimento humano
            <br />
            <span className="font-medium text-gray-500">pelo WhatsApp</span>
          </span>
        </div>
      </motion.div>
    </div>
  </section>
);

const TrustBar = () => (
  <section className="border-y border-brand-100 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { icon: Smartphone, title: 'Tudo pelo celular', desc: 'Sem precisar ir ao escritório' },
        { icon: Lock, title: 'Sigilo profissional', desc: 'Sua história fica entre nós' },
        { icon: HeartHandshake, title: 'Atendimento humano', desc: 'Uma pessoa conversa com você' },
      ].map((item) => (
        <div key={item.title} className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-full bg-brand-50 flex items-center justify-center">
            <item.icon className="text-brand-600" size={22} />
          </span>
          <span>
            <span className="block font-bold text-brand-900">{item.title}</span>
            <span className="block text-sm text-gray-500">{item.desc}</span>
          </span>
        </div>
      ))}
    </div>
  </section>
);

const Empathy = () => (
  <section className="py-20 bg-peach/60">
    <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
      <Heart className="mx-auto text-brand-500 mb-5" size={32} />
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-900 mb-6">A gente sabe como é cansativo</h2>
      <p className="text-lg sm:text-xl text-gray-700 leading-relaxed">
        Contar cada centavo, ouvir promessas que não se cumprem, sentir que tudo depende só de você. Seu filho tem direito à pensão, e você tem direito a ter alguém do seu lado para cuidar disso.
      </p>
    </div>
  </section>
);

const Pregnancy = () => {
  const openFunnel = useOpenFunnel();

  return (
    <section className="py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-sky rounded-[40px] p-8 sm:p-12 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          <span className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md">
            <Baby className="text-brand-600" size={40} />
          </span>
          <div>
            <h2 className="font-serif text-3xl font-semibold text-brand-900 mb-4">
              Grávida? Você não precisa esperar o bebê nascer.
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-3">
              A lei garante os <strong>alimentos gravídicos</strong>: o pai ajuda com as despesas da gravidez, como consultas, exames, remédios e parto. Depois do nascimento, eles passam a valer como pensão para o bebê.
            </p>
            <p className="text-sm text-gray-500 mb-6">Lei 11.804/2008</p>
            <button
              type="button"
              onClick={() => openFunnel('secao_gestante', { situacao: 'gravidez' })}
              className="bg-brand-600 hover:bg-brand-700 text-white px-7 py-4 rounded-2xl font-bold text-lg transition-colors inline-flex items-center gap-2"
            >
              Sou gestante, quero começar <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => (
  <section className="py-20 bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-12">Como funciona</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Responda algumas perguntas', desc: 'São perguntas simples, é só tocar na resposta.' },
          { title: 'Converse com a equipe no WhatsApp', desc: 'Uma pessoa entende o seu caso e explica o caminho.' },
          { title: 'Assine pelo celular', desc: 'Contrato e documentos são enviados e assinados sem sair de casa.' },
        ].map((item, i) => (
          <div key={item.title} className="bg-cream rounded-[28px] p-8 border border-brand-100">
            <span className="w-12 h-12 rounded-full bg-brand-600 text-white font-serif text-xl font-semibold flex items-center justify-center mb-5">
              {i + 1}
            </span>
            <h3 className="text-xl font-bold text-brand-900 mb-2">{item.title}</h3>
            <p className="text-gray-600 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FAQ = () => (
  <section className="py-20">
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-10">Dúvidas comuns</h2>
      <div className="space-y-3">
        {[
          {
            q: 'Preciso ir até o escritório?',
            a: 'Não. Todo o atendimento é feito pelo WhatsApp, e os documentos são assinados pelo celular.',
          },
          {
            q: 'Estou grávida. Já posso pedir ajuda ao pai?',
            a: 'Sim. Os alimentos gravídicos podem ser pedidos durante a gestação e cobrem despesas como consultas, exames, remédios e parto.',
          },
          {
            q: 'E se ele estiver desempregado?',
            a: 'A obrigação continua. O valor leva em conta o que a criança precisa e o que o pai pode pagar.',
          },
          {
            q: 'Ele não paga o que foi combinado. O que fazer?',
            a: 'Se a pensão foi definida pelo juiz ou em acordo formal, é possível cobrar os valores atrasados na Justiça. Se foi só um combinado entre vocês, o primeiro passo é pedir que a pensão seja fixada.',
          },
          {
            q: 'Quanto tempo demora?',
            a: 'Depende de cada caso e de cada vara. Logo no início do processo, é possível pedir ao juiz que fixe um valor provisório.',
          },
          {
            q: 'Minhas informações ficam protegidas?',
            a: 'Sim. Tudo o que você contar é protegido pelo sigilo profissional e usado só para cuidar do seu caso.',
          },
        ].map((faq) => (
          <details key={faq.q} className="group bg-white rounded-2xl border border-brand-100 overflow-hidden">
            <summary className="flex justify-between items-center gap-4 p-5 cursor-pointer font-bold text-lg text-brand-900 hover:bg-brand-50 transition-colors list-none">
              {faq.q}
              <ChevronRight className="group-open:rotate-90 transition-transform text-brand-500 shrink-0" />
            </summary>
            <p className="px-5 pb-5 text-gray-600 leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const FinalCta = () => {
  const openFunnel = useOpenFunnel();

  return (
    <section className="px-4 sm:px-6 pb-20">
      <div className="max-w-5xl mx-auto bg-brand-600 rounded-[40px] px-6 py-14 sm:p-16 text-center text-white relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-brand-500 opacity-60" />
        <div className="relative">
          <h2 className="font-serif text-3xl sm:text-5xl font-semibold mb-4">Dê o primeiro passo hoje</h2>
          <p className="text-lg sm:text-xl text-brand-50 mb-8 max-w-xl mx-auto">
            Responda as perguntas e continue a conversa com a gente pelo WhatsApp.
          </p>
          <button
            type="button"
            onClick={() => openFunnel('cta_final')}
            className="bg-white text-brand-700 hover:bg-brand-50 px-10 py-5 rounded-2xl font-bold text-lg transition-colors inline-flex items-center gap-2"
          >
            Começar agora <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-brand-100 pt-12 pb-28 md:pb-12">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
      <Logo />
      <div className="text-sm text-gray-500 space-y-1 md:text-right">
        <p>Atendimento on-line em todo o Brasil</p>
        <p>OAB/SP 000.000</p>
        <p>Informações protegidas por sigilo profissional. © 2026 Help Pensão Alimentícia.</p>
      </div>
    </div>
  </footer>
);

// Botão flutuante: também leva ao quiz. Só aparece depois do topo, para não cobrir a foto e a pergunta.
const FloatingCta = () => {
  const openFunnel = useOpenFunnel();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.button
      type="button"
      onClick={() => openFunnel('flutuante')}
      initial={false}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-whatsapp hover:bg-whatsapp-dark text-white pl-4 pr-5 py-3.5 rounded-full font-bold shadow-xl"
    >
      <MessageCircle size={22} />
      Falar com a equipe
    </motion.button>
  );
};

export default function App() {
  return (
    <FunnelProvider>
      <div className="font-sans selection:bg-brand-200 selection:text-brand-900">
        <Header />
        <main>
          <Hero />
          <TrustBar />
          <Empathy />
          <Pregnancy />
          <HowItWorks />
          <FAQ />
          <FinalCta />
        </main>
        <Footer />
        <FloatingCta />
      </div>
    </FunnelProvider>
  );
}
