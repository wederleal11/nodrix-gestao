import React, { useState } from 'react';
import {
  X,
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { Project, Task, UserProfile } from '../../types';
import { formatProjectWriteError, toggleArchiveProject } from '../../services/db';
import { ProjectStatusSelect } from '../projects/ProjectStatusSelect';
import { ProjectDeleteDialog } from '../projects/ProjectDeleteDialog';
import { useAuth } from '../../context/AuthContext';
import { formatDateBR } from '../../utils/formatters';

interface ProjectDetailModalProps {
  project: Project | null;
  tasks: Task[];
  users: UserProfile[];
  onClose: () => void;
  onEdit: (project: Project) => void;
  onOpenTask: (task: Task) => void;
  onAddTask: (projectId: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  tasks,
  users,
  onClose,
  onEdit,
  onOpenTask,
  onAddTask,
}) => {
  const { profile, isAdmin } = useAuth();
  const [archiveError, setArchiveError] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!project) return null;

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const totalTasks = projectTasks.length;
  const validatedTasks = projectTasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((validatedTasks / totalTasks) * 100) : 0;

  const handleToggleArchive = async () => {
    if (!isAdmin) return;
    const confirmMsg = project.isArchived
      ? `Reativar o projeto "${project.name}"?`
      : `Arquivar o projeto "${project.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    if (!profile || isArchiving) return;
    setArchiveError('');
    setIsArchiving(true);
    try {
      await toggleArchiveProject(
        project.id,
        project.name,
        !project.isArchived,
        { id: profile.uid, name: profile.name, email: profile.email }
      );
      onClose();
    } catch (error) {
      setArchiveError(formatProjectWriteError(error));
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white">
                {project.priority}
              </span>
              <ProjectStatusSelect project={project} />
              {project.isArchived && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-zinc-600 text-white rounded">
                  ARQUIVADO
                </span>
              )}
            </div>
            <h2 className="text-[17px] font-bold text-white tracking-tight mt-1">
              {project.name}
            </h2>
            <p className="text-xs text-slate-300 font-normal">
              {project.client ? `Cliente: ${project.client} • ` : ''}Líder técnico: {project.leadName}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(project);
                  }}
                  className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Editar projeto"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleToggleArchive}
                  disabled={isArchiving}
                  className="p-1.5 text-slate-300 hover:text-amber-400 rounded hover:bg-slate-800 cursor-pointer transition-colors"
                  title={project.isArchived ? 'Reativar' : 'Arquivar'}
                >
                  {project.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isArchiving}
                  className="p-1.5 text-slate-300 hover:text-rose-400 rounded hover:bg-slate-800 cursor-pointer transition-colors disabled:opacity-50"
                  title="Excluir definitivamente"
                  aria-label={`Excluir projeto ${project.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL CONTENT */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 bg-white">
          {archiveError && <p role="alert" className="rounded-md bg-rose-50 border border-rose-200 p-3 text-rose-700">{archiveError}</p>}
          {/* Metadata bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">LÍDER TÉCNICO</span>
              <strong className="text-slate-900 text-xs">{project.leadName}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">INÍCIO</span>
              <strong className="text-slate-900 text-xs">{formatDateBR(project.startDate)}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">PREVISÃO ALVO</span>
              <strong className="text-slate-900 text-xs">{formatDateBR(project.targetDate)}</strong>
            </div>
          </div>

          <p className="text-slate-700 text-xs leading-relaxed">
            {project.description || 'Sem descrição cadastrada.'}
          </p>

          {/* Proven Progress Bar */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-xs">
                Progresso Validado: <strong className="text-[#004e9a] text-sm font-bold">{progressPercent}%</strong>
              </span>
              <span className="text-slate-500 text-[11px]">
                {validatedTasks} de {totalTasks} demandas validadas
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Milestone & Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-blue-600 uppercase block mb-1">
                Próximo Marco Crítico
              </span>
              <p className="text-slate-800 leading-relaxed text-xs">
                {project.nextMilestone || 'Nenhum marco cadastrado.'}
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-emerald-600 uppercase block mb-1">
                Critério de Conclusão
              </span>
              <p className="text-slate-800 leading-relaxed text-xs">
                {project.completionCriteria || 'Nenhum critério formal cadastrado.'}
              </p>
            </div>
          </div>

          {/* Linked Backlog */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 uppercase tracking-wide text-xs">
                Demandas Vinculadas ({projectTasks.length})
              </h4>
              <button
                type="button"
                onClick={() => onAddTask(project.id)}
                className="px-3.5 py-1.5 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg flex items-center gap-1.5 cursor-pointer text-xs shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar demanda
              </button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {projectTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTask(t)}
                  className="p-3 bg-white hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{t.title}</span>
                    <span className="text-[10px] text-slate-400">({t.priority})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">{t.assigneeName || 'Não atribuído'}</span>
                    <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-700">
                      {t.status}
                    </span>
                  </div>
                </div>
              ))}

              {projectTasks.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Nenhuma demanda vinculada a este projeto ainda.
                </div>
              )}
            </div>
          </div>

          {/* RELACIONA MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-xs cursor-pointer transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
      {showDeleteDialog && (
        <ProjectDeleteDialog
          key={project.id}
          project={project}
          onClose={() => setShowDeleteDialog(false)}
          onDeleted={() => {
            setShowDeleteDialog(false);
            onClose();
          }}
        />
      )}
    </div>
  );
};
