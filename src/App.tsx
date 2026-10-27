/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Heart,
  HeartHandshake,
  Info,
  Lock,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FunnelProvider, useOpenFunnel } from './funnel/QuizFunnel';
import { WhatsAppIcon } from './funnel/WhatsAppIcon';
import { BRAND_NAME, SALARIO_MINIMO, SALARIO_MINIMO_ANO, VALOR_MINIMO_BENEFICIO, formatBRL } from './funnel/config';

// --- Seções ---

const SkipLink = () => (
  <a
    href="#comecar"
    className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:bg-white focus:text-brand-900 focus:px-5 focus:py-3 focus:rounded-xl focus:font-bold focus:shadow-lg"
  >
    Ir direto para a análise
  </a>
);

// Logo da G1 recriado em texto (preto e branco, como na página do Facebook).
const Logo = () => (
  <span className="flex items-center gap-2.5" aria-label={BRAND_NAME} role="img">
    <span className="w-11 h-11 rounded-full bg-white border-[3px] border-black flex items-center justify-center" aria-hidden="true">
      <span className="font-display text-lg font-extrabold text-black tracking-tighter leading-none">G1</span>
    </span>
    <span className="font-display font-extrabold text-black uppercase leading-[1.05] text-[0.8rem] sm:text-sm" aria-hidden="true">
      Auxílios
      <br />
      Previdenciários
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
          className="shrink-0 min-h-[48px] inline-flex items-center gap-2 bg-wa hover:bg-wa-hover text-wa-ink px-4 rounded-xl font-bold text-base shadow-md transition-colors"
        >
          <WhatsAppIcon size={22} />
          Iniciar análise
        </button>
      </div>
    </header>
  );
};

// Destaque em caixa magenta, como na referência.
const Mark = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-brand-700 text-white px-2 rounded-lg box-decoration-clone">{children}</span>
);

const Hero = () => {
  const openFunnel = useOpenFunnel();

  return (
    <section className="relative overflow-hidden" aria-labelledby="titulo-principal">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-peach blur-3xl opacity-80 -z-10" aria-hidden="true" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 rounded-full bg-sky blur-3xl opacity-80 -z-10" aria-hidden="true" />
      <motion.div
        className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-14 sm:pt-12 sm:pb-20 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto mb-4 w-32 h-32 sm:w-56 sm:h-56 sm:mb-6 rounded-full overflow-hidden border-[6px] border-white shadow-xl bg-brand-100">
          <picture>
            <source type="image/webp" srcSet="/img/gestante-600.webp 600w, /img/gestante-900.webp 900w" sizes="224px" />
            <img
              src="/img/gestante-600.jpg"
              width={600}
              height={800}
              alt="Gestante sorrindo, com a mão na barriga"
              fetchPriority="high"
              className="w-full h-full object-cover object-[50%_18%]"
            />
          </picture>
        </div>

        <p className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white shadow-md text-base sm:text-lg font-bold text-brand-900 mb-4 sm:mb-6">
          Mesmo <span className="text-brand-700">sem carteira assinada</span>
        </p>

        <h1 id="titulo-principal" className="font-display text-[1.75rem] sm:text-5xl font-extrabold text-brand-900 leading-[1.22] mb-4">
          Grávida ou o bebê já nasceu? <span className="text-brand-600">O salário-maternidade é de, no mínimo,</span>{' '}
          <Mark>{formatBRL(VALOR_MINIMO_BENEFICIO)}*</Mark>
        </h1>

        <p className="text-lg sm:text-xl text-gray-800 leading-relaxed mb-6 sm:mb-8">
          Responda <strong className="text-brand-900">4 perguntas</strong> e descubra na hora se você pode ter direito.
        </p>

        <button
          id="comecar"
          type="button"
          onClick={() => openFunnel('topo_botao')}
          className="w-full sm:w-auto min-h-[64px] px-10 inline-flex items-center justify-center gap-3 bg-wa hover:bg-wa-hover text-wa-ink rounded-2xl font-display font-bold text-xl uppercase tracking-wide shadow-xl shadow-green-900/20 transition-colors"
        >
          <WhatsAppIcon size={28} />
          Iniciar análise
        </button>
        <p className="mt-4 text-base text-gray-800">
          <strong className="text-brand-700">Leva 1 minuto</strong> e não tem compromisso. Nossa equipe fala com você pelo WhatsApp.
        </p>
        <p className="mt-6 text-sm sm:text-base text-gray-700">
          *Valor mínimo para quem tem direito: 4 meses de salário mínimo de {SALARIO_MINIMO_ANO} ({formatBRL(SALARIO_MINIMO)}).
          Constituição Federal, art. 201, § 2º.
        </p>
      </motion.div>
    </section>
  );
};

