import React, { useState } from 'react';
import { AlertTriangle, MessageSquareText, Plus } from 'lucide-react';
import type { Task, TaskActivity } from '../../types';
import { addTaskActivity } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

export const TaskQuickActivity: React.FC<{task: Task; onHistory: () => void}> = ({task,onHistory}) => {
  const {profile} = useAuth();
  const [type,setType] = useState<'observation'|'pending'>('observation');
  const [value,setValue] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const activity = [...(task.activity || [])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const pending = activity.filter((entry)=>entry.kind === 'pending' && !entry.resolved).length;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!profile || !value.trim() || busy)return;
    const item: TaskActivity = {
      id: crypto.randomUUID(),kind:type,text:value.trim(),authorId:profile.uid,
      authorName:profile.name,createdAt:new Date().toISOString(),resolved:false,
    };
    setBusy(true);setError('');
    try { await addTaskActivity(task.id,item);setValue(''); }
    catch { setError('Não foi possível registrar. Verifique a conexão.'); }
    finally { setBusy(false); }
  };
  return <section className="min-h-0 flex-1 flex flex-col rounded-lg border border-slate-200 bg-white px-3 py-2.5">
    <div className="flex items-center justify-between gap-1 mb-2">
      <div className="inline-flex gap-1.5 items-center min-w-0">
        <MessageSquareText className="w-4 h-4 text-blue-700" />
        <strong className="text-xs text-slate-800">Observações e pendências</strong>
        {pending > 0 && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">{pending} aberta(s)</span>}
      </div>
      <button type="button" onClick={onHistory} className="text-[11px] text-blue-700 font-bold shrink-0">Histórico ({activity.length})</button>
    </div>
    <form onSubmit={(event)=>void save(event)} className="flex-1 min-h-0 flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <button type="button" onClick={()=>setType('observation')} className={`rounded px-2 py-1 text-[10px] font-bold ${type==='observation'?'bg-blue-700 text-white':'bg-slate-100 text-slate-600'}`}>Observação</button>
        <button type="button" onClick={()=>setType('pending')} className={`rounded px-2 py-1 text-[10px] font-bold ${type==='pending'?'bg-amber-600 text-white':'bg-slate-100 text-slate-600'}`}>Pendência</button>
      </div>
      <div className="flex flex-1 min-h-0 gap-2 items-stretch">
        <label htmlFor="task-quick-activity" className="sr-only">Escrever observação ou pendência</label>
        <textarea id="task-quick-activity" value={value} onChange={(e)=>setValue(e.target.value)}
          maxLength={1500} rows={2} placeholder="Registrar o que foi feito ou o que está pendente..."
          className="min-w-0 min-h-[64px] h-full flex-1 resize-none rounded-md border border-slate-200 p-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"/>
        <button type="submit" disabled={busy || !profile || !value.trim()}
          className="self-end inline-flex items-center gap-1 rounded-md bg-[#004e9a] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">
          <Plus className="h-3.5 w-3.5"/> {busy?'Salvando':'Registrar'}
        </button>
      </div>
    </form>
    {error && <p role="alert" className="text-[11px] text-rose-700 mt-1">{error}</p>}
    {activity.length>0 && <button type="button" onClick={onHistory} className="min-w-0 text-left text-[11px] text-slate-600 mt-2 truncate hover:text-blue-700">
      <span className={activity[0].kind === 'pending' ? 'text-amber-700' : 'text-blue-700'}>
        {activity[0].kind==='pending' ? <AlertTriangle className="w-3 h-3 inline"/> : <MessageSquareText className="w-3 h-3 inline"/>}
      </span> <strong>{activity[0].authorName}:</strong> {activity[0].text}
    </button>}
  </section>;
};
