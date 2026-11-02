import { useEffect, useState } from "react";
import { api, type Adaptador, type Tribunal } from "../api.ts";
import { Erro, Titulo } from "../components/ui.tsx";
import { useEu } from "../App.tsx";

interface Usuario { id?: number; nome: string; email: string; papel: string; oab: string | null; ativo: number; senha?: string }

const TRIB_VAZIO: Partial<Tribunal> = { sigla: "", nome: "", sistema: "pje", adaptador: "manual", url_portal: "", ativo: 1 };
const USU_VAZIO: Usuario = { nome: "", email: "", papel: "advogado", oab: "", ativo: 1, senha: "" };

export default function Configuracoes() {
  const eu = useEu();
  const admin = eu.papel === "admin";
  const [tribunais, setTribunais] = useState<Tribunal[]>([]);
  const [adaptadores, setAdaptadores] = useState<Adaptador[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [trib, setTrib] = useState<Partial<Tribunal> | null>(null);
  const [usu, setUsu] = useState<Usuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ tribunais: Tribunal[]; adaptadores: Adaptador[] }>("/tribunais").then((r) => { setTribunais(r.tribunais); setAdaptadores(r.adaptadores); });
    api.get<Usuario[]>("/usuarios").then(setUsuarios);
  }, []);

  const salvarTrib = async () => {
    setErro(null);
    try { setTribunais(await api.post<Tribunal[]>("/tribunais", trib)); setTrib(null); } catch (e) { setErro((e as Error).message); }
  };
  const salvarUsu = async () => {
    setErro(null);
    try { setUsuarios(await api.post<Usuario[]>("/usuarios", usu)); setUsu(null); } catch (e) { setErro((e as Error).message); }
  };

  return (
    <>
      <Titulo sub={admin ? "Tribunais, adaptadores de protocolo e equipe" : "Somente administradores alteram estas configurações"}>Configurações</Titulo>
      <Erro msg={erro} />

      <section className="card mb-6">
        <div className="mb-3 flex items-center">
          <h2 className="font-semibold text-marca-900">Tribunais</h2>
          {admin && <button className="btn-secundario ml-auto text-xs" onClick={() => setTrib({ ...TRIB_VAZIO })}>Novo tribunal</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Sigla</th><th>Nome</th><th>Sistema</th><th>Adaptador</th><th>Portal</th><th /></tr></thead>
            <tbody>
              {tribunais.map((t) => (
                <tr key={t.id} className={t.ativo ? "" : "opacity-50"}>
                  <td className="font-semibold">{t.sigla}</td><td>{t.nome}</td><td className="uppercase">{t.sistema}</td>
                  <td>{t.adaptador}</td><td className="max-w-[12rem] truncate text-xs">{t.url_portal}</td>
                  <td>{admin && <button className="text-xs text-marca-600 hover:underline" onClick={() => setTrib(t)}>Editar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {trib && (
          <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <input className="input" placeholder="Sigla (ex.: TJGO)" value={trib.sigla ?? ""} onChange={(e) => setTrib({ ...trib, sigla: e.target.value })} />
            <input className="input sm:col-span-2" placeholder="Nome" value={trib.nome ?? ""} onChange={(e) => setTrib({ ...trib, nome: e.target.value })} />
            <select className="input" value={trib.sistema} onChange={(e) => setTrib({ ...trib, sistema: e.target.value })}>
              <option value="pje">PJe</option><option value="eproc">eProc</option><option value="projudi">Projudi</option><option value="outro">Outro</option>
            </select>
            <select className="input" value={trib.adaptador} onChange={(e) => setTrib({ ...trib, adaptador: e.target.value })}>
              {adaptadores.map((a) => <option key={a.chave} value={a.chave}>{a.chave} — {a.descricao}</option>)}
            </select>
            <input className="input" placeholder="URL do portal" value={trib.url_portal ?? ""} onChange={(e) => setTrib({ ...trib, url_portal: e.target.value })} />
            <label className="flex items-center gap-2"><input type="checkbox" checked={trib.ativo !== 0} onChange={(e) => setTrib({ ...trib, ativo: e.target.checked ? 1 : 0 })} /> Ativo</label>
            <div className="flex gap-2 sm:col-span-2 sm:justify-end">
              <button className="btn-secundario" onClick={() => setTrib(null)}>Cancelar</button>
              <button className="btn-primario" onClick={salvarTrib}>Salvar</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="mb-3 flex items-center">
          <h2 className="font-semibold text-marca-900">Equipe</h2>
          {admin && <button className="btn-secundario ml-auto text-xs" onClick={() => setUsu({ ...USU_VAZIO })}>Novo usuário</button>}
        </div>
        <p className="mb-3 text-xs text-slate-500">Administrativo prepara e revisa; advogado e administrador também enviam para a fila. Desativar um usuário revoga todas as delegações de certificado dele.</p>
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>OAB</th><th /></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.ativo ? "" : "opacity-50"}>
                  <td>{u.nome}</td><td>{u.email}</td><td className="capitalize">{u.papel}</td><td>{u.oab ?? "—"}</td>
                  <td>{admin && <button className="text-xs text-marca-600 hover:underline" onClick={() => setUsu({ ...u, senha: "" })}>Editar</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usu && (
          <div className="mt-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <input className="input" placeholder="Nome" value={usu.nome} onChange={(e) => setUsu({ ...usu, nome: e.target.value })} />
            <input className="input" type="email" placeholder="E-mail" value={usu.email} onChange={(e) => setUsu({ ...usu, email: e.target.value })} />
            <select className="input" value={usu.papel} onChange={(e) => setUsu({ ...usu, papel: e.target.value })}>
              <option value="advogado">Advogado</option><option value="administrativo">Administrativo</option><option value="admin">Administrador</option>
            </select>
            <input className="input" placeholder="OAB (ex.: GO 12.345)" value={usu.oab ?? ""} onChange={(e) => setUsu({ ...usu, oab: e.target.value })} />
            <input className="input" type="password" autoComplete="new-password" placeholder={usu.id ? "Nova senha (opcional)" : "Senha inicial (mín. 10)"} value={usu.senha ?? ""} onChange={(e) => setUsu({ ...usu, senha: e.target.value })} />
            <label className="flex items-center gap-2"><input type="checkbox" checked={usu.ativo !== 0} onChange={(e) => setUsu({ ...usu, ativo: e.target.checked ? 1 : 0 })} /> Ativo</label>
            <div className="flex gap-2 sm:col-span-3 sm:justify-end">
              <button className="btn-secundario" onClick={() => setUsu(null)}>Cancelar</button>
              <button className="btn-primario" onClick={salvarUsu}>Salvar</button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
