import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  Users,
  HeartHandshake,
  FileBarChart,
  ShieldCheck,
  LogOut,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  users: UserProfile[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  users,
}) => {
  const { profile, activeProfile, activeUserId, setActiveUserId, signOut, isAdmin } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'projects', label: 'Projetos', icon: FolderKanban },
    { id: 'tasks', label: 'Backlog & Tarefas', icon: CheckSquare },
    { id: 'planner', label: 'Minha Semana', icon: Calendar },
    { id: 'team', label: 'Equipe & Foco', icon: Users },
    { id: 'feedbacks', label: 'Feedbacks 1-on-1', icon: HeartHandshake },
    { id: 'reports', label: 'Relatórios', icon: FileBarChart },
    { id: 'audit', label: 'Auditoria', icon: ShieldCheck },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header / Branding */}
        <div>
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center font-extrabold text-white text-base shadow-xs">
                N
              </div>
              <div className="leading-tight">
                <span className="font-extrabold text-sm tracking-wider text-white">NODRIX</span>
                <span className="ml-1.5 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-widest bg-blue-900/60 text-blue-400 border border-blue-700/50 rounded">
                  GESTÃO
                </span>
                <p className="text-[10px] text-slate-400">Produtividade & Entregas</p>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & Perspective Switcher */}
        <div className="p-3 border-t border-slate-800/80 space-y-3 bg-slate-950/80">
          {/* Active Profile Card */}
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-md text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Operando como:
              </span>
              <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                activeProfile?.role === 'admin'
                  ? 'bg-blue-950 text-blue-400 border border-blue-800'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              }`}>
                {activeProfile?.role === 'admin' ? 'Gestor' : 'Dev'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {activeProfile?.name?.substring(0, 2) || 'US'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-white truncate text-xs">
                  {activeProfile?.name}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {activeProfile?.title || activeProfile?.email}
                </p>
              </div>
            </div>

            {/* Quick Multi-User Perspective Switcher (Critical for testing collaborator flow & self-approval prevention) */}
            {users.length > 1 && (
              <div className="pt-1 border-t border-slate-800">
                <label className="text-[10px] text-slate-400 block mb-1">
                  Alternar Usuário Ativo:
                </label>
                <select
                  value={activeUserId}
                  onChange={(e) => setActiveUserId(e.target.value)}
                  className="w-full px-2 py-1 text-[11px] bg-slate-950 border border-slate-700 rounded text-slate-200"
                >
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.role === 'admin' ? 'Gestor' : 'Dev'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Encerrar Sessão
          </button>
        </div>
      </aside>
    </>
  );
};
