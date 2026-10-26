import React from 'react';
import { CalendarDays, FolderKanban } from 'lucide-react';
import type { UserProfile } from '../../types';
import { formatDateBR, isOverdue } from '../../utils/formatters';

export const TaskAvatar: React.FC<{
  user?: UserProfile;
  name?: string;
  size?: 'sm' | 'md';
}> = ({ user, name, size = 'sm' }) => {
  const label = user?.name || name || 'Não atribuído';
  const initials = label.trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('');
  const sizeClass = size === 'md' ? 'h-9 w-9 text-[12px]' : 'h-6 w-6 text-[9px]';
  return (
    <span title={label} className={`${sizeClass} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-blue-600 text-white font-extrabold`}>
      {user?.avatarUrl ? <img src={user.avatarUrl} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : initials || '?'}
    </span>
  );
};

const projectColors = ['bg-blue-600 text-white', 'bg-violet-700 text-white', 'bg-teal-700 text-white', 'bg-amber-600 text-white', 'bg-indigo-700 text-white'];
export const ProjectPill: React.FC<{ id: string; name: string }> = ({ id, name }) => {
  const value = [...id].reduce((acc, ch) => (acc + ch.charCodeAt(0)) % projectColors.length, 0);
  return <span title={name} className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold max-w-full ${projectColors[value]}`}>
    <FolderKanban className="w-3 h-3 shrink-0" /><span className="truncate">{name}</span>
  </span>;
};

export const DeadlinePill: React.FC<{ deadline?: string; status?: string }> = ({ deadline, status }) => {
  const late = isOverdue(deadline, status || '');
  return <span className={`inline-flex gap-1 items-center rounded-md border px-2 py-1 text-[11px] font-bold ${late
    ? 'bg-rose-600 border-rose-500 text-white'
    : deadline ? 'bg-amber-500/20 border-amber-400/60 text-amber-100' : 'bg-slate-700 border-slate-600 text-slate-100'}`}>
    <CalendarDays className="w-3.5 h-3.5" /> {deadline ? formatDateBR(deadline) : 'Sem prazo'}{late ? ' • ATRASADA' : ''}
  </span>;
};