const Highlights = () => (
  <section className="bg-white border-y border-brand-100 py-14 sm:py-16" aria-labelledby="destaques-titulo">
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <h2 id="destaques-titulo" className="font-display text-[1.7rem] sm:text-4xl font-extrabold text-brand-900 leading-[1.3] mb-4">
        Ajudamos gestantes e mães a receber o que é <Mark>delas por lei</Mark>
      </h2>
      <p className="text-lg text-gray-800 leading-relaxed mb-8">
        A gente explica tudo com calma, sem palavras difíceis, e cuida do seu pedido do começo até a resposta do INSS.
      </p>
      <dl className="divide-y divide-brand-200">
        {[
          { value: '120 dias', label: 'de salário-maternidade pagos pelo INSS' },
          { value: '4 perguntas', label: 'para saber se você pode ter direito' },
          { value: '100% on-line', label: 'da análise à assinatura, tudo pelo celular' },
        ].map((item) => (
          <div key={item.value} className="py-6 flex flex-col-reverse">
            <dt className="text-lg text-gray-800 mt-1">{item.label}</dt>
            <dd className="font-display text-4xl sm:text-5xl font-extrabold text-brand-900">{item.value}</dd>
          </div>
        ))}
      </dl>
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
        <h2 id="quem-titulo" className="font-display text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-8">
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
            className="min-h-[60px] bg-wa hover:bg-wa-hover text-wa-ink px-8 rounded-2xl font-bold text-lg transition-colors inline-flex items-center gap-2 shadow-md"
          >
            <WhatsAppIcon size={24} /> Iniciar análise
          </button>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => (
  <section className="py-16 sm:py-20 bg-white" aria-labelledby="como-titulo">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <h2 id="como-titulo" className="font-display text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-10">
        Como funciona
      </h2>
      <ol className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Inicie a análise', desc: 'Toque no botão verde e responda 4 perguntas na conversa.' },
          { title: 'O escritório chama você', desc: 'Em breve, uma pessoa do escritório fala com você pelo WhatsApp e explica tudo.' },
          { title: 'A gente cuida do pedido', desc: 'Você assina pelo celular e a equipe faz o pedido no INSS.' },
        ].map((item, i) => (
          <li key={item.title} className="bg-cream rounded-[28px] p-7 border border-brand-100">
            <span className="w-12 h-12 rounded-full bg-brand-600 text-white font-display text-xl font-semibold flex items-center justify-center mb-4" aria-hidden="true">
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
      <h2 id="duvidas-titulo" className="font-display text-3xl sm:text-4xl font-semibold text-brand-900 text-center mb-8">
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
        <h2 id="cta-titulo" className="font-display text-3xl sm:text-5xl font-semibold mb-4">
          Descubra agora se você tem direito
        </h2>
        <p className="text-lg sm:text-xl text-white mb-8 max-w-xl mx-auto">
          Responda 4 perguntas e nossa equipe fala com você pelo WhatsApp.
        </p>
        <button
          type="button"
          onClick={() => openFunnel('cta_final')}
          className="min-h-[60px] bg-wa hover:bg-wa-hover text-wa-ink px-10 rounded-2xl font-bold text-xl transition-colors inline-flex items-center gap-2"
        >
          <WhatsAppIcon size={26} /> Iniciar análise
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
        <p className="font-bold text-brand-900">{BRAND_NAME}</p>
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
      className="fixed bottom-5 right-5 z-50 min-h-[56px] flex items-center gap-2 bg-wa hover:bg-wa-hover text-wa-ink pl-4 pr-5 rounded-full font-bold text-lg shadow-xl"
    >
      <WhatsAppIcon size={26} />
      Iniciar análise
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
          <Highlights />
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
