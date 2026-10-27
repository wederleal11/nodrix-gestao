import type { PriorityLevel, TaskStatus, ProjectStatus } from '../types';
import { localDateKey } from './calendarMonth';

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeBR(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function isOverdue(deadline?: string, status?: TaskStatus): boolean {
  if (!deadline) return false;
  if (status === 'completed' || status === 'cancelled') return false;
  
  const today = localDateKey(new Date());
  return deadline < today;
}

export function getPriorityBadge(priority: PriorityLevel): { label: string; bg: string; text: string; border: string } {
  switch (priority) {
    case 'P0':
      return { label: 'P0 — Crítica', bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
    case 'P1':
      return { label: 'P1 — Alta', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case 'P2':
      return { label: 'P2 — Normal', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 'P3':
      return { label: 'P3 — Melhoria', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
    default:
      return { label: priority || 'P2', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}

export function getStatusBadge(status: TaskStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'backlog':
      return { label: 'Backlog', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
    case 'planned':
      return { label: 'Planejada', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 'in_progress':
      return { label: 'Em Andamento', bg: 'bg-sky-50 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-800' };
    case 'blocked':
      return { label: 'Bloqueada', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
    case 'awaiting_validation':
      return { label: 'Aguardando Validação', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' };
    case 'completed':
      return { label: 'Concluída & Validada', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case 'cancelled':
      return { label: 'Cancelada', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-700' };
    default:
      return { label: String(status).toUpperCase(), bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}

export function getProjectStatusBadge(status: ProjectStatus): { label: string; bg: string; text: string; border: string } {
  switch (status) {
    case 'Ativo':
      return { label: 'Ativo', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 'Planejamento':
      return { label: 'Planejamento', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
    case 'Bloqueado':
      return { label: 'Bloqueado', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
    case 'Em validação':
      return { label: 'Em Validação', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' };
    case 'Concluído':
      return { label: 'Concluído', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case 'Arquivado':
      return { label: 'Arquivado', bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', border: 'border-zinc-200 dark:border-zinc-700' };
    default:
      return { label: String(status), bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' };
  }
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const processRow = (row: (string | number)[]) => {
    return row.map((val) => {
      const stringVal = String(val ?? '');
      const escaped = stringVal.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(';');
  };

  const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(';'), ...rows.map(processRow)].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
