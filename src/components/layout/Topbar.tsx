import React from 'react';
import { Menu, Plus, Calendar, Sun, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  currentView: string;
  onOpenMobileSidebar: () => void;
  onAddTask: () => void;
  onAddProject: () => void;
  onOpenDailyCheckin: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentView,
  onOpenMobileSidebar,
  onAddTask,
  onAddProject,
  onOpenDailyCheckin,
}) => {
  const { activeProfile, isAdmin } = useAuth();

  const getViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard Gerencial';
      case 'projects':
        return 'Projetos em Desenvolvimento';
      case 'tasks':
        return 'Backlog Geral & Tarefas';
      case 'planner':
        return 'Minha Semana & Agenda';
      case 'team':
        return 'Gestão de Pessoas & Foco';
      case 'feedbacks':
        return 'Acompanhamento Individual';
      case 'reports':
        return 'Relatórios de Produtividade';
      case 'audit':
        return 'Trilha de Auditoria';
      default:
        return 'Nodrix Gestão';
    }
  };

  const todayBR = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
      {/* Left side: Hamburger + View Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            {getViewTitle()}
          </h1>
          <p className="text-[11px] text-slate-400 capitalize hidden sm:block">
            {todayBR} · Fuso Oficial SP
          </p>
        </div>
      </div>

      {/* Right side: Quick Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDailyCheckin}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-100 transition-colors"
          title="Check-in Matinal ou Fechamento Diário"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Check-in Diário</span>
        </button>

        {isAdmin && (
          <button
            onClick={onAddProject}
            className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Projeto
          </button>
        )}

        <button
          onClick={onAddTask}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Demanda</span>
        </button>
      </div>
    </header>
  );
};
