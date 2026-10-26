import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Expand, X } from 'lucide-react';
import type { Task } from '../../types';

export type TaskTextSection = 'description' | 'expectedResult' | 'acceptanceCriteria';

const sectionLabels: Record<TaskTextSection, string> = {
  description: 'Descrição da demanda',
  expectedResult: 'Resultado esperado',
  acceptanceCriteria: 'Critérios de aceite',
};

const sectionTone: Record<TaskTextSection, string> = {
  description: 'border-slate-200 bg-slate-50',
  expectedResult: 'border-blue-200 bg-blue-50/50',
  acceptanceCriteria: 'border-emerald-200 bg-emerald-50/50',
};

interface PreviewProps {
  section: TaskTextSection;
  value?: string;
  onExpand: (section: TaskTextSection) => void;
}

/** All clamped fields expose a visible, keyboard-accessible route to their full text. */
export const TaskTextPreview: React.FC<PreviewProps> = ({ section, value, onExpand }) => {
  const description = section === 'description';
  const text = value?.trim() || (section === 'expectedResult'
    ? 'Não definido'
    : section === 'acceptanceCriteria' ? 'Não definidos' : 'Sem descrição cadastrada.');

  return (
    <section className={`min-w-0 shrink-0 rounded-lg border ${description ? 'border-slate-200 bg-slate-50 px-3 py-2' : `px-3 py-2.5 ${sectionTone[section]}`}`}>
      <header className={`flex items-center justify-between gap-2 ${description ? 'mb-0.5' : 'mb-1'}`}>
        <strong className={`text-[11px] font-bold uppercase ${section === 'expectedResult' ? 'text-blue-700' : section === 'acceptanceCriteria' ? 'text-emerald-700' : 'text-slate-600'}`}>
          {sectionLabels[section]}
        </strong>
        <button type="button" onClick={() => onExpand(section)}
          aria-label={`Ver texto completo: ${sectionLabels[section]}`}
          className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <Expand className="h-3 w-3" aria-hidden="true" /> Ver mais
        </button>
      </header>
      <p className={`whitespace-pre-line break-words text-xs text-slate-800 ${description ? 'line-clamp-2' : 'line-clamp-3'}`}>
        {text}
      </p>
    </section>
  );
};

interface DetailsProps {
  task: Task;
  initialSection: TaskTextSection;
  onClose: () => void;
}

/** Dedicated complete-text view. A long field scrolls only inside this dialog. */
export const TaskTextDetailsModal: React.FC<DetailsProps> = ({ task, initialSection, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const order: TaskTextSection[] = [
    initialSection,
    ...(['description', 'expectedResult', 'acceptanceCriteria'] as TaskTextSection[])
      .filter((field) => field !== initialSection),
  ];

  return createPortal(
    <div role="presentation" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="task-full-details-title"
        className="flex max-h-[90dvh] min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 bg-[#0e213e] px-5 py-4 text-white">
          <div className="min-w-0">
            <h2 id="task-full-details-title" className="text-base font-bold">Informações completas da demanda</h2>
            <p className="mt-1 truncate text-xs text-slate-300" title={task.title}>{task.title}</p>
          </div>
          <button type="button" ref={closeRef} onClick={onClose}
            aria-label="Fechar detalhes e voltar para a demanda"
            className="shrink-0 rounded-md p-1 text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-slate-50 p-4 sm:p-5">
          {order.map((section) => {
            const value = task[section]?.trim();
            return (
              <article key={section}
                className={`rounded-lg border px-4 py-3 ${sectionTone[section]} ${section === initialSection ? 'ring-1 ring-blue-300' : ''}`}>
                <h3 className="mb-2 text-xs font-bold uppercase text-slate-800">{sectionLabels[section]}</h3>
                <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-slate-800">
                  {value || 'Não informado.'}
                </p>
              </article>
            );
          })}
        </div>
        <footer className="flex shrink-0 justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
          <span className="self-center text-[11px] text-slate-500">Conteúdo completo, sem cortes</span>
          <button type="button" onClick={onClose}
            className="rounded-lg bg-[#004e9a] px-4 py-2 text-xs font-bold text-white hover:bg-blue-800">
            Voltar à demanda
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};
