/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Users, 
  MessageCircle, 
  Scale, 
  AlertCircle, 
  TrendingUp, 
  FileText, 
  Gavel,
  ChevronRight,
  Star,
  Lock,
  Zap,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';

// --- Components ---

const Navbar = () => {
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent("Olá, gostaria de saber mais sobre pensão alimentícia.")}`;
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-brand-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-brand-600 w-8 h-8" />
            <span className="text-2xl font-serif font-bold text-brand-900">Help <span className="text-brand-600">Pensão Alimentícia</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#dor" className="hover:text-brand-600 transition-colors">O Problema</a>
            <a href="#escritorio" className="hover:text-brand-600 transition-colors">O Escritório</a>
            <a href="#servicos" className="hover:text-brand-600 transition-colors">Serviços</a>
            <a href="#faq" className="hover:text-brand-600 transition-colors">Dúvidas</a>
          </div>
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-all shadow-lg shadow-brand-200 flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Falar com Especialista
          </a>
        </div>
      </div>
    </nav>
  );
};

const Hero = () => {
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent("Olá, gostaria de saber mais sobre pensão alimentícia.")}`;

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-brand-50 rounded-l-[100px] opacity-50 hidden lg:block" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-700 text-sm font-bold mb-6">
              <Zap size={16} />
              Ação Imediata e Estratégica
            </div>
            <h1 className="text-5xl lg:text-7xl font-serif font-bold text-brand-900 leading-tight mb-6">
              Seu filho tem direito à pensão. E você não precisa <span className="text-brand-600">lutar sozinha.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-xl">
              O <strong>Help Pensão Alimentícia</strong> nasceu para garantir que a justiça seja feita. Atuação ágil, humanizada e focada em resultados reais para sua família.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-brand-200 flex items-center justify-center gap-2 group"
              >
                Resolver minha pensão hoje
                <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative flex justify-center"
          >
            <div className="relative z-10 w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border-8 border-white">
              <img 
                src="https://lh3.googleusercontent.com/d/1TbTVGQ5GKs117C9XbhWJffnVm9j8y3LF" 
                alt="Mãe e Filho"
                className="w-full h-auto"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 z-20 glass-card p-6 rounded-3xl max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 p-2 rounded-full">
                  <ShieldCheck className="text-green-600" size={24} />
                </div>
                <span className="font-bold text-brand-900">Direito Garantido</span>
              </div>
              <p className="text-xs text-gray-500">O <strong>Help Pensão Alimentícia</strong> cuida de tudo para você.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const PainPoints = () => (
  <section id="dor" className="py-24 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-4">Você não está sozinha</h2>
        <h3 className="text-4xl font-serif font-bold text-brand-900 mb-6">O descaso não pode vencer</h3>
        <p className="text-lg text-gray-600 italic leading-relaxed">
          "Sabemos que por trás de cada processo existe uma mãe exausta, lutando contra atrasos, valores insuficientes e a dificuldade de comprovar a real renda do pai. No <strong>Help Pensão Alimentícia</strong>, transformamos sua indignação em justiça."
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: AlertCircle, title: "Pai que não paga", desc: "Cansada de promessas vazias e desculpas para não cumprir com o dever básico?" },
          { icon: TrendingUp, title: "Valor Insuficiente", desc: "A pensão atual não cobre nem metade dos gastos reais da criança?" },
          { icon: Clock, title: "Atrasos Constantes", desc: "Viver na incerteza de quando (ou se) o dinheiro vai cair na conta?" },
          { icon: FileText, title: "Renda Oculta", desc: "Ele ostenta nas redes sociais mas diz ao juiz que não tem dinheiro?" }
        ].map((item, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-brand-50"
          >
            <div className="bg-brand-50 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
              <item.icon className="text-brand-600" size={28} />
            </div>
            <h4 className="text-xl font-bold text-brand-900 mb-3">{item.title}</h4>
            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const OfficePresentation = () => {
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent("Olá, gostaria de saber mais sobre pensão alimentícia.")}`;

  return (
    <section id="escritorio" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-brand-50 p-12 rounded-[60px] border border-brand-100 relative">
              <div className="absolute -top-6 -right-6 bg-brand-600 text-white p-6 rounded-3xl shadow-xl">
                <div className="text-3xl font-bold">+10k</div>
                <div className="text-xs uppercase tracking-wider font-medium">Atuações</div>
              </div>
              <h3 className="text-3xl font-serif font-bold text-brand-900 mb-6">Especialistas em Direito de Família</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                O <strong>Help Pensão Alimentícia</strong> é um escritório focado exclusivamente em garantir o bem-estar dos seus filhos. Nossa atuação é pautada no atendimento humanizado, onde cada caso é tratado com a seriedade e a urgência que merece.
              </p>
              <ul className="space-y-4">
                {[
                  "Atendimento 100% humanizado e acolhedor",
                  "Especialização total em Direito de Família",
                  "Agilidade no protocolo de ações judiciais",
                  "Equipe com mais de 10.000 atuações de sucesso"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-brand-900 font-medium">
                    <CheckCircle2 className="text-brand-600" size={20} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-4">O Escritório</h2>
            <h3 className="text-4xl lg:text-5xl font-serif font-bold text-brand-900 mb-8">Justiça ágil para quem tem <span className="text-brand-600">pressa</span></h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Não somos apenas advogados. Somos o seu suporte jurídico estratégico. No <strong>Help Pensão Alimentícia</strong>, entendemos que a fome e as necessidades do seu filho não esperam. Por isso, nossa prioridade é a rapidez e a eficiência.
            </p>
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-600 font-bold hover:gap-4 transition-all"
            >
              Conheça nossa forma de atuar <ChevronRight />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

const Services = () => (
  <section id="servicos" className="py-24 bg-gray-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-4">Nossas Soluções</h2>
        <h3 className="text-4xl font-serif font-bold text-brand-900">Como o <span className="text-brand-600">Help Pensão Alimentícia</span> te ajuda</h3>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[
          { 
            title: "Ação de Pensão Alimentícia", 
            desc: "Fixação inicial do valor da pensão. Indicado quando não há acordo ou decisão judicial.",
            urgency: "Possibilidade de liminar imediata."
          },
          { 
            title: "Revisão de Pensão", 
            desc: "Ajuste do valor atual. Indicado quando os gastos aumentaram ou o pai passou a ganhar mais.",
            urgency: "Análise rápida de provas de renda."
          },
          { 
            title: "Execução de Pensão", 
            desc: "Cobrança de valores não pagos. Indicado para quem está com a pensão em atraso.",
            urgency: "Risco de prisão para o devedor."
          },
          { 
            title: "Pensão Atrasada", 
            desc: "Recuperação de valores retroativos. Indicado para garantir o que não foi pago no passado.",
            urgency: "Bloqueio de bens e contas."
          },
          { 
            title: "Fixação de Alimentos", 
            desc: "Garantia de sustento provisório. Indicado para casos de extrema urgência alimentar.",
            urgency: "Decisão judicial em poucos dias."
          },
          { 
            title: "Defesa / Exoneração", 
            desc: "Consultoria em casos de disputa. Indicado para garantir que a lei seja aplicada corretamente.",
            urgency: "Acompanhamento processual diário."
          }
        ].map((service, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl border border-brand-50 shadow-sm hover:shadow-md transition-all">
            <div className="bg-brand-50 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Gavel className="text-brand-600" size={24} />
            </div>
            <h4 className="text-xl font-bold text-brand-900 mb-3">{service.title}</h4>
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{service.desc}</p>
            <div className="pt-4 border-t border-brand-50">
              <p className="text-xs font-bold text-brand-600 flex items-center gap-2">
                <Zap size={14} />
                {service.urgency}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SocialProof = () => (
  <section className="py-24">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-4">Resultados Reais</h2>
        <h3 className="text-4xl font-serif font-bold text-brand-900">Casos resolvidos pelo <span className="text-brand-600">Help Pensão Alimentícia</span></h3>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {[
          { name: "M. S.", text: "O pai do meu filho escondia a renda, mas o escritório conseguiu provar a ostentação dele. Hoje meu filho recebe o valor justo." },
          { name: "C. R.", text: "Eu não recebia nada há 6 meses. Com a execução, em menos de 15 dias o valor foi depositado. Excelente trabalho!" },
          { name: "J. L.", text: "A revisão de pensão foi muito rápida. O valor dobrou porque conseguimos provar as novas necessidades da minha filha." }
        ].map((t, i) => (
          <div key={i} className="bg-brand-50/50 p-8 rounded-3xl border border-brand-100">
            <div className="flex text-yellow-400 mb-4">
              {[1,2,3,4,5].map(star => <Star key={star} size={16} fill="currentColor" />)}
            </div>
            <p className="text-gray-700 italic mb-6 leading-relaxed">"{t.text}"</p>
            <div className="font-bold text-brand-900">— {t.name}</div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section className="py-24 bg-brand-900 text-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-brand-300 font-bold tracking-widest uppercase text-sm mb-4">Passo a Passo</h2>
        <h3 className="text-4xl font-serif font-bold">Como garantimos seu direito</h3>
      </div>
      <div className="grid md:grid-cols-5 gap-8 relative">
        {[
          { step: "01", title: "Atendimento Imediato", desc: "Conversa inicial para entender seu caso." },
          { step: "02", title: "Análise do Caso", desc: "Nossos especialistas estudam as provas." },
          { step: "03", title: "Entrada da Ação", desc: "Protocolo imediato na justiça." },
          { step: "04", title: "Acompanhamento", desc: "Monitoramento diário do processo." },
          { step: "05", title: "Resultado", desc: "Direito garantido e paz recuperada." }
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-6">
              {item.step}
            </div>
            <h4 className="font-bold mb-2">{item.title}</h4>
            <p className="text-brand-200 text-xs leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const FAQ = () => (
  <section id="faq" className="py-24">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h2 className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-4">Dúvidas Frequentes</h2>
        <h3 className="text-4xl font-serif font-bold text-brand-900">Tire suas dúvidas</h3>
      </div>
      <div className="space-y-4">
        {[
          { q: "Quanto tempo demora?", a: "Depende do caso, mas em situações de urgência pedimos liminares que podem ser decididas em poucos dias." },
          { q: "Preciso de advogado?", a: "Sim, para ações de pensão alimentícia a representação por um advogado especializado é indispensável." },
          { q: "E se ele não pagar?", a: "Entramos com a execução de pensão, que pode levar ao bloqueio de contas e até à prisão do devedor." },
          { q: "Posso pedir revisão?", a: "Sim! Sempre que houver mudança na necessidade da criança ou na possibilidade do pai." },
          { q: "Como comprovar renda?", a: "Utilizamos extratos, sinais de ostentação em redes sociais e outras ferramentas de investigação." },
          { q: "Dá pra entrar com urgência?", a: "Sim, o Help Pensão Alimentícia foca em pedidos de liminar para garantir o sustento imediato." }
        ].map((faq, i) => (
          <details key={i} className="group bg-white rounded-2xl border border-brand-100 overflow-hidden">
            <summary className="flex justify-between items-center p-6 cursor-pointer font-bold text-brand-900 hover:bg-brand-50 transition-colors list-none">
              {faq.q}
              <ChevronRight className="group-open:rotate-90 transition-transform text-brand-600" />
            </summary>
            <div className="p-6 pt-0 text-gray-600 text-sm leading-relaxed border-t border-brand-50">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = () => {
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent("Olá, gostaria de saber mais sobre pensão alimentícia.")}`;

  return (
    <section id="contato" className="py-24 bg-brand-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-brand-600 font-bold tracking-widest uppercase text-sm mb-4">Atendimento Imediato</h2>
        <h3 className="text-5xl font-serif font-bold text-brand-900 mb-8">Garanta o direito do seu filho <span className="text-brand-600">hoje.</span></h3>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Não espere mais. Cada dia sem a pensão correta é um prejuízo para o futuro do seu filho. O <strong>Help Pensão Alimentícia</strong> está pronto para te ajudar agora mesmo.
        </p>
        <div className="flex flex-col items-center gap-6">
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-brand-600 hover:bg-brand-700 text-white px-12 py-6 rounded-2xl font-bold text-xl transition-all shadow-2xl shadow-brand-200 flex items-center gap-3 group"
          >
            Iniciar atendimento agora
            <ChevronRight className="group-hover:translate-x-1 transition-transform" />
          </a>
          <div className="flex flex-col sm:flex-row gap-6 text-brand-900 font-bold">
            <div className="flex items-center gap-2">
              <Lock className="text-brand-600" size={20} />
              Atendimento 100% Sigiloso
            </div>
            <div className="flex items-center gap-2">
              <Users className="text-brand-600" size={20} />
              Nossa equipe entrará em contato
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-brand-100 pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
        <div className="flex items-center gap-2">
          <HelpCircle className="text-brand-600 w-8 h-8" />
          <span className="text-2xl font-serif font-bold text-brand-900">Help <span className="text-brand-600">Pensão Alimentícia</span></span>
        </div>
        <div className="text-center md:text-right">
          <p className="text-sm text-gray-500 font-medium">Atuação Nacional e Online</p>
          <p className="text-xs text-gray-400 mt-2">OAB/SP 000.000</p>
        </div>
      </div>
      <div className="border-t border-brand-50 pt-8 text-center">
        <p className="text-xs text-gray-400 mb-2">Aviso de Confidencialidade: Todas as informações compartilhadas são protegidas por sigilo profissional.</p>
        <p className="text-xs text-gray-400">© 2026 Help Pensão Alimentícia. Todos os direitos reservados.</p>
      </div>
    </div>
  </footer>
);

export default function App() {
  const whatsappUrl = `https://wa.me/5511999999999?text=${encodeURIComponent("Olá, gostaria de saber mais sobre pensão alimentícia.")}`;

  return (
    <div className="font-sans selection:bg-brand-200 selection:text-brand-900">
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <OfficePresentation />
        <Services />
        <SocialProof />
        <HowItWorks />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
      
      {/* Floating WhatsApp Button with Face */}
      <div className="fixed bottom-8 right-8 z-50">
        <motion.a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ y: 0 }}
          animate={{ 
            y: [0, -20, 0],
            scale: [1, 1.05, 1]
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-4 bg-[#25D366] text-white pl-4 pr-8 py-3 rounded-full font-bold shadow-2xl hover:bg-[#20ba5a] transition-all group"
        >
          {/* Face/Avatar */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg shrink-0">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop" 
              alt="Especialista" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider opacity-80 leading-none mb-1">Online agora</span>
            <span className="text-lg leading-none">Falar com Especialista</span>
          </div>

          {/* WhatsApp Icon Overlay */}
          <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md">
            <div className="bg-[#25D366] rounded-full p-1">
              <MessageCircle size={16} className="text-white" />
            </div>
          </div>
        </motion.a>
      </div>
    </div>
  );
}
