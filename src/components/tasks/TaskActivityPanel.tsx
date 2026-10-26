import React, { useState } from 'react';
import { CheckCircle2, MessageSquareText, Plus, AlertTriangle } from 'lucide-react';
import type { Task, TaskActivity } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { addTaskActivity, resolveTaskPending } from '../../services/db';

export const TaskActivityPanel: React.FC<{ task: Task }> = ({ task }) => {
  const { profile } = useAuth();
  const [type, setType] = useState<'observation' | 'pending'>('observation');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const items = [...(task.activity || [])].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  const unresolved = items.filter((x) => x.kind === 'pending' && !x.resolved).length;
  const maxPage = Math.max(0, Math.ceil(items.length / 3) - 1);
  const current = Math.min(page, maxPage);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !value.trim() || busy) return;
    if (value.trim().length > 1500) { setError('Limite de 1.500 caracteres.'); return; }
    setError('');
    setBusy(true);
    const item: TaskActivity = {
      id: crypto.randomUUID(),
      kind: type, text: value.trim(), authorId: profile.uid,
      authorName: profile.name, createdAt: new Date().toISOString(), resolved: false,
    };
    try {
      await addTaskActivity(task.id, item);
      setValue('');
      setPage(0);
    } catch {
      setError('Não foi possível salvar o registro. Confira sua conexão e tente novamente.');
    } finally { setBusy(false); }
  };
  const finish = async (id: string) => {
    if (!profile || busy) return;
    setBusy(true); setError('');
    try { await resolveTaskPending(task.id, id, profile.uid); }
    catch { setError('Não foi possível resolver a pendência. Tente novamente.'); }
    finally { setBusy(false); }
  };
  return <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
    <form onSubmit={save} className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setType('observation')}
          className={`text-xs px-3 py-2 rounded-md font-bold ${type === 'observation' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <MessageSquareText className="w-3.5 h-3.5 inline mr-1" /> Observação
        </button>
        <button type="button" onClick={() => setType('pending')}
          className={`text-xs px-3 py-2 rounded-md font-bold ${type === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Pendência
        </button>
      </div>
      <label htmlFor="task-activity-text" className="block font-semibold text-xs text-slate-700">
        {type === 'pending' ? 'O que está pendente?' : 'Registrar atualização da demanda'}
      </label>
      <textarea id="task-activity-text" rows={3} maxLength={1500} value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={type === 'pending' ? 'Descreva o que falta resolver...' : 'O que foi feito, observado ou combinado...'}
        className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none resize-none" />
      <div className="flex justify-between items-center gap-2">
        <span className="text-[11px] text-slate-500">{value.length}/1500</span>
        <button disabled={!value.trim() || busy || !profile} type="submit"
          className="bg-[#004e9a] hover:bg-blue-700 text-white px-3 py-2 rounded-md text-xs font-bold disabled:opacity-40">
          <Plus className="w-3 h-3 inline mr-1" /> {busy ? 'Salvando...' : 'Registrar'}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </form>
    <section className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50 min-h-[230px]">
      <header className="flex items-center justify-between">
        <strong className="text-xs text-slate-800">Histórico ({items.length})</strong>
        <span className={`text-[11px] font-bold ${unresolved ? 'text-amber-700' : 'text-emerald-700'}`}>{unresolved} pendência(s) aberta(s)</span>
      </header>
      {items.length === 0 && <p className="text-slate-500 text-xs py-8 text-center">Sem registros. Adicione a primeira observação ou pendência.</p>}
      {items.slice(current * 3, (current + 1) * 3).map((item) => <div key={item.id}
        className="rounded-md bg-white border border-slate-200 p-2.5 flex gap-2">
        <span className={`mt-0.5 shrink-0 ${item.kind === 'pending' ? 'text-amber-600' : 'text-blue-600'}`}>
          {item.kind === 'pending' ? <AlertTriangle className="w-4 h-4" /> : <MessageSquareText className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between gap-2 text-[10px] text-slate-500">
            <span className="font-semibold">{item.authorName}</span>
            <time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time>
          </div>
          <p className={`whitespace-pre-wrap break-words text-xs mt-1 ${item.resolved ? 'text-slate-500' : 'text-slate-800'}`}>{item.text}</p>
          {item.kind === 'pending' && (item.resolved
            ? <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-1 mt-1"><CheckCircle2 className="w-3 h-3" /> Resolvida</span>
            : <button type="button" disabled={busy} onClick={() => void finish(item.id)} className="text-[10px] font-bold text-blue-700 mt-1 disabled:opacity-50">Marcar resolvida</button>)}
        </div>
      </div>)}
      {maxPage > 0 && <nav className="flex items-center justify-end gap-2 text-[11px]" aria-label="Páginas do histórico">
        <button disabled={!current} onClick={() => setPage(current - 1)} className="disabled:opacity-30 text-blue-700">Anterior</button>
        <span>{current + 1}/{maxPage + 1}</span>
        <button disabled={current === maxPage} onClick={() => setPage(current + 1)} className="disabled:opacity-30 text-blue-700">Próxima</button>
      </nav>}
    </section>
  </div>;
};
