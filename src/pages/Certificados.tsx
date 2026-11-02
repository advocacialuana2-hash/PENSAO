import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { api, type Certificado } from "../api.ts";
import { Erro, Titulo } from "../components/ui.tsx";
import { data } from "../rotulos.ts";
import { useEu } from "../App.tsx";

interface Usuario { id: number; nome: string; ativo: number }

export default function Certificados() {
  const eu = useEu();
  const [lista, setLista] = useState<Certificado[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pfx, setPfx] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => api.get<Certificado[]>("/certificados").then(setLista), []);
  useEffect(() => {
    void carregar();
    api.get<Usuario[]>("/usuarios").then((u) => setUsuarios(u.filter((x) => x.ativo)));
  }, [carregar]);

  const importar = async () => {
    setErro(null);
    const fd = new FormData();
    fd.append("pfx", pfx!);
    fd.append("senha", senha);
    try {
      await api.form("/certificados", fd);
      setPfx(null);
      setSenha("");
      void carregar();
    } catch (e) {
      setErro((e as Error).message);
    }
  };

  const tentar = async (fn: () => Promise<unknown>) => {
    setErro(null);
    try { await fn(); void carregar(); } catch (e) { setErro((e as Error).message); }
  };

  const podeGerir = (c: Certificado) => eu.papel === "admin" || c.dono_id === eu.id;

  return (
    <>
      <Titulo sub="Certificados A1 guardados cifrados (AES-256-GCM). O arquivo e a senha nunca saem do servidor.">Certificados</Titulo>
      <Erro msg={erro} />
      {eu.papel !== "administrativo" && (
        <div className="card mb-6 max-w-2xl space-y-3">
          <h2 className="font-semibold text-marca-900">Importar certificado A1 (.pfx / .p12)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="input text-xs" type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={(e) => setPfx(e.target.files?.[0] ?? null)} />
            <input className="input" type="password" autoComplete="off" placeholder="Senha do certificado" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <p className="text-xs text-slate-500">Ao importar, você passa a ser o responsável por este certificado e decide quem pode usá-lo. Certificado A3 (token/cartão) não pode ser guardado no servidor.</p>
          <button className="btn-primario" disabled={!pfx || !senha} onClick={importar}><ShieldCheck className="h-4 w-4" /> Importar</button>
        </div>
      )}
      <div className="space-y-3">
        {lista.map((c) => {
          const vencido = new Date(c.valido_ate) < new Date();
          return (
            <div key={c.id} className={`card ${!c.ativo ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-marca-900">{c.titular} {c.documento && <span className="font-mono text-xs text-slate-500">· {c.documento}</span>}</div>
                  <div className="text-xs text-slate-500">
                    {c.emissor} · série {c.serial} · válido de {data(c.valido_de)} até <b className={vencido ? "text-red-600" : ""}>{data(c.valido_ate)}</b> · responsável: {c.dono_nome}
                  </div>
                  {!c.ativo && <div className="text-xs font-semibold text-red-600">Desativado (material apagado)</div>}
                </div>
                {c.ativo && podeGerir(c) && (
                  <button className="btn-perigo text-xs" onClick={() => confirm("Desativar apaga definitivamente o certificado do cofre. Continuar?") && tentar(() => api.post(`/certificados/${c.id}/desativar`))}>Desativar</button>
                )}
              </div>
              {c.ativo ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs font-semibold uppercase text-slate-500">Pode usar:</span>
                  {c.acessos.map((a) => (
                    <span key={a.usuario_id} className="inline-flex items-center gap-1 rounded-full bg-marca-50 px-2.5 py-0.5 text-xs text-marca-700">
                      {a.nome}
                      {podeGerir(c) && a.usuario_id !== c.dono_id && (
                        <button aria-label={`Revogar ${a.nome}`} onClick={() => tentar(() => api.del(`/certificados/${c.id}/acessos/${a.usuario_id}`))}><X className="h-3 w-3" /></button>
                      )}
                    </span>
                  ))}
                  {podeGerir(c) && (
                    <select className="input w-48 py-1 text-xs" value="" onChange={(e) => e.target.value && tentar(() => api.post(`/certificados/${c.id}/acessos`, { usuario_id: Number(e.target.value) }))}>
                      <option value="">+ Delegar a…</option>
                      {usuarios.filter((u) => !c.acessos.some((a) => a.usuario_id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                    </select>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-slate-500">Nenhum certificado no cofre.</p>}
      </div>
    </>
  );
}
