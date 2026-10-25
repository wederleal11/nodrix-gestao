import React, { useState } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Search,
  Eye,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';
import type { Task, Project, UserProfile, PriorityRequest } from '../../types';
import {
  formatDateBR,
  isOverdue,
} from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { resolvePriorityRequest } from '../../services/db';

interface DashboardViewProps {
  projects: Project[];
  tasks: Task[];
  users: UserProfile[];
  priorityRequests: PriorityRequest[];
  onOpenTask: (task: Task) => void;
  onOpenProject: (project: Project) => void;
  onNavigateToUser: (userId: string) => void;
  onNavigateToView: (view: string) => void;
  onAddTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  tasks,
  users,
  priorityRequests,
  onOpenTask,
  onOpenProject,
  onNavigateToUser,
  onNavigateToView,
  onAddTask,
}) => {
  const { activeProfile, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // KPI Metrics calculation
  const activeProjects = projects.filter((p) => !p.isArchived && p.status === 'Ativo').length;
  const plannedThisWeek = tasks.filter((t) => t.status !== 'cancelled' && t.status !== 'backlog').length;
  const validatedThisWeek = tasks.filter((t) => t.status === 'completed').length;
  const overdueTasks = tasks.filter((t) => isOverdue(t.deadline, t.status));
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const awaitingValidationTasks = tasks.filter((t) => t.status === 'awaiting_validation');
  const pendingRequests = priorityRequests.filter((pr) => pr.status === 'pending');

  // Filtered priority list
  const filteredPriorities = tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    .filter((t) => (selectedProject === 'all' ? true : t.projectId === selectedProject))
    .filter((t) => (selectedPriority === 'all' ? true : t.priority === selectedPriority))
    .filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.projectName.toLowerCase().includes(q) ||
        (t.assigneeName && t.assigneeName.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const pOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
      const diffP = pOrder[a.priority] - pOrder[b.priority];
      if (diffP !== 0) return diffP;
      const aOver = isOverdue(a.deadline, a.status) ? 0 : 1;
      const bOver = isOverdue(b.deadline, b.status) ? 0 : 1;
      if (aOver !== bOver) return aOver - bOver;
      return (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1;
    });

  const handleResolvePriority = async (req: PriorityRequest, approved: boolean) => {
    if (!activeProfile) return;
    await resolvePriorityRequest(
      req.id,
      req.taskId,
      req.taskTitle,
      approved ? req.requestedPriority : null,
      {
        id: activeProfile.uid,
        name: activeProfile.name,
        email: activeProfile.email,
      },
      approved
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. RELACIONA-STYLE KPI METRIC CARDS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Ativos */}
        <div
          onClick={() => onNavigateToView('projects')}
          className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-blue-600 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            PROJETOS ATIVOS
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {activeProjects}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Clique para filtrar</span>
        </div>

        {/* Previstas */}
        <div
          onClick={() => onNavigateToView('tasks')}
          className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-sky-500 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            DEMANDAS PREVISTAS
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {plannedThisWeek}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Clique para filtrar</span>
        </div>

        {/* Validadas */}
        <div
          onClick={() => onNavigateToView('tasks')}
          className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            VALIDADAS NA SEMANA
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {validatedThisWeek}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Entregas auditadas</span>
        </div>

        {/* Atrasadas */}
        <div
          onClick={() => onNavigateToView('tasks')}
          className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-red-600 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            DEMANDAS ATRASADAS
          </span>
          <div className="text-2xl font-black text-red-600 mt-1">
            {overdueTasks.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Prazo expirado</span>
        </div>

        {/* Bloqueios */}
        <div
          onClick={() => onNavigateToView('tasks')}
          className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-rose-600 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            BLOQUEIOS ABERTOS
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {blockedTasks.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Exigem resolução</span>
        </div>

        {/* Aguardando Validação */}
        <div
          onClick={() => onNavigateToView('tasks')}
          className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-purple-600 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all"
        >
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            AGUARDANDO VALIDAÇÃO
          </span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {awaitingValidationTasks.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Prontas p/ homologação</span>
        </div>
      </div>

      {/* 2. ATENÇÃO DO GESTOR (ALERT BANNER WHEN CRITICAL) */}
      {(overdueTasks.length > 0 || blockedTasks.length > 0 || awaitingValidationTasks.length > 0 || pendingRequests.length > 0) && (
        <div className="bg-white border border-amber-300 rounded-lg p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <div>
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                Atenção da Gestão:
              </span>
              <span className="text-xs text-slate-600 ml-2">
                {overdueTasks.length} atrasos · {blockedTasks.length} bloqueios · {awaitingValidationTasks.length} aguardando validação
                {pendingRequests.length > 0 && ` · ${pendingRequests.length} pedido(s) de repriorização`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pendingRequests.map((pr) => (
              <div key={pr.id} className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2 py-1 rounded text-xs">
                <span className="font-bold text-amber-900">{pr.taskTitle}:</span>
                <span className="text-slate-600">{pr.requestedPriority}</span>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleResolvePriority(pr, true)}
                      className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded hover:bg-blue-700"
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleResolvePriority(pr, false)}
                      className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded hover:bg-slate-300"
                    >
                      Rejeitar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. RELACIONA-STYLE SECONDARY FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por demanda, projeto ou responsável..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>

        {/* Right: Filters & Action Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as prioridades</option>
            <option value="P0">P0 — Crítica</option>
            <option value="P1">P1 — Alta</option>
            <option value="P2">P2 — Normal</option>
            <option value="P3">P3 — Melhoria</option>
          </select>

          <button
            onClick={onAddTask}
            className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Nova demanda
          </button>
        </div>
      </div>

      {/* 4. CLEAN ENTERPRISE TABLE OF PRIORITIES */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Prioridades da Semana ({filteredPriorities.length})
          </h2>
          <span className="text-[11px] text-slate-400">
            Ordenado P0 crítico primeiro, seguido de atrasos e prazos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-4 w-24">Prioridade</th>
                <th className="py-2.5 px-4">Demanda</th>
                <th className="py-2.5 px-4">Projeto</th>
                <th className="py-2.5 px-4">Responsável</th>
                <th className="py-2.5 px-4">Prazo</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPriorities.slice(0, 10).map((t) => {
                const late = isOverdue(t.deadline, t.status);

                return (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTask(t)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      {t.priority === 'P0' ? (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold bg-[#dc2626] text-white rounded">
                          P0
                        </span>
                      ) : t.priority === 'P1' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#d97706] text-white rounded">
                          P1
                        </span>
                      ) : t.priority === 'P2' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#0284c7] text-white rounded">
                          P2
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700 rounded">
                          P3
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900 max-w-md">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{t.title}</span>
                        {late && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-red-600 text-white rounded">
                            ATRASO
                          </span>
                        )}
                        {t.status === 'blocked' && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-600 text-white rounded">
                            BLOQUEIO
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {t.projectName}
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {t.assigneeName || (
                        <span className="text-red-600 font-medium">Sem responsável</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={late ? 'text-red-600 font-bold' : 'text-slate-600'}>
                        {formatDateBR(t.deadline)}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {t.status === 'completed' ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#059669] text-white rounded-full">
                          Concluída
                        </span>
                      ) : t.status === 'in_progress' ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#0284c7] text-white rounded-full">
                          Em andamento
                        </span>
                      ) : t.status === 'awaiting_validation' ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#7c3aed] text-white rounded-full">
                          Em validação
                        </span>
                      ) : t.status === 'blocked' ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#dc2626] text-white rounded-full">
                          Bloqueada
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-medium bg-slate-200 text-slate-700 rounded-full">
                          {t.status === 'planned' ? 'Planejada' : 'Backlog'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="text-blue-600 hover:text-blue-800 font-semibold text-xs inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Ver detalhes
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPriorities.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-xs">
            Nenhuma demanda encontrada para os critérios selecionados.
          </div>
        )}
      </div>

      {/* 5. TEAM ANDAMENTO ROW (Clean White Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {users.map((member) => {
          const mTasks = tasks.filter((t) => t.assigneeId === member.uid);
          const mP0 = mTasks.find((t) => t.priority === 'P0' && t.status !== 'completed' && t.status !== 'cancelled');
          const mInProgress = mTasks.filter((t) => t.status === 'in_progress').length;
          const mValidated = mTasks.filter((t) => t.status === 'completed').length;
          const mLate = mTasks.filter((t) => isOverdue(t.deadline, t.status)).length;

          return (
            <div
              key={member.uid}
              onClick={() => onNavigateToUser(member.uid)}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs hover:border-blue-500 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#0b1b33] text-white font-bold flex items-center justify-center text-xs uppercase">
                    {member.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{member.name}</h3>
                    <p className="text-[10px] text-slate-400">{member.title}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-blue-600 hover:underline">
                  Ver painel →
                </span>
              </div>

              <div className="py-2.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Foco P0 Atual:
                </span>
                {mP0 ? (
                  <p className="text-xs font-bold text-red-600 line-clamp-1">{mP0.title}</p>
                ) : (
                  <p className="text-xs text-slate-400 italic">Sem P0 atribuído</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Em andamento</span>
                  <strong className="text-slate-800 font-bold">{mInProgress}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 block">Validadas</span>
                  <strong className="text-emerald-600 font-bold">{mValidated}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-red-600 block">Atrasos</span>
                  <strong className="text-red-600 font-bold">{mLate}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
