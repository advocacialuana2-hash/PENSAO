/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Baby,
  CalendarX,
  CheckCircle2,
  ChevronRight,
  Heart,
  HeartHandshake,
  Info,
  Lock,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FunnelProvider, useOpenFunnel } from './funnel/QuizFunnel';
import { QUESTIONS } from './funnel/questions';
import { BRAND_NAME, OAB_INFO } from './funnel/config';

const FIRST_OPTION_ICONS: Record<string, typeof Baby> = {
  gravida: Heart,
  nasceu: Baby,
  adocao: HeartHandshake,
  mais5: CalendarX,
};

const firstQuestion = QUESTIONS[0];

// --- Seções ---

const SkipLink = () => (
  <a
    href="#teste"
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-white focus:text-brand-900 focus:px-5 focus:py-3 focus:rounded-xl focus:font-bold focus:shadow-lg"
  >
    Ir direto para o teste
  </a>
);

const Logo = () => (
  <span className="flex items-center gap-2">
    <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center" aria-hidden="true">
      <Heart className="text-brand-600" size={20} fill="currentColor" />
    </span>
    <span className="font-serif text-xl font-semibold text-brand-900 leading-tight">
      Salário-<span className="text-brand-700">Maternidade</span>
    </span>
  </span>
);

const Header = () => {
  const openFunnel = useOpenFunnel();

  return (
    <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md border-b border-brand-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between gap-3">
        <Logo />
        <button
          type="button"
          onClick={() => openFunnel('topo')}
          className="shrink-0 min-h-[48px] bg-brand-600 hover:bg-brand-700 text-white px-5 rounded-full font-bold text-base transition-colors"
        >
          Fazer o teste
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

const FirstQuestion = () => {
  const openFunnel = useOpenFunnel();

  return (
    <section
      id="teste"
      aria-labelledby="teste-titulo"
      className="bg-white rounded-[28px] shadow-xl shadow-brand-900/10 border border-brand-100 p-5 sm:p-6"
    >
      <p className="text-base font-semibold text-brand-700 mb-1">Teste rápido, leva 1 minuto</p>
      <h2 id="teste-titulo" className="font-serif text-2xl font-semibold text-brand-900 mb-4">
        {firstQuestion.title}
      </h2>
      <div className="space-y-3">
        {firstQuestion.options.map((option) => {
          const Icon = FIRST_OPTION_ICONS[option.value] ?? Heart;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => openFunnel('topo_pergunta', { [firstQuestion.id]: option.value })}
              className="w-full min-h-[68px] flex items-center gap-4 text-left px-4 py-3 rounded-2xl border-2 border-brand-200 bg-cream hover:border-brand-500 hover:bg-brand-50 transition-colors group"
            >
              <span className="w-12 h-12 shrink-0 rounded-full bg-brand-100 flex items-center justify-center" aria-hidden="true">
                <Icon className="text-brand-700" size={24} />
              </span>
              <span className="flex-1">
                <span className="block text-lg font-bold text-brand-900 leading-snug">{option.label}</span>
                {option.hint && <span className="block text-base text-gray-700">{option.hint}</span>}
              </span>
              <ChevronRight className="text-brand-600 group-hover:translate-x-1 transition-transform shrink-0" size={24} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-base text-gray-700">
        <Lock size={16} aria-hidden="true" /> Suas respostas ficam em sigilo
      </p>
    </section>
  );
};

const Hero = () => (
  <section className="relative overflow-hidden" aria-labelledby="titulo-principal">
    <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-peach blur-3xl opacity-70 -z-10" aria-hidden="true" />
    <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-sky blur-3xl opacity-70 -z-10" aria-hidden="true" />
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-16 lg:pt-16 lg:pb-24 grid lg:grid-cols-[1fr_460px] gap-10 lg:gap-16 items-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-800 text-base font-bold mb-4">
          <HeartHandshake size={18} aria-hidden="true" /> Benefício do INSS para mães
        </p>
        <h1 id="titulo-principal" className="font-serif text-[2.1rem] sm:text-5xl lg:text-6xl font-semibold text-brand-900 leading-[1.12] mb-4">
          Mesmo sem emprego, você pode receber o <span className="text-brand-700 italic">salário-maternidade.</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-800 leading-relaxed mb-6 sm:mb-8 max-w-xl">
          O INSS paga 120 dias, cerca de 4 meses. Responda algumas perguntas e descubra se você tem direito.
        </p>

        {/* No celular a foto aparece antes da pergunta; no computador, ao lado. */}
        <div className="lg:hidden relative mb-[-72px]">
          <div className="rounded-t-[160px] rounded-b-[32px] overflow-hidden border-4 border-white shadow-xl">
            <HeroPhoto className="h-[280px] object-[50%_22%]" />
          </div>
        </div>
        <div className="relative z-10 px-2 sm:px-0">
          <FirstQuestion />
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
      </motion.div>
    </div>
  </section>
);

const TrustBar = () => (
  <section aria-label="Como é o atendimento" className="border-y border-brand-100 bg-white">
    <ul className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
      {[
        { icon: Smartphone, title: 'Tudo pelo celular', desc: 'Você não precisa ir ao INSS' },
        { icon: Lock, title: 'Sigilo profissional', desc: 'Sua história fica entre nós' },
        { icon: HeartHandshake, title: 'Atendimento humano', desc: 'Uma pessoa conversa com você' },
      ].map((item) => (
        <li key={item.title} className="flex items-center gap-3">
          <span className="w-12 h-12 shrink-0 rounded-full bg-brand-50 flex items-center justify-center" aria-hidden="true">
            <item.icon className="text-brand-700" size={24} />
          </span>
          <span>
            <span className="block text-lg font-bold text-brand-900">{item.title}</span>
            <span className="block text-base text-gray-700">{item.desc}</span>
          </span>
        </li>
      ))}
    </ul>
  </section>
);

const WhoCanReceive = () => {
  const openFunnel = useOpenFunnel();

  return (
    <section className="py-16 sm:py-20 bg-peach/60" aria-labelledby="quem-titulo">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 id="quem-titulo" className="font-serif text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-8">
          Quem pode ter direito
        </h2>
        <ul className="space-y-4">
          {[
            { title: 'Quem trabalhou de carteira assinada e saiu ou foi demitida', desc: 'Desde que ainda esteja no prazo de proteção do INSS.' },
            { title: 'MEI, autônoma ou quem paga o carnê do INSS', desc: 'Mesmo que não pague mais, dependendo de quando parou.' },
            { title: 'Quem trabalha no campo, na pesca ou no extrativismo', desc: 'Mesmo sem nunca ter pago o INSS.' },
            { title: 'Mãe que adotou uma criança', desc: 'Também vale para quem tem a guarda para adoção.' },
          ].map((item) => (
            <li key={item.title} className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-brand-100">
              <CheckCircle2 className="text-whatsapp shrink-0 mt-0.5" size={28} aria-hidden="true" />
              <span>
                <span className="block text-lg font-bold text-brand-900">{item.title}</span>
                <span className="block text-base text-gray-700 mt-1">{item.desc}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-start gap-3 bg-sky rounded-2xl p-5 text-base text-gray-900">
          <Info className="text-brand-800 shrink-0 mt-0.5" size={22} aria-hidden="true" />
          <span>
            <strong>Ainda está empregada?</strong> Nesse caso, quem paga o salário-maternidade é a própria empresa.
          </span>
        </p>
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={() => openFunnel('quem_tem_direito')}
            className="min-h-[60px] bg-brand-600 hover:bg-brand-700 text-white px-8 rounded-2xl font-bold text-lg transition-colors inline-flex items-center gap-2"
          >
            Descobrir se eu tenho direito <ChevronRight size={22} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => (
  <section className="py-16 sm:py-20 bg-white" aria-labelledby="como-titulo">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <h2 id="como-titulo" className="font-serif text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-10">
        Como funciona
      </h2>
      <ol className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Faça o teste', desc: 'São poucas perguntas. É só tocar na resposta.' },
          { title: 'Converse no WhatsApp', desc: 'Uma pessoa da equipe entende o seu caso e explica tudo.' },
          { title: 'A gente cuida do pedido', desc: 'Você assina pelo celular e a equipe faz o pedido no INSS.' },
        ].map((item, i) => (
          <li key={item.title} className="bg-cream rounded-[28px] p-7 border border-brand-100">
            <span className="w-12 h-12 rounded-full bg-brand-600 text-white font-serif text-xl font-semibold flex items-center justify-center mb-4" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="text-xl font-bold text-brand-900 mb-2">{item.title}</h3>
            <p className="text-lg text-gray-700 leading-relaxed">{item.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const FAQ = () => (
  <section className="py-16 sm:py-20" aria-labelledby="duvidas-titulo">
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <h2 id="duvidas-titulo" className="font-serif text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-8">
        Dúvidas comuns
      </h2>
      <div className="space-y-3">
        {[
          {
            q: 'Estou desempregada. Posso receber?',
            a: 'Pode, se ainda estiver no prazo de proteção do INSS, chamado de período de graça. Em geral, ele dura 12 meses depois do último emprego e pode chegar a 3 anos em alguns casos.',
          },
          { q: 'Por quanto tempo eu recebo?', a: 'Em regra, por 120 dias, cerca de 4 meses.' },
          { q: 'Meu bebê já nasceu. Ainda dá tempo?', a: 'Em regra, sim, se a criança tem menos de 5 anos.' },
          {
            q: 'Qual é o valor?',
            a: 'Depende do seu caso. Para quem trabalhou registrada ou pagou o INSS, o valor é calculado pelas contribuições. Para quem trabalha no campo, é de um salário mínimo.',
          },
          {
            q: 'O INSS negou meu pedido. E agora?',
            a: 'Dá para recorrer no próprio INSS ou entrar na Justiça. A equipe analisa o motivo da negativa.',
          },
          { q: 'Preciso sair de casa?', a: 'Não. O atendimento é pelo WhatsApp e você assina tudo pelo celular.' },
          { q: 'Meus dados ficam protegidos?', a: 'Sim. Tudo o que você contar é protegido pelo sigilo profissional e usado só para cuidar do seu pedido.' },
        ].map((faq) => (
          <details key={faq.q} className="group bg-white rounded-2xl border-2 border-brand-100">
            <summary className="flex justify-between items-center gap-4 min-h-[64px] px-5 py-4 cursor-pointer font-bold text-lg text-brand-900 hover:bg-brand-50 rounded-2xl list-none">
              {faq.q}
              <ChevronRight className="group-open:rotate-90 transition-transform text-brand-600 shrink-0" aria-hidden="true" />
            </summary>
            <p className="px-5 pb-5 text-lg text-gray-800 leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-6 text-base text-gray-700 text-center">Regras do salário-maternidade: Lei 8.213/1991, artigos 71 a 73.</p>
    </div>
  </section>
);

const FinalCta = () => {
  const openFunnel = useOpenFunnel();

  return (
    <section className="px-4 sm:px-6 pb-20" aria-labelledby="cta-titulo">
      <div className="max-w-5xl mx-auto bg-brand-700 rounded-[40px] px-6 py-14 sm:p-16 text-center text-white">
        <h2 id="cta-titulo" className="font-serif text-3xl sm:text-5xl font-semibold mb-4">
          Descubra agora se você tem direito
        </h2>
        <p className="text-lg sm:text-xl text-white mb-8 max-w-xl mx-auto">
          Faça o teste e continue a conversa com a gente pelo WhatsApp.
        </p>
        <button
          type="button"
          onClick={() => openFunnel('cta_final')}
          className="min-h-[60px] bg-white text-brand-800 hover:bg-brand-50 px-10 rounded-2xl font-bold text-xl transition-colors inline-flex items-center gap-2"
        >
          Fazer o teste <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-brand-100 pt-12 pb-28 md:pb-12">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
      <Logo />
      <div className="text-base text-gray-700 space-y-1 md:text-right">
        {BRAND_NAME && <p className="font-bold text-brand-900">{BRAND_NAME}</p>}
        {OAB_INFO && <p>{OAB_INFO}</p>}
        <p>Atendimento on-line em todo o Brasil</p>
        <p>Informações protegidas por sigilo profissional.</p>
      </div>
    </div>
  </footer>
);

// Botão flutuante: também leva ao teste. Só aparece depois do topo, para não cobrir a foto e a pergunta.
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
      className="fixed bottom-5 right-5 z-50 min-h-[56px] flex items-center gap-2 bg-whatsapp hover:bg-whatsapp-dark text-white pl-4 pr-5 rounded-full font-bold text-lg shadow-xl"
    >
      <MessageCircle size={24} aria-hidden="true" />
      Fazer o teste
    </motion.button>
  );
};

export default function App() {
  return (
    <FunnelProvider>
      <div className="font-sans selection:bg-brand-200 selection:text-brand-900">
        <SkipLink />
        <Header />
        <main>
          <Hero />
          <TrustBar />
          <WhoCanReceive />
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
