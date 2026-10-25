import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Edit2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  Filter,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { deleteUser, upsertUserProfile } from '../../services/db';
import { formatDateBR } from '../../utils/formatters';

interface UsersManagementViewProps {
  users: UserProfile[];
  onAddUser: () => void;
  onEditUser: (user: UserProfile) => void;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  users,
  onAddUser,
  onEditUser,
}) => {
  const { activeProfile, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'profiles'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);

  // Statistics
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const collaboratorCount = users.filter((u) => u.role === 'collaborator').length;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        (u.document && u.document.includes(q)) ||
        u.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleStatus = async (user: UserProfile) => {
    if (!isAdmin) return;
    if (user.role === 'admin' && adminCount <= 1 && user.status === 'active') {
      alert('Não é possível desativar o único administrador do sistema.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmMsg =
      nextStatus === 'active'
        ? `Reativar o acesso de ${user.name}?`
        : `Desativar o acesso de ${user.name}? O usuário não conseguirá acessar o sistema.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsUpdating(true);
      await upsertUserProfile({
        ...user,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      alert('Erro ao atualizar status do usuário.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!isAdmin) return;
    if (user.role === 'admin') {
      alert('Por segurança, administradores não podem ser excluídos diretamente.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${user.name}?`)) {
      try {
        await deleteUser(user.uid);
      } catch (err) {
        alert('Erro ao excluir usuário.');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. RELACIONA TOP-BORDER KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-blue-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL DE USUÁRIOS
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {totalUsers}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-medium">
            {activeCount} ativos no sistema
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-purple-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            ADMINISTRADORES
          </span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {adminCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-medium">
            Gestão & Acesso Total
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            COLABORADORES FULL
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {collaboratorCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-medium">
            Operação (Sem Feedbacks)
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-indigo-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            PERFIS DE ACESSO
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            2 Perfis
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-medium">
            Matriz RBAC ativa
          </span>
        </div>
      </div>

      {/* 2. SUBTABS TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-[#004e9a] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários do Sistema ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={`px-4 py-2 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'profiles'
                ? 'bg-[#004e9a] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Perfis de Acesso & Permissões</span>
          </button>
        </div>

        {activeTab === 'users' && isAdmin && (
          <button
            type="button"
            onClick={onAddUser}
            className="px-4 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Cadastrar Usuário
          </button>
        )}
      </div>

      {/* 3. TAB CONTENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative min-w-[240px] sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail, telefone..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:border-[#004e9a]"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs focus:outline-none focus:border-[#004e9a] cursor-pointer"
              >
                <option value="all">Perfil: Todos</option>
                <option value="admin">Administrador / Gestor</option>
                <option value="collaborator">Colaborador Full</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs focus:outline-none focus:border-[#004e9a] cursor-pointer"
              >
                <option value="all">Status: Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>

            <div className="text-slate-500 text-xs font-medium">
              Exibindo <strong>{filteredUsers.length}</strong> de <strong>{totalUsers}</strong> usuários
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">E-mail Google</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">CPF / CNPJ</th>
                    <th className="py-3 px-4">Perfil de Acesso</th>
                    <th className="py-3 px-4">Carga</th>
                    <th className="py-3 px-4">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const isSelf = activeProfile?.uid === user.uid;
                    const isUserAdmin = user.role === 'admin';

                    return (
                      <tr key={user.uid} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {user.name.substring(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {user.name} {isSelf && <span className="text-[10px] text-blue-600 font-normal">(Você)</span>}
                              </span>
                              <span className="text-[11px] text-slate-500 block">{user.title}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                          {user.email}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {user.phone || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                          {user.document || '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          {isUserAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Shield className="w-3.5 h-3.5 text-purple-600" />
                              Administrador / Gestor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                              Colaborador Full
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {user.availability}
                        </td>

                        <td className="py-3.5 px-4">
                          {user.status === 'active' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Inativo
                            </span>
                          )}
                        </td>

                        {isAdmin && (
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onEditUser(user)}
                                className="p-1.5 text-slate-400 hover:text-[#004e9a] rounded hover:bg-slate-100 cursor-pointer transition-colors"
                                title="Editar dados e perfil"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {!isUserAdmin && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(user)}
                                    disabled={isUpdating}
                                    className={`p-1.5 rounded hover:bg-slate-100 cursor-pointer transition-colors ${
                                      user.status === 'active'
                                        ? 'text-slate-400 hover:text-amber-600'
                                        : 'text-slate-400 hover:text-emerald-600'
                                    }`}
                                    title={user.status === 'active' ? 'Desativar acesso' : 'Reativar acesso'}
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                                    title="Excluir usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum usuário encontrado para os critérios de busca selecionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 2: ACCESS PROFILES (RBAC) */}
      {activeTab === 'profiles' && (
        <div className="space-y-5">
          {/* Profiles Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profile 1: Admin */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Administrador / Gestor</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                        Acesso Total Irrestrito
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {adminCount} usuários vinculados
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Perfil de comando corporativo. Responsável pela governança da equipe, cadastro e aprovação de usuários, homologação final de entregas, relatórios executivos e gestão completa de feedbacks.
              </p>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Operação técnica (Projetos & Demandas):</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liberado Total
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Feedbacks enviados & respondidos:</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Acesso Total & Notas Privadas
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Aprovação e homologação de entregas:</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Autoridade Final
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Gestão de Usuários e Perfis:</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Gerenciamento Completo
                  </strong>
                </div>
              </div>
            </div>

            {/* Profile 2: Collaborator Full */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Colaborador Full</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        Perfil Geral — Sem Feedbacks
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {collaboratorCount} usuários vinculados
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Perfil de execução técnica e desenvolvimento. Possui acesso completo e autônomo à operação cotidiana da empresa (projetos, demandas, quadro kanban, agenda semanal, check-ins e relatórios).
              </p>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Operação técnica (Projetos & Demandas):</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liberado Total
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-700 bg-red-50/60 px-2 rounded">
                  <span className="font-medium text-red-900">Feedbacks enviados & respondidos:</span>
                  <strong className="text-red-600 flex items-center gap-1 font-bold">
                    <EyeOff className="w-3.5 h-3.5" /> Bloqueado / Oculto
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Check-in diário & Minha semana:</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
                  </strong>
                </div>
                <div className="flex items-center justify-between py-1 text-slate-700">
                  <span>Submissão de entregas com evidência:</span>
                  <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Permissions Matrix */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Matriz de Permissões por Perfil de Acesso
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Governança e política de acesso rigorosa aplicada no frontend e nas regras de segurança do Firestore.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Módulo do Sistema</th>
                    <th className="py-2.5 px-4">Capacidade Operacional</th>
                    <th className="py-2.5 px-4 text-center">Administrador / Gestor</th>
                    <th className="py-2.5 px-4 text-center">Colaborador Full</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Visão Geral (Dashboard)</td>
                    <td className="py-3 px-4 text-slate-600">Consultar KPIs executivos, prioridades P0 e atenção da semana</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Projetos</td>
                    <td className="py-3 px-4 text-slate-600">Criar, detalhar, atualizar marcos e visualizar progresso validado</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado (Total)</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Demandas (Kanban)</td>
                    <td className="py-3 px-4 text-slate-600">Criar demandas, mover status, iniciar execução, checklist e links</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Minha Semana (Agenda)</td>
                    <td className="py-3 px-4 text-slate-600">Agendar compromissos, visualizar agenda da equipe e eventos</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Check-in Diário</td>
                    <td className="py-3 px-4 text-slate-600">Registrar prioridade matinal e fechamento noturno com evidência</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Relatórios Executivos</td>
                    <td className="py-3 px-4 text-slate-600">Consultar produtividade semanal, horas e exportar CSV</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                  </tr>

                  {/* FEEDBACK ROW - HIGHLIGHTED */}
                  <tr className="bg-amber-50/40">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      Feedbacks Enviados e Respondidos
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      Acessar histórico de alinhamentos, avaliações e notas privadas da gestão
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">
                      Liberado Total
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-red-600">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700">
                        <EyeOff className="w-3 h-3" /> Oculto / Bloqueado
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Aprovação de Entregas</td>
                    <td className="py-3 px-4 text-slate-600">Homologar entrega de outro dev (Regra: proibido autoaprovação)</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Autoridade Final</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-600">Gestor ou Validador designado</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-4 font-bold text-slate-900">Gestão de Usuários & Perfis</td>
                    <td className="py-3 px-4 text-slate-600">Cadastrar colaboradores, desativar acessos e alterar perfis</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-500">Visualização</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
