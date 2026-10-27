import React, { useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import type { Task } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { updateTaskDeadline } from '../../services/db';
import { validateDeadlineRevision } from '../../utils/taskDeadline';
import { formatDateBR } from '../../utils/formatters';

interface Props { task: Task; onClose: () => void; }
export const TaskDeadlineQuickEdit: React.FC<Props> = ({ task, onClose }) => {
  const { profile } = useAuth();
  const [date, setDate] = useState(task.deadline || '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const existing = Boolean(task.deadline);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateDeadlineRevision(task.deadline || '', date, reason);
    if (invalid) { setError(invalid); return; }
    if (!profile || profile.status !== 'active') { setError('Faça login com uma conta ativa.'); return; }
    setSaving(true);
    setError('');
    try {
      await updateTaskDeadline(task.id, date, reason, {
        id: profile.uid, name: profile.name, email: profile.email,
      }, task.deadline || '');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('outro usuário') ? 'O prazo foi alterado por outra pessoa. Feche e abra novamente.' :
        message.includes('justificativa') ? 'Informe a justificativa para alterar o prazo.' :
        'Não foi possível salvar o prazo. Confira a conexão e tente novamente.');
    } finally { setSaving(false); }
  };

  return <div role="presentation" className="fixed inset-0 z-[100] bg-black/55 flex items-center justify-center p-3"
    onMouseDown={e => { if (e.target === e.currentTarget && !saving) onClose(); }}>
    <form role="dialog" aria-modal="true" aria-labelledby="quick-deadline-title"
      onSubmit={submit} className="w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
      <header className="bg-[#0e213e] text-white px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="quick-deadline-title" className="text-sm font-bold inline-flex items-center gap-1.5"><CalendarDays className="w-4 h-4"/> Alterar prazo</h2>
          <p className="mt-1 text-xs text-slate-200 truncate" title={task.title}>{task.title}</p>
        </div>
        <button type="button" disabled={saving} onClick={onClose} aria-label="Fechar" className="p-1 text-slate-300 hover:text-white">
          <X className="w-4 h-4"/>
        </button>
      </header>
      <div className="p-4 space-y-3 text-xs">
        <div className="text-slate-600">Prazo atual: <strong className="text-slate-900">{task.deadline ? formatDateBR(task.deadline) : 'Não definido'}</strong></div>
        <label className="block font-semibold text-slate-700">
          Novo prazo <span className="text-rose-600">*</span>
          <input autoFocus required type="date" value={date} onChange={e => { setDate(e.target.value); setError(''); }}
            className="block mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"/>
        </label>
        {existing && <label className="block font-semibold text-slate-700">
          Motivo da alteração <span className="text-rose-600">*</span>
          <input required type="text" minLength={5} maxLength={200} value={reason}
            onChange={e => { setReason(e.target.value); setError(''); }}
            placeholder="Ex.: Dependência ainda não concluída"
            className="block mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 font-normal"/>
          <span className="mt-1 block text-[11px] font-normal text-slate-500">O prazo original será mantido no histórico.</span>
        </label>}
        {error && <p role="alert" className="rounded-md bg-rose-50 border border-rose-200 p-2 text-rose-700">{error}</p>}
      </div>
      <footer className="border-t border-slate-200 px-4 py-3 flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">Cancelar</button>
        <button type="submit" disabled={saving || !date || date === task.deadline}
          className="rounded-md bg-[#004e9a] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar prazo'}
        </button>
      </footer>
    </form>
  </div>;
};
