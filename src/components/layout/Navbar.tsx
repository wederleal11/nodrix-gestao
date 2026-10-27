import React, { useEffect, useState } from 'react';
import {
  User,
  LogOut,
  ChevronDown,
  Settings,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserProfile } from '../../types';

interface NavbarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  users: UserProfile[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  users,
}) => {
  const { profile, activeProfile, activeUserId, setActiveUserId, signOut, isAdmin, isSuperAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (activeUserId && users.some((user) => user.uid === activeUserId && user.status !== 'active')) {
      setActiveUserId(profile?.uid || '');
    }
  }, [activeUserId, users, profile?.uid, setActiveUserId]);

  // Executive Top Bar Navigation
  const navItems = [
    { id: 'dashboard', label: 'Visão geral' },
    { id: 'projects', label: 'Projetos' },
    { id: 'tasks', label: 'Demandas' },
    { id: 'planner', label: 'Minha Semana' },
    { id: 'team', label: 'Equipe' },
    ...(isAdmin ? [{ id: 'feedbacks', label: 'Feedbacks' }] : []),
    { id: 'reports', label: 'Relatórios' },
    { id: 'settings', label: 'Configurações' },
  ];

  return (
    <header className="bg-[#0b1b33] text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Left: Brand Logo + Nav Links */}
        <div className="flex items-center gap-6 xl:gap-8 overflow-x-auto no-scrollbar">
          {/* Logo with Nodrix style */}
          <div
            onClick={() => onSelectView('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none py-1"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 via-cyan-500 to-blue-600 flex items-center justify-center shadow-xs">
              <span className="font-black text-white text-base">N</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">Nodrix</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                Gestão
              </span>
            </div>
          </div>

          {/* Top Bar Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              const isConfig = item.id === 'settings';

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  {isConfig && <Settings className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: User Switcher & Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Fast Perspective Switcher */}
          {isAdmin && users.filter((u) => u.status === 'active').length > 1 && (
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 rounded px-2.5 py-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Visão:</span>
              <select
                value={activeUserId}
                onChange={(e) => setActiveUserId(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
              >
                {users.filter((u) => u.status === 'active').map((u) => {
                  const isUserSuperAdmin = u.isSuperAdmin || u.email.toLowerCase() === 'wederleal11@gmail.com';
                  return (
                    <option key={u.uid} value={u.uid} className="bg-slate-900 text-white">
                      {u.name} ({isUserSuperAdmin ? 'Super Admin' : u.role === 'admin' ? 'Gestor' : 'Dev'})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs uppercase text-white overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.substring(0, 2) || 'WL'
                )}
              </div>
              <div className="text-left hidden md:block leading-tight">
                <span className="block text-xs font-semibold text-white truncate max-w-[130px]">
                  {profile?.name || 'Conta'}
                </span>
                <span className="block text-[10px] text-cyan-300 font-medium">
                  {isSuperAdmin
                    ? 'Super Admin'
                    : profile?.role === 'admin'
                    ? 'Gestor'
                    : 'Colaborador'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-md shadow-xl py-1 text-xs text-slate-700 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    {profile?.name}
                    {isSuperAdmin && (
                      <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-extrabold uppercase">
                        Super
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Versão {import.meta.env.VITE_APP_SHA?.slice(0, 7) || 'local'}</p>
                </div>

                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => onSelectView('team')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" /> Meu Perfil
                  </button>

                  <button
                    onClick={() => onSelectView('settings')}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded flex items-center gap-2 cursor-pointer text-blue-700 font-medium"
                  >
                    <Settings className="w-3.5 h-3.5 text-blue-600" /> Configurações
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    onClick={signOut}
                    className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 rounded flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sair do Sistema
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
