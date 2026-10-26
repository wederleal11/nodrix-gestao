import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Expand, X } from 'lucide-react';
import type { ChecklistItem } from '../../types';

interface Props {
  items: ChecklistItem[];
  onToggle: (id: string) => Promise<void>;
  disabled?: boolean;
  error?: string;
}

export const TaskChecklistPanel: React.FC<Props> = ({ items, onToggle, disabled, error }) => {
  const [expanded, setExpanded] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const completed = items.filter((item) => item.done).length;

  useEffect(() => {
    if (!expanded) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [expanded]);

  const toggle = async (id: string) => {
    if (pendingId || disabled) return;
    setPendingId(id);
    try { await onToggle(id); }
    finally { setPendingId(null); }
  };

  const checklist = (full: boolean) => (
    <div className={full
      ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 space-y-1'
      : 'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 space-y-1'}>
      {items.length === 0 && <p className="text-xs text-slate-500 py-4">Nenhuma etapa cadastrada.</p>}
      {items.map((item) => (
        <label key={item.id} className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
          <input
            type="checkbox"
            checked={item.done}
            disabled={disabled || pendingId !== null}
            onChange={() => void toggle(item.id)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600 cursor-pointer disabled:opacity-60"
          />
          <span className={`text-xs leading-5 break-words ${item.done ? 'line-through text-slate-500' : 'text-slate-800'}`}>{item.text}</span>
        </label>
      ))}
    </div>
  );

  return <>
    <section className="min-h-0 h-full flex flex-col rounded-lg border border-slate-200 bg-white p-3">
      <header className="flex items-center justify-between gap-2 pb-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0"/>
          <strong className="text-xs text-slate-900">Checklist ({completed}/{items.length})</strong>
        </div>
        <button type="button" onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md text-blue-700 hover:bg-blue-50"
          title="Abrir checklist completo">
          <Expand className="w-3.5 h-3.5"/> Ver mais
        </button>
      </header>
      {error && <p role="alert" className="text-[11px] text-rose-700 mb-1">{error}</p>}
      {checklist(false)}
    </section>
    {expanded && createPortal(<div className="fixed inset-0 z-[90] flex items-center justify-center p-3 bg-black/70" role="presentation">
      <section role="dialog" aria-modal="true" aria-label="Checklist completo"
        className="flex flex-col w-full max-w-2xl max-h-[88dvh] bg-white rounded-xl shadow-2xl overflow-hidden">
        <header className="bg-[#0e213e] text-white px-5 py-4 flex items-center justify-between shrink-0">
          <strong>Checklist completo · {completed}/{items.length}</strong>
          <button type="button" onClick={() => setExpanded(false)} aria-label="Voltar para a demanda"
            className="p-1 rounded hover:bg-white/10"><X className="w-5 h-5"/></button>
        </header>
        <div className="flex flex-col min-h-0 p-4 flex-1">
          {error && <p role="alert" className="text-xs text-rose-700 mb-2">{error}</p>}
          {checklist(true)}
        </div>
        <footer className="border-t border-slate-200 px-5 py-3 text-right shrink-0">
          <button type="button" onClick={() => setExpanded(false)}
            className="rounded-lg bg-[#004e9a] px-4 py-2 text-xs font-bold text-white">Voltar à demanda</button>
        </footer>
      </section>
    </div>, document.body)}
  </>;
};
