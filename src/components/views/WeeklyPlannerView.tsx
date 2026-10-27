import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Columns3,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Link2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { Task, WeeklyEvent, UserProfile, Project } from '../../types';
import { formatDateBR, isOverdue } from '../../utils/formatters';
import { MonthlyPlannerCalendar } from './MonthlyPlannerCalendar';
import { localDateKey, monthAtOffset, monthHeading, weekDatesForOffset } from '../../utils/calendarMonth';
import { deleteWeeklyEvent } from '../../services/db';
import { authorizeGoogleCalendar, fetchGoogleCalendar } from '../../services/googleCalendar';
import { monthGrid } from '../../utils/calendarMonth';
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
  const { profile, firebaseUser, googleCalendarToken: googleToken, setGoogleCalendarToken } = useAuth();
  // Historical team members were seeded with placeholder UIDs. Only link an
  // alias if its email matches the signed-in Google identity exactly.
  const myAccountIds = useMemo(() => {
    const ids = new Set<string>();
    if (!firebaseUser?.uid || !firebaseUser.email) return ids;
    ids.add(firebaseUser.uid);
    const email = firebaseUser.email.toLowerCase();
    users.filter((user) => user.email.toLowerCase() === email).forEach((user) => ids.add(user.uid));
    return ids;
  }, [firebaseUser?.uid, firebaseUser?.email, users]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [showWeekend, setShowWeekend] = useState(false);
  // Only the signed-in user can authorize the Google events rendered here.
  // Token is owned by AuthContext so toggling pages does not require consent again.
  const [googleEvents, setGoogleEvents] = useState<WeeklyEvent[]>([]);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);

  const targetMonth = useMemo(() => monthAtOffset(monthOffset), [monthOffset]);
  const personalTasks = useMemo(() =>
    tasks.filter(task => Boolean(profile?.uid && myAccountIds.has(task.assigneeId || ''))),
    [tasks, myAccountIds, profile?.uid]);
  const personalEvents = useMemo(() =>
    events.filter(event => Boolean(profile?.uid && event.assigneeIds?.some(id => myAccountIds.has(id)))),
    [events, myAccountIds, profile?.uid]);
  const changePeriod = (delta: number) => {
    if (viewMode === 'week') {
      setWeekOffset(current => current + delta);
    } else {
      const offset = monthOffset + delta;
      const nextMonth = monthAtOffset(offset);
      setMonthOffset(offset);
      setSelectedDate(localDateKey(nextMonth));
    }
  };
  const navigateToday = () => {
    setWeekOffset(0);
    setMonthOffset(0);
    setSelectedDate(localDateKey(new Date()));
  };

  // Local day headings and task date strings must agree, including at 23:59.
  const weekDates = useMemo(() => weekDatesForOffset(weekOffset), [weekOffset]);

  const displayedDates = showWeekend ? weekDates : weekDates.slice(0, 5);
  const range = useMemo(() => {
    if (viewMode === 'month') {
      const dates = monthGrid(targetMonth);
      const end = new Date(dates[dates.length - 1]);
      end.setDate(end.getDate() + 1);
      return { from: localDateKey(dates[0]), until: localDateKey(end) };
    }
    const end = new Date(weekDates[6].dateStr + 'T12:00:00');
    end.setDate(end.getDate() + 1);
    return { from: weekDates[0].dateStr, until: localDateKey(end) };
  }, [targetMonth, weekDates, viewMode]);
  const unifiedEvents = useMemo(() =>
    [...personalEvents, ...googleEvents].sort((a, b) =>
      a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title)),
    [personalEvents, googleEvents]);

  useEffect(() => {
    if (!googleToken || !firebaseUser?.uid || profile?.status !== 'active') return;
    const controller = new AbortController();
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleEvents([]);
    fetchGoogleCalendar(googleToken, range.from, range.until, firebaseUser.uid, controller.signal)
      .then(items => { if (!controller.signal.aborted) setGoogleEvents(items); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setGoogleEvents([]);
          setGoogleError(error instanceof Error ? error.message : 'Não foi possível carregar a agenda Google.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setGoogleLoading(false); });
    return () => controller.abort();
  }, [googleToken, range.from, range.until, firebaseUser?.uid, profile?.status]);

  const connectGoogle = async () => {
    if (!firebaseUser || profile?.status !== 'active') return;
    setGoogleConnecting(true);
    setGoogleError(null);
    try {
      // User gesture triggers a fresh explicit Google consent dialog.
      const token = await authorizeGoogleCalendar(firebaseUser);
      setGoogleCalendarToken(token);
    } catch (error: unknown) {
      setGoogleError(error instanceof Error ? error.message : 'Não foi possível conectar ao Google.');
    } finally {
      setGoogleConnecting(false);
    }
  };

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
            onClick={() => changePeriod(-1)}
            className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="font-bold text-xs text-slate-800 px-2">
            {viewMode === 'month' ? monthHeading(targetMonth) :
              `${weekDates[0]?.formatted} a ${weekDates[6]?.formatted} (${weekOffset === 0 ? 'Semana Atual' : weekOffset > 0 ? `+${weekOffset} sem` : `${weekOffset} sem`})`}
          </span>
          <button
            onClick={() => changePeriod(1)}
            className="p-1.5 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
          {(viewMode === 'month' ? monthOffset !== 0 : weekOffset !== 0) && (
            <button
              onClick={navigateToday}
              className="text-xs text-blue-600 font-semibold hover:underline ml-2"
            >
              Hoje
            </button>
          )}
        </div>

        {/* Right: User selector, weekend toggle and actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1.5 border border-blue-200 bg-blue-50 rounded-md text-blue-800 font-semibold">
            Minha agenda: {profile?.name || 'Minha conta'}
          </span>

          <button type="button" onClick={() => void connectGoogle()} disabled={googleConnecting}
            title="Autorizar leitura da sua agenda Google nesta sessão"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-slate-50 disabled:opacity-50">
            {googleConnecting || googleLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <Link2 className="h-3.5 w-3.5"/>}
            {googleToken ? 'Atualizar Google' : 'Conectar Google'}
          </button>
          <div role="group" aria-label="Visualização da agenda" className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button type="button" aria-pressed={viewMode === 'week'} onClick={() => setViewMode('week')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold ${viewMode === 'week' ? 'bg-[#0066cc] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
              <Columns3 className="w-3.5 h-3.5"/> Semana
            </button>
            <button type="button" aria-pressed={viewMode === 'month'} onClick={() => {
                setViewMode('month');
                if (weekOffset !== 0) {
                  const date = new Date(weekDates[0].dateStr + 'T12:00:00');
                  const base = new Date();
                  setMonthOffset((date.getFullYear()-base.getFullYear())*12 + date.getMonth()-base.getMonth());
                  setSelectedDate(weekDates[0].dateStr);
                }
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold ${viewMode === 'month' ? 'bg-[#0066cc] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
              <CalendarDays className="w-3.5 h-3.5"/> Mês
            </button>
          </div>
          {viewMode === 'week' && <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 text-xs">
            <input
              type="checkbox"
              checked={showWeekend}
              onChange={(e) => setShowWeekend(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 rounded"
            />
            <span>Fim de semana</span>
          </label>}

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

      {googleError && <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Google Agenda: {googleError}
        {googleToken && <button type="button" onClick={() => void connectGoogle()} className="ml-2 font-bold underline">Reconectar</button>}
      </div>}
      {/* 2. Optional monthly calendar or existing weekly columns. */}
      {viewMode === 'month' ? (
        <MonthlyPlannerCalendar month={targetMonth} selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          tasks={personalTasks} events={unifiedEvents}
          onOpenTask={onOpenTask} onAddEvent={onAddEvent}
          onDeleteEvent={handleDeleteEvent}/>
      ) : (
      <div className={`grid grid-cols-1 ${showWeekend ? 'md:grid-cols-7' : 'md:grid-cols-5'} gap-3 items-start`}>
        {displayedDates.map((col) => {
          const dayTasks = personalTasks.filter(task => task.deadline === col.dateStr);
          const dayEvents = unifiedEvents.filter(event => event.date === col.dateStr);

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
                      {ev.source === 'google' ? (
                        ev.googleHtmlLink && <a href={ev.googleHtmlLink} target="_blank" rel="noopener noreferrer"
                          aria-label="Abrir no Google Agenda" className="text-slate-400 hover:text-blue-700">
                          <ExternalLink className="w-3 h-3"/>
                        </a>
                      ) : (
                        <button onClick={(e) => handleDeleteEvent(ev.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3"/>
                        </button>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 leading-tight">{ev.title}</p>
                    {ev.source === 'google' && <span className="text-[10px] text-slate-500">Google</span>}
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
      )}
    </div>
  );
};
