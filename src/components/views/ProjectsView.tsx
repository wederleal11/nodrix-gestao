import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  LayoutGrid,
  List,
  Search,
  Filter,
  Eye,
  GitFork,
  BookOpen,
} from 'lucide-react';
import type { Project, Task, UserProfile } from '../../types';
import { formatDateBR } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { ProjectStatusSelect } from '../projects/ProjectStatusSelect';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  users: UserProfile[];
  onOpenProject: (project: Project) => void;
  onAddProject: () => void;
  onAddTask: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  users,
  onOpenProject,
  onAddProject,
  onAddTask,
}) => {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const activeProjectsCount = projects.filter((p) => p.status === 'Ativo').length;
  const planningCount = projects.filter((p) => p.status === 'Planejamento').length;
  const blockedCount = projects.filter((p) => p.status === 'Bloqueado').length;
  const completedCount = projects.filter((p) => p.status === 'Concluído').length;

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.client && p.client.toLowerCase().includes(q)) ||
        p.leadName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. KPI CARDS FOR PROJECTS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-blue-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL DE PROJETOS
          </span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {projects.length}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Iniciativas cadastradas</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-sky-500 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            PROJETOS ATIVOS
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {activeProjectsCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Em desenvolvimento</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-rose-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            BLOQUEADOS
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {blockedCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Exigem intervenção</span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            CONCLUÍDOS
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {completedCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Validados formalmente</span>
        </div>
      </div>

      {/* 2. FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, cliente ou líder técnico..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Planejamento">Planejamento</option>
            <option value="Bloqueado">Bloqueado</option>
            <option value="Em validação">Em validação</option>
            <option value="Concluído">Concluído</option>
          </select>

          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 px-2.5 flex items-center gap-1 font-semibold text-xs cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Tabela
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 px-2.5 flex items-center gap-1 font-semibold text-xs cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Cards
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={onAddProject}
              className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo projeto
            </button>
          )}
        </div>
      </div>

      {/* 3. TABLE VIEW (Default) */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Prioridade</th>
                  <th className="py-2.5 px-4">Projeto</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Líder Técnico</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Progresso Validado</th>
                  <th className="py-2.5 px-4">Previsão</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => {
                  const pTasks = tasks.filter((t) => t.projectId === p.id);
                  const total = pTasks.length;
                  const validated = pTasks.filter((t) => t.status === 'completed').length;
                  const progress = total > 0 ? Math.round((validated / total) * 100) : 0;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onOpenProject(p)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            p.priority === 'P0'
                              ? 'bg-red-600 text-white'
                              : p.priority === 'P1'
                              ? 'bg-amber-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {p.priority}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {p.client || '-'}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {p.leadName}
                      </td>

                      <td className="py-3 px-4">
                        <ProjectStatusSelect project={p} />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="font-bold text-slate-700">{progress}%</span>
                          <span className="text-[10px] text-slate-400">({validated}/{total})</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {formatDateBR(p.targetDate)}
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

          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>1-{filteredProjects.length} de {filteredProjects.length}</span>
            <div className="flex items-center gap-2">
              <button disabled className="px-2 py-1 rounded bg-slate-100 text-slate-400 cursor-not-allowed">
                Anterior
              </button>
              <span>Página 1 de 1</span>
              <button disabled className="px-2 py-1 rounded bg-slate-100 text-slate-400 cursor-not-allowed">
                Próxima
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const pTasks = tasks.filter((t) => t.projectId === p.id);
            const total = pTasks.length;
            const validated = pTasks.filter((t) => t.status === 'completed').length;
            const progress = total > 0 ? Math.round((validated / total) * 100) : 0;

            return (
              <div
                key={p.id}
                onClick={() => onOpenProject(p)}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs hover:border-blue-500 cursor-pointer transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                    {p.client && (
                      <p className="text-xs text-blue-600 font-medium">{p.client}</p>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                      p.status === 'Ativo' ? 'bg-[#0066cc] text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {p.description || 'Sem descrição cadastrada.'}
                </p>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">Progresso Validado: <strong>{progress}%</strong></span>
                    <span className="text-slate-400 text-[11px]">{validated}/{total} entregas</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>Líder: <strong className="text-slate-700">{p.leadName}</strong></span>
                  <span>Previsão: {formatDateBR(p.targetDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
