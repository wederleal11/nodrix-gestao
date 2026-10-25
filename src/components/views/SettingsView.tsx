import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  FolderKanban,
  ShieldCheck,
  Building2,
  UserPlus,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  Shield,
  Lock,
  EyeOff,
  CheckCircle2,
  Calendar,
  FileText,
  Clock,
  ExternalLink,
  RotateCcw,
  Archive,
  Download,
  GitBranch,
} from 'lucide-react';
import type { UserProfile, Project, AuditLog } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  deleteUser,
  upsertUserProfile,
  subscribeAuditLogs,
  toggleArchiveProject,
  seedInitialNodrixData,
} from '../../services/db';
import { formatDateBR, formatDateTimeBR } from '../../utils/formatters';

interface SettingsViewProps {
  users: UserProfile[];
  projects: Project[];
  onAddUser: () => void;
  onEditUser: (user: UserProfile) => void;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  users,
  projects,
  onAddUser,
  onEditUser,
  onAddProject,
  onEditProject,
}) => {
  const { activeProfile, isAdmin, isSuperAdmin } = useAuth();

  // Primary settings navigation tabs: Usuarios | Cadastros | Auditoria | Geral
  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'usuarios' | 'cadastros' | 'auditoria' | 'geral'
  >('usuarios');

  // Sub-tabs inside Usuarios: 'lista' | 'perfis'
  const [userSubTab, setUserSubTab] = useState<'lista' | 'perfis'>('lista');

  // Filters for users
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Filters for projects in Cadastros
  const [projectSearch, setProjectSearch] = useState('');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  // Seed status message
  const [seedStatus, setSeedStatus] = useState('');

  useEffect(() => {
    if (activeSettingsTab === 'auditoria') {
      const unsub = subscribeAuditLogs((items) => {
        setAuditLogs(items);
      }, 100);
      return () => unsub();
    }
  }, [activeSettingsTab]);

  // User list calculations
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.status === 'active').length;
  const adminCount = users.filter((u) => u.role === 'admin' || u.isSuperAdmin).length;
  const collaboratorCount = users.filter((u) => u.role === 'collaborator' && !u.isSuperAdmin).length;

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (userStatusFilter !== 'all' && u.status !== userStatusFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
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

  const filteredProjects = projects.filter((p) => {
    if (!projectSearch.trim()) return true;
    const q = projectSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.client && p.client.toLowerCase().includes(q)) ||
      p.leadName.toLowerCase().includes(q)
    );
  });

  const filteredLogs = auditLogs.filter((l) => {
    if (!auditSearch.trim()) return true;
    const q = auditSearch.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  const handleToggleUserStatus = async (user: UserProfile) => {
    if (!isAdmin) return;
    if (user.isSuperAdmin || (user.email.toLowerCase() === 'wederleal11@gmail.com')) {
      alert('Não é permitido desativar o Super Admin.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmMsg =
      nextStatus === 'active'
        ? `Reativar o acesso de ${user.name}?`
        : `Desativar o acesso de ${user.name}? O usuário não conseguirá acessar o sistema.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsUpdatingUser(true);
      await upsertUserProfile({
        ...user,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      alert('Erro ao atualizar status do usuário.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!isAdmin) return;
    if (user.isSuperAdmin || (user.email.toLowerCase() === 'wederleal11@gmail.com')) {
      alert('Por segurança, o Super Admin não pode ser excluído.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir o cadastro de ${user.name}?`)) {
      try {
        await deleteUser(user.uid);
      } catch {
        alert('Erro ao excluir usuário.');
      }
    }
  };

  const handleToggleArchiveProject = async (p: Project) => {
    if (!isAdmin) return;
    const confirmMsg = p.isArchived
      ? `Reativar o projeto "${p.name}"?`
      : `Arquivar o projeto "${p.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    await toggleArchiveProject(
      p.id,
      p.name,
      !p.isArchived,
      {
        id: activeProfile?.uid || '',
        name: activeProfile?.name || '',
        email: activeProfile?.email || '',
      }
    );
  };

  const handleReSeedData = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Recarregar os 4 projetos padrão da Nodrix (Nolasco, Relaciona V2, Relaciona Indica, Ponto Digital)?')) return;
    try {
      setSeedStatus('Carregando templates padrão...');
      await seedInitialNodrixData({
        id: activeProfile?.uid || '',
        name: activeProfile?.name || 'Weder Leal',
        email: activeProfile?.email || 'wederleal11@gmail.com',
      });
      setSeedStatus('Templates recarregados com sucesso!');
      setTimeout(() => setSeedStatus(''), 4000);
    } catch (err) {
      setSeedStatus('Erro ao recarregar dados.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER - RELACIONA STYLE */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0e213e] text-white flex items-center justify-center shadow-xs">
              <Settings className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              Configurações do Sistema
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
              Painel Corporativo
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tudo o que for configuração administrativa: gestão de usuários, cadastros gerais, governança e auditoria.
          </p>
        </div>

        {isSuperAdmin && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 px-3 py-1.5 rounded-lg text-xs">
            <Shield className="w-4 h-4 text-purple-700" />
            <span className="text-slate-800 font-medium">
              Super Admin: <strong className="text-purple-900 font-bold">Weder Leal</strong> (Acesso Total)
            </span>
          </div>
        )}
      </div>

      {/* 2. MAIN HORIZONTAL CONFIGURATION TABS (Usuarios | Cadastros | Auditoria | Geral) */}
      <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-2xs flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => setActiveSettingsTab('usuarios')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsTab === 'usuarios'
              ? 'bg-[#004e9a] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuários & Acessos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('cadastros')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsTab === 'cadastros'
              ? 'bg-[#004e9a] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Cadastros Gerais (Projetos & Áreas)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('auditoria')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsTab === 'auditoria'
              ? 'bg-[#004e9a] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auditoria & Segurança</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab('geral')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeSettingsTab === 'geral'
              ? 'bg-[#004e9a] text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Governança & Parâmetros</span>
        </button>
      </div>

      {/* 3. TAB CONTENT: USUÁRIOS & ACESSOS */}
      {activeSettingsTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-blue-600 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                TOTAL DE USUÁRIOS
              </span>
              <div className="text-xl font-black text-blue-600 mt-0.5">{totalUsers}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">{activeCount} ativos</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-purple-600 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                ADMINISTRADORES
              </span>
              <div className="text-xl font-black text-purple-600 mt-0.5">{adminCount}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Gestão & Acesso Total</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                COLABORADORES FULL
              </span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">{collaboratorCount}</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Operação (Sem Feedbacks)</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-indigo-600 p-3.5 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                PERFIS DE ACESSO
              </span>
              <div className="text-xl font-black text-indigo-600 mt-0.5">2 Perfis</div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">RBAC Ativo</span>
            </div>
          </div>

          {/* Sub-toolbar for Users: Lista | Perfis */}
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setUserSubTab('lista')}
                className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  userSubTab === 'lista'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Usuários Cadastrados ({users.length})
              </button>

              <button
                type="button"
                onClick={() => setUserSubTab('perfis')}
                className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  userSubTab === 'perfis'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Perfis de Acesso & Permissões (RBAC)
              </button>
            </div>

            {userSubTab === 'lista' && isAdmin && (
              <button
                type="button"
                onClick={onAddUser}
                className="px-4 py-1.5 bg-[#004e9a] hover:bg-[#003d7a] text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Cadastrar Usuário
              </button>
            )}
          </div>

          {userSubTab === 'lista' ? (
            <div className="space-y-3">
              {/* Filter bar */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative min-w-[240px] sm:w-72">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Buscar por nome, e-mail, telefone..."
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:border-[#004e9a]"
                    />
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs focus:outline-none focus:border-[#004e9a] cursor-pointer"
                  >
                    <option value="all">Perfil: Todos</option>
                    <option value="admin">Administrador / Super Admin</option>
                    <option value="collaborator">Colaborador Full</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
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

              {/* Table */}
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
                        const isUserSuperAdmin = user.isSuperAdmin || user.email.toLowerCase() === 'wederleal11@gmail.com';
                        const isUserAdmin = user.role === 'admin' || isUserSuperAdmin;

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
                              {isUserSuperAdmin ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-900 border border-purple-300">
                                  <Shield className="w-3.5 h-3.5 text-purple-700" />
                                  Super Admin (Weder)
                                </span>
                              ) : isUserAdmin ? (
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

                                  {!isUserSuperAdmin && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleUserStatus(user)}
                                        disabled={isUpdatingUser}
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
          ) : (
            /* Sub-tab: Perfis de Acesso & Permissões */
            <div className="space-y-4">
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
                          <h3 className="font-bold text-sm text-slate-900">Super Admin & Gestor</h3>
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
                    Weder Leal e gestores da Nodrix. Acesso pleno a todas as telas, cadastros gerais, feedbacks confidenciais, relatórios executivos, auditoria e homologação de entregas.
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>Projetos & Demandas:</span>
                      <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liberado Total
                      </strong>
                    </div>
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>Feedbacks enviados & notas privadas:</span>
                      <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liberado Total
                      </strong>
                    </div>
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>Configurações & Cadastros:</span>
                      <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liberado Total
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
                    Profissionais de desenvolvimento. Acesso autônomo total à operação (projetos, demandas, kanban, agenda, check-ins, relatórios), com a restrição estrita: não vê feedbacks enviados ou respondidos.
                  </p>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>Projetos & Demandas:</span>
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
                      <span>Check-in diário & Relatórios:</span>
                      <strong className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matriz de Permissões */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Matriz de Permissões RBAC
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4">Módulo</th>
                        <th className="py-2.5 px-4">Capacidade Operacional</th>
                        <th className="py-2.5 px-4 text-center">Super Admin & Gestores</th>
                        <th className="py-2.5 px-4 text-center">Colaborador Full</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 px-4 font-bold text-slate-900">Visão Geral (Dashboard)</td>
                        <td className="py-3 px-4 text-slate-600">Consultar KPIs executivos, prioridades e atenção</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-slate-900">Projetos & Demandas</td>
                        <td className="py-3 px-4 text-slate-600">Criar, mover no Kanban, iniciar, executar e submeter</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-slate-900">Minha Semana & Check-in</td>
                        <td className="py-3 px-4 text-slate-600">Agenda semanal, reuniões e check-in diário</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-slate-900">Relatórios de Produtividade</td>
                        <td className="py-3 px-4 text-slate-600">Semana da Empresa, Horas e Exportação CSV</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado</td>
                      </tr>
                      <tr className="bg-amber-50/40">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-700" /> Feedbacks Enviados e Respondidos
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">Acessar histórico de avaliações e notas privadas</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado Total</td>
                        <td className="py-3 px-4 text-center font-bold text-red-600">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-100 text-red-700">
                            <EyeOff className="w-3 h-3" /> Oculto / Bloqueado
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 font-bold text-slate-900">Configurações & Cadastros</td>
                        <td className="py-3 px-4 text-slate-600">Gerenciar usuários, projetos, áreas e auditoria</td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">Liberado Total</td>
                        <td className="py-3 px-4 text-center font-medium text-slate-500">Somente Leitura</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. TAB CONTENT: CADASTROS GERAIS (Projetos, Clientes, Áreas) */}
      {activeSettingsTab === 'cadastros' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Buscar projeto cadastrado, cliente ou responsável..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:border-[#004e9a]"
              />
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={onAddProject}
                className="px-4 py-1.5 bg-[#004e9a] hover:bg-[#003d7a] text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Projeto
              </button>
            )}
          </div>

          {/* Projects & Clients Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Projetos & Clientes Cadastrados ({filteredProjects.length})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Projeto / Sistema</th>
                    <th className="py-3 px-4">Cliente / Área</th>
                    <th className="py-3 px-4">Líder Técnico</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4">Previsão Alvo</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-bold">{p.name}</strong>
                        <span className="text-[11px] text-slate-500 block truncate max-w-xs">{p.description || 'Sem descrição'}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {p.client || 'Nodrix Interno'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {p.leadName}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            p.status === 'Ativo'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : p.status === 'Concluído'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'Bloqueado'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.status} {p.isArchived ? '(Arquivado)' : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {p.priority}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDateBR(p.targetDate)}
                      </td>

                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onEditProject(p)}
                              className="p-1.5 text-slate-400 hover:text-[#004e9a] rounded hover:bg-slate-100 cursor-pointer transition-colors"
                              title="Editar projeto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleArchiveProject(p)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                              title={p.isArchived ? 'Reativar projeto' : 'Arquivar projeto'}
                            >
                              {p.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredProjects.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum projeto encontrado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: AUDITORIA & SEGURANÇA */}
      {activeSettingsTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="relative min-w-[280px] sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filtrar por ação, responsável ou termo..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs focus:outline-none focus:border-[#004e9a]"
              />
            </div>
            <span className="text-slate-500 text-xs font-medium">
              Total de registros: <strong>{filteredLogs.length}</strong>
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Data e Hora</th>
                    <th className="py-3 px-4">Ação Realizada</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTimeBR(log.timestamp)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium whitespace-nowrap">
                        {log.actorName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {log.actorEmail}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhum evento registrado na trilha de auditoria ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: GOVERNANÇA & PARÂMETROS GERAIS */}
      {activeSettingsTab === 'geral' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parâmetros da Organização */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Parâmetros da Organização</h3>
              </div>

              <div className="text-xs space-y-2 text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Nome do Sistema:</span>
                  <strong className="text-slate-900">Nodrix Gestão</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Super Administrador:</span>
                  <strong className="text-purple-700 font-bold">Weder Leal (wederleal11@gmail.com)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Fuso Horário Operacional:</span>
                  <strong className="text-slate-900">America/Sao_Paulo (Horário de Brasília)</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Persistência Cloud:</span>
                  <strong className="text-emerald-600">Google Cloud Firestore Conectado</strong>
                </div>
              </div>
            </div>

            {/* Regras Ativas de Governança */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Regras de Governança Nodrix</h3>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong className="text-blue-900 block font-bold">1. Responsabilidade Direta Única</strong>
                  <span className="text-slate-600">Cada demanda possui obrigatoriamente um único lead executor responsável.</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong className="text-blue-900 block font-bold">2. Executado ≠ Validado</strong>
                  <span className="text-slate-600">Nenhuma demanda é concluída sem evidência verificável (PR, homologação) e aceite formal.</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong className="text-blue-900 block font-bold">3. Proibição de Autoaprovação</strong>
                  <span className="text-slate-600">O desenvolvedor que executou e submeteu a demanda não pode aprovar a própria entrega.</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <strong className="text-blue-900 block font-bold">4. Confidencialidade de Feedbacks</strong>
                  <span className="text-slate-600">Feedbacks enviados e respondidos são restritos estritamente à gestão/Super Admin.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Manutenção e Templates Iniciais */}
          {isAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Templates e Carga Inicial</h4>
                  <p className="text-xs text-slate-500">Recarga dos projetos estruturais da empresa (Nolasco, Relaciona V2, Relaciona Indica, Ponto Digital).</p>
                </div>

                <button
                  type="button"
                  onClick={handleReSeedData}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Recarregar Projetos Padrão
                </button>
              </div>

              {seedStatus && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-xs font-semibold">
                  {seedStatus}
                </div>
              )}
            </div>
          )}
          {/* Exportação do Código Fonte & Repositório GitHub */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                  <GitBranch className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Repositório GitHub & Exportação do Código Fonte</h4>
                  <p className="text-xs text-slate-500">
                    Repositório oficial: <a href="https://github.com/wederleal11/nodrix-gestao" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline">github.com/wederleal11/nodrix-gestao</a>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/nodrix-gestao.zip"
                  download="nodrix-gestao.zip"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Código Completo (.ZIP)
                </a>
                <a
                  href="https://github.com/wederleal11/nodrix-gestao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir no GitHub
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-slate-900 font-bold">Status do Repositório:</strong>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Criado no GitHub
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  O repositório <strong className="text-slate-800">nodrix-gestao</strong> foi registrado na sua conta do GitHub (<strong className="text-slate-800">wederleal11</strong>).
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1.5">
                <strong className="text-blue-900 font-bold block">Como sincronizar via Git:</strong>
                <p className="text-blue-800 text-[11px] leading-relaxed font-mono bg-white/80 p-1.5 rounded border border-blue-200">
                  git push -u origin main
                </p>
                <p className="text-slate-500 text-[10px]">
                  Obs: Para push via token fine-grained, certifique-se de habilitar permissão <em>Contents: Read and write</em> no token do GitHub.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
