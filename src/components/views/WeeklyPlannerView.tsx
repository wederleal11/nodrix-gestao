import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
} from 'lucide-react';
import type { Task, WeeklyEvent, UserProfile, Project } from '../../types';
import { formatDateBR, isOverdue } from '../../utils/formatters';
import { deleteWeeklyEvent } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface WeeklyPlannerViewProps {
  tasks: Task[];
  events: WeeklyEvent[];
  projects: Project[];
  users: UserProfile[];
  onOpenTask: (task: Task) => void;
  onAddTask: () => void;
  onAddEvent: (dateStr?: string) => void;
}

export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  tasks,
  events,
  projects,
  users,
  onOpenTask,
  onAddTask,
  onAddEvent,
}) => {
  const { profile } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showWeekend, setShowWeekend] = useState(false);

  // Calculate Monday date of the target week in SP timezone
  const weekDates = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday + weekOffset * 7);

    const dates: { dateStr: string; dayName: string; formatted: string; isToday: boolean }[] = [];
    const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dates.push({
        dateStr,
        dayName: dayNames[i],
        formatted: `${d.getDate()}/${d.getMonth() + 1}`,
        isToday: dateStr === todayStr,
      });
    }

    return dates;
  }, [weekOffset]);

  const displayedDates = showWeekend ? weekDates : weekDates.slice(0, 5);

  const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Excluir este compromisso?')) {
      await deleteWeeklyEvent(eventId);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. RELACIONA FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Week navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="font-bold text-xs text-slate-800 px-2">
            {weekDates[0]?.formatted} a {weekDates[6]?.formatted} ({weekOffset === 0 ? 'Semana Atual' : weekOffset > 0 ? `+${weekOffset} sem` : `${weekOffset} sem`})
          </span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-blue-600 font-semibold hover:underline ml-2"
            >
              Semana Atual
            </button>
          )}
        </div>

        {/* Right: User selector, weekend toggle and actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 border border-blue-200 bg-blue-50 rounded-md text-blue-800 font-semibold">
            Minha agenda: {profile?.name || 'Minha conta'}
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 text-xs">
            <input
              type="checkbox"
              checked={showWeekend}
              onChange={(e) => setShowWeekend(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded"
            />
            <span>Fim de semana</span>
          </label>

          <button
            onClick={() => onAddEvent()}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md transition-colors flex items-center gap-1 text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Evento na agenda
          </button>

          <button
            onClick={onAddTask}
            className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Nova demanda
          </button>
        </div>
      </div>

      {/* 2. CALENDAR COLUMNS */}
      <div className={`grid grid-cols-1 ${showWeekend ? 'md:grid-cols-7' : 'md:grid-cols-5'} gap-3 items-start`}>
        {displayedDates.map((col) => {
          const dayTasks = tasks.filter((t) => {
            if (t.deadline !== col.dateStr) return false;
            if (!profile?.uid || t.assigneeId !== profile.uid) return false;
            return true;
          });

          const dayEvents = events.filter((ev) => {
            if (ev.date !== col.dateStr) return false;
            if (!profile?.uid || !ev.assigneeIds?.includes(profile.uid)) return false;
            return true;
          });

          return (
            <div
              key={col.dateStr}
              className={`bg-[#edf2f7] rounded-lg border overflow-hidden flex flex-col min-h-[550px] shadow-2xs ${
                col.isToday ? 'border-blue-500' : 'border-slate-200'
              }`}
            >
              {/* Header */}
              <div
                className={`px-3 py-2.5 flex items-center justify-between text-xs font-bold uppercase select-none ${
                  col.isToday ? 'bg-[#0066cc] text-white' : 'bg-slate-700 text-white'
                }`}
              >
                <span>{col.dayName}</span>
                <span className="text-[11px] opacity-90">{col.formatted}</span>
              </div>

              {/* Items Container */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-250px)]">
                {/* Events */}
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="bg-white rounded p-2.5 border-l-4 border-l-[#5b52f9] border border-slate-200 text-xs shadow-2xs space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-indigo-600 font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {ev.time || 'Dia todo'}
                      </span>
                      <button
                        onClick={(e) => handleDeleteEvent(ev.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="font-bold text-slate-900 leading-tight">{ev.title}</p>
                    {ev.projectName && (
                      <p className="text-[10px] text-slate-500">{ev.projectName}</p>
                    )}
                  </div>
                ))}

                {/* Tasks */}
                {dayTasks.map((t) => {
                  const late = isOverdue(t.deadline, t.status);

                  return (
                    <div
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      className={`bg-white rounded p-2.5 border border-slate-200 hover:border-slate-400 hover:shadow-2xs transition-all cursor-pointer space-y-1.5 border-l-4 ${
                        t.priority === 'P0' ? 'border-l-red-600' : 'border-l-blue-600'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`px-1.5 py-0.2 font-extrabold rounded ${
                            t.priority === 'P0' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                          }`}
                        >
                          {t.priority}
                        </span>
                        <span className="text-slate-400 truncate max-w-[80px]">{t.projectName}</span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                        {t.title}
                      </h4>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                        <span className="truncate max-w-[80px]">{t.assigneeName || 'Não atribuído'}</span>
                        <span className={late ? 'text-red-600 font-bold' : ''}>
                          {t.status === 'completed' ? 'Validada' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {dayTasks.length === 0 && dayEvents.length === 0 && (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Sem compromissos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
