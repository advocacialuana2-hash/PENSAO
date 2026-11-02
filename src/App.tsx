import { useEffect, useState, createContext, useContext } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { FileUp, FileStack, Gauge, ListChecks, LogOut, ScrollText, Settings, ShieldCheck, Scale } from "lucide-react";
import { api, type Eu } from "./api.ts";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Distribuicao from "./pages/Distribuicao.tsx";
import Manifestacao from "./pages/Manifestacao.tsx";
import Fila from "./pages/Fila.tsx";
import PeticaoDetalhe from "./pages/PeticaoDetalhe.tsx";
import Lote from "./pages/Lote.tsx";
import Auditoria from "./pages/Auditoria.tsx";
import Certificados from "./pages/Certificados.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";

const EuContext = createContext<Eu | null>(null);
export const useEu = () => useContext(EuContext)!;

const MENU = [
  { to: "/", rotulo: "Painel", icone: Gauge, end: true },
  { to: "/distribuicao", rotulo: "Distribuição", icone: FileUp },
  { to: "/manifestacao", rotulo: "Manifestação", icone: FileStack },
  { to: "/fila", rotulo: "Fila", icone: ListChecks },
  { to: "/certificados", rotulo: "Certificados", icone: ShieldCheck },
  { to: "/auditoria", rotulo: "Auditoria", icone: ScrollText, papeis: ["admin", "advogado"] },
  { to: "/configuracoes", rotulo: "Configurações", icone: Settings },
];

export default function App() {
  const [eu, setEu] = useState<Eu | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname === "/login") { setEu(null); return; }
    api.get<Eu>("/eu").then(setEu).catch(() => setEu(null));
  }, []);

  if (eu === undefined) return <div className="p-10 text-slate-500">Carregando…</div>;

  return (
    <Routes>
      <Route path="/login" element={<Login onEntrar={() => api.get<Eu>("/eu").then((u) => { setEu(u); navigate("/"); })} />} />
      <Route
        path="/*"
        element={
          eu ? (
            <EuContext.Provider value={eu}>
              <Layout eu={eu} />
            </EuContext.Provider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function Layout({ eu }: { eu: Eu }) {
  const sair = async () => {
    await api.post("/logout");
    location.href = "/login";
  };
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-marca-900 text-slate-200 md:w-60">
        <div className="flex items-center gap-2 px-5 py-5">
          <Scale className="h-6 w-6 text-ouro" />
          <div>
            <div className="font-serif text-lg font-bold text-white">Office LA</div>
            <div className="text-xs text-slate-400">Peticionamento</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {MENU.filter((m) => !m.papeis || m.papeis.includes(eu.papel)).map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              className={({ isActive }) =>
                `flex items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm ${isActive ? "bg-marca-700 text-white" : "hover:bg-marca-700/50"}`
              }
            >
              <m.icone className="h-4 w-4" />
              {m.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 px-5 py-4 text-sm md:block">
          <div className="font-medium text-white">{eu.nome}</div>
          <div className="text-xs capitalize text-slate-400">{eu.papel}</div>
          <button onClick={sair} className="mt-3 flex items-center gap-2 text-xs text-slate-300 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {eu.simulacao && (
          <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-bold text-amber-950">
            MODO SIMULAÇÃO ATIVO — o adaptador "simulado" não envia nada ao tribunal
          </div>
        )}
        <div className="mx-auto max-w-6xl p-4 md:p-8">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="distribuicao" element={<Distribuicao />} />
            <Route path="manifestacao" element={<Manifestacao />} />
            <Route path="fila" element={<Fila />} />
            <Route path="peticoes/:id" element={<PeticaoDetalhe />} />
            <Route path="lotes/:id" element={<Lote />} />
            <Route path="certificados" element={<Certificados />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
