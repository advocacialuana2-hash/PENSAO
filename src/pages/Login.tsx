import { useState, type FormEvent } from "react";
import { Scale } from "lucide-react";
import { api } from "../api.ts";
import { Erro } from "../components/ui.tsx";

export default function Login({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await api.post("/login", { email, senha });
      onEntrar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-marca-900 p-4">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow-xl">
        <div className="flex items-center gap-2">
          <Scale className="h-7 w-7 text-ouro" />
          <div>
            <div className="font-serif text-xl font-bold text-marca-900">Office LA</div>
            <div className="text-xs text-slate-500">L.A. Advogados Associados</div>
          </div>
        </div>
        <Erro msg={erro} />
        <div className="space-y-1">
          <label htmlFor="email">E-mail</label>
          <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="senha">Senha</label>
          <input id="senha" className="input" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <button className="btn-primario w-full" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
      </form>
    </div>
  );
}
