import React, { useMemo } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Plus, Trash2 } from 'lucide-react';
import type { Task, WeeklyEvent } from '../../types';
import { formatDateBR, isOverdue } from '../../utils/formatters';
import { localDateKey, monthGrid, monthHeading } from '../../utils/calendarMonth';

interface Props {
  month: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasks: Task[];
  events: WeeklyEvent[];
  onOpenTask: (task: Task) => void;
  onAddEvent: (date: string) => void;
  onDeleteEvent: (id: string, event: React.MouseEvent) => void;
}

const DAY_NAMES = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

export const MonthlyPlannerCalendar: React.FC<Props> = ({
  month, selectedDate, onSelectDate, tasks, events, onOpenTask, onAddEvent, onDeleteEvent,
}) => {
  const dates = useMemo(() => monthGrid(month), [month]);
  const nowKey = localDateKey(new Date());
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (!task.deadline) return;
      const current = map.get(task.deadline) || [];
      current.push(task);
      map.set(task.deadline, current);
    });
    return map;
  }, [tasks]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, WeeklyEvent[]>();
    events.forEach((event) => {
      if (!event.date) return;
      const current = map.get(event.date) || [];
      current.push(event);
      map.set(event.date, current);
    });
    return map;
  }, [events]);
  const dayTasks = tasksByDay.get(selectedDate) || [];
  const dayEvents = [...(eventsByDay.get(selectedDate) || [])].sort(
    (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  const selectedLabel = formatDateBR(selectedDate);
  const totalItems = dayEvents.length + dayTasks.length;
  const completedTasks = dayTasks.filter((task) => task.status === 'completed').length;

  return <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_330px] gap-3 items-start min-h-0">
    <section aria-label={`Calendário de ${monthHeading(month)}`}
      className="min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-4 h-4 text-blue-700 shrink-0"/>
          <h2 className="text-sm font-bold text-slate-900 truncate">{monthHeading(month)}</h2>
        </div>
        <span className="text-[11px] text-slate-500 shrink-0">{tasks.filter(t => t.deadline?.startsWith(localDateKey(month).slice(0,7))).length} demandas com prazo</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
            {DAY_NAMES.map(name => <span key={name} className="px-1 py-2 text-center text-[10px] font-bold tracking-wide text-slate-600">{name}</span>)}
          </div>
          <div className="grid grid-cols-7">
            {dates.map((date) => {
              const key = localDateKey(date);
              const currentMonth = date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
              const isToday = key === nowKey;
              const chosen = key === selectedDate;
              const dueTasks = tasksByDay.get(key) || [];
              const scheduledEvents = eventsByDay.get(key) || [];
              const combined = dueTasks.length + scheduledEvents.length;
              const snippets = [
                ...scheduledEvents.map(event => ({
                  key: 'event-' + event.id, title: event.title, kind: 'event' as const,
                })),
                ...dueTasks.map(task => ({
                  key: 'task-' + task.id, title: task.title, kind: 'task' as const,
                })),
              ];
              return <button type="button" key={key} onClick={() => onSelectDate(key)}
                aria-label={`${formatDateBR(key)}, ${combined} compromissos`}
                aria-pressed={chosen}
                className={`group min-w-0 h-[100px] sm:h-[112px] xl:h-[116px] border-r border-b border-slate-200 p-1.5 sm:p-2 text-left flex flex-col gap-1 transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-blue-600 ${chosen ? 'bg-blue-50 ring-2 ring-inset ring-blue-500' : currentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/80 hover:bg-slate-100'}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[11px] font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-blue-600 text-white' : currentMonth ? 'text-slate-800' : 'text-slate-400'}`}>{date.getDate()}</span>
                  {combined > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">{combined}</span>}
                </div>
                <div className="space-y-0.5 w-full min-w-0">
                  {snippets.slice(0,2).map(item => (
                    <div key={item.key} title={item.title}
                      className={`truncate rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${item.kind === 'event' ? 'bg-violet-50 text-violet-700 border-l-2 border-violet-500' : 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'}`}>
                      {item.title}
                    </div>
                  ))}
                  {snippets.length > 2 && <span className="block text-[10px] font-bold text-slate-500 pl-1">+{snippets.length - 2} outros</span>}
                </div>
              </button>;
            })}
          </div>
        </div>
      </div>
    </section>

    <aside aria-label="Agenda do dia selecionado" className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden xl:sticky xl:top-3">
      <div className="bg-[#0e213e] text-white px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-cyan-200 font-bold">Agenda do dia</span>
          <span className="text-[11px] rounded-full bg-white/10 px-2 py-0.5">{totalItems} itens</span>
        </div>
        <h3 className="font-bold text-sm mt-1 capitalize">{selectedLabel}</h3>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-200 py-3">
        <div className="text-center">
          <div className="text-base font-bold text-slate-900">{dayTasks.length}</div><span className="text-[10px] text-slate-500">Demandas</span>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-slate-900">{dayEvents.length}</div><span className="text-[10px] text-slate-500">Eventos</span>
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-emerald-700">{completedTasks}</div><span className="text-[10px] text-slate-500">Concluídas</span>
        </div>
      </div>
      <div className="px-3 py-3 space-y-2 overflow-y-auto max-h-[min(65dvh,650px)] min-h-[180px]">
        {dayEvents.map(event => (
          <article key={event.id} className="group rounded-lg border border-slate-200 border-l-[3px] border-l-violet-600 p-3 bg-white">
            <div className="flex items-center justify-between gap-2 text-[10px] text-violet-700 font-semibold">
              <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3"/>{event.time || 'Dia todo'}</span>
              <button type="button" aria-label={`Excluir evento ${event.title}`} onClick={e => onDeleteEvent(event.id,e)}
                className="p-1 text-slate-400 hover:text-red-600" title="Excluir compromisso">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
            <strong className="block mt-1 text-xs text-slate-900 leading-snug">{event.title}</strong>
            {event.projectName && <p className="text-[10px] mt-1 text-slate-500 truncate">{event.projectName}</p>}
          </article>
        ))}
        {dayTasks.map(task => {
          const late = isOverdue(task.deadline, task.status);
          return <button type="button" key={task.id} onClick={() => onOpenTask(task)}
            className={`w-full text-left rounded-lg border border-slate-200 border-l-[3px] ${late ? 'border-l-red-500' : 'border-l-blue-600'} p-3 bg-white hover:bg-blue-50 hover:border-blue-300 transition-colors`}>
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className={`font-extrabold ${task.priority === 'P0' ? 'text-red-600' : 'text-blue-700'}`}>{task.priority} · Demanda</span>
              {task.status === 'completed'
                ? <span className="text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Concluída</span>
                : <span className={late ? 'text-red-600 font-semibold' : 'text-slate-500'}>{late ? 'Atrasada' : 'Pendente'}</span>}
            </div>
            <strong className="block mt-1 text-xs text-slate-900 leading-snug">{task.title}</strong>
            <span className="block mt-1 text-[10px] text-slate-500 truncate">{task.projectName}</span>
          </button>;
        })}
        {!totalItems && <div className="flex flex-col items-center justify-center gap-2 text-center py-8 text-slate-400">
          <CalendarDays className="w-6 h-6"/>
          <p className="text-xs">Nenhum compromisso neste dia.</p>
        </div>}
      </div>
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <button type="button" onClick={() => onAddEvent(selectedDate)}
          className="w-full rounded-md border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 font-bold text-xs px-3 py-2 inline-flex items-center justify-center gap-1.5">
          <Plus className="w-3.5 h-3.5"/> Evento neste dia
        </button>
      </div>
    </aside>
  </div>;
};
