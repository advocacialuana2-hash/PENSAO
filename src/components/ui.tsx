import type { ReactNode } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { STATUS } from "../rotulos.ts";

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? { rotulo: status, cor: "bg-slate-100" };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cor}`}>{s.rotulo}</span>;
}

export function SeloIa({ titulo }: { titulo?: string }) {
  return (
    <span title={titulo ?? "Preenchido pela IA — confira"} className="inline-flex items-center gap-1 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">
      <Sparkles className="h-3 w-3" /> IA
    </span>
  );
}

export function Titulo({ children, sub, acoes }: { children: ReactNode; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl font-bold text-marca-900">{children}</h1>
        {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Erro({ msg, itens }: { msg: string | null; itens?: string[] }) {
  if (!msg) return null;
  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> {msg}</div>
      {itens && itens.length > 0 && <ul className="ml-6 mt-1 list-disc">{itens.map((i) => <li key={i}>{i}</li>)}</ul>}
    </div>
  );
}

export function Campo({ rotulo, ia, trecho, children }: { rotulo: string; ia?: boolean; trecho?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <label>{rotulo}</label>
        {ia && <SeloIa titulo={trecho ? `Trecho: "${trecho}"` : undefined} />}
      </div>
      {children}
      {ia && trecho && <p className="truncate text-xs italic text-slate-400" title={trecho}>“{trecho}”</p>}
    </div>
  );
}

export function SoltarArquivos({ onArquivos, multiplo = true, aceitar = "application/pdf", texto }: { onArquivos: (f: File[]) => void; multiplo?: boolean; aceitar?: string; texto: string }) {
  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onArquivos(Array.from(e.dataTransfer.files).filter((f) => !aceitar || aceitar.split(",").some((a) => f.type === a.trim() || f.name.endsWith(a.trim()))));
      }}
      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 hover:border-marca-500 hover:bg-marca-50"
    >
      <span className="font-medium text-slate-700">{texto}</span>
      <span className="mt-1 text-xs">Arraste aqui ou clique para escolher</span>
      <input type="file" className="hidden" multiple={multiplo} accept={aceitar} onChange={(e) => { onArquivos(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
  );
}

export const tamanho = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);
