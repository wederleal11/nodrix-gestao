import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Project } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  deleteProject,
  formatProjectWriteError,
  inspectProjectDeletion,
  projectDeletionBlockedMessage,
  ProjectDeletionBlockedError,
  type ProjectDeletionDependencies,
} from '../../services/db';

interface ProjectDeleteDialogProps {
  project: Project;
  onClose: () => void;
  onDeleted: () => void;
}

export const ProjectDeleteDialog: React.FC<ProjectDeleteDialogProps> = ({
  project,
  onClose,
  onDeleted,
}) => {
  const { profile, isAdmin } = useAuth();
  const [typedName, setTypedName] = useState('');
  const [dependencies, setDependencies] = useState<ProjectDeletionDependencies | null>(null);
  const [checking, setChecking] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setChecking(true);
    setError('');
    setDependencies(null);
    setTypedName('');
    void inspectProjectDeletion(project.id)
      .then((counts) => {
        if (active) setDependencies(counts);
      })
      .catch((err: unknown) => {
        if (active) setError(
          err instanceof ProjectDeletionBlockedError ? err.message : formatProjectWriteError(err),
        );
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, [project.id]);

  const blockedMessage = dependencies ? projectDeletionBlockedMessage(dependencies) : null;
  const canDelete = isAdmin && Boolean(profile) && !checking && !deleting &&
    !error && !blockedMessage && typedName.trim() === project.name;

  const handleDelete = async () => {
    if (!canDelete || !profile) return;
    setDeleting(true);
    setError('');
    try {
      await deleteProject(project.id, project.name, {
        id: profile.uid,
        name: profile.name,
        email: profile.email,
      });
      onDeleted();
    } catch (err) {
      setError(err instanceof ProjectDeletionBlockedError ? err.message : formatProjectWriteError(err));
      // Never let the stale confirmation remain armed after any failed deletion.
      setTypedName('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div role="presentation" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-project-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 flex items-start justify-between bg-[#0e213e] text-white">
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-rose-400" aria-hidden="true" />
            <h2 id="delete-project-title" className="font-bold text-base">Excluir projeto definitivamente</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={onClose} disabled={deleting} className="text-slate-300 hover:text-white disabled:opacity-50 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          <p className="text-slate-700">
            Você está prestes a excluir <strong className="text-slate-950">{project.name}</strong>.
            A ação não pode ser desfeita. O histórico de auditoria será preservado.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              {checking
                ? 'Conferindo vínculos no Firestore...'
                : dependencies
                  ? `Vínculos encontrados: ${dependencies.tasks} demanda(s) e ${dependencies.events} compromisso(s).`
                  : 'Não foi possível verificar os vínculos do projeto.'}
              {blockedMessage && <p className="mt-2 font-semibold">{blockedMessage}</p>}
            </div>
          </div>

          {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 border border-rose-200 text-rose-700 text-xs">{error}</p>}

          {!blockedMessage && (
            <label className="block space-y-1.5">
              <span className="block text-xs font-semibold text-slate-700">
                Para confirmar, digite exatamente: <strong>{project.name}</strong>
              </span>
              <input
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                disabled={checking || deleting || Boolean(error)}
                placeholder="Nome completo do projeto"
                autoComplete="off"
                className="w-full h-10 border border-slate-300 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:bg-slate-100"
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button type="button" disabled={deleting} onClick={onClose} className="px-4 py-2 text-xs border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={() => void handleDelete()}
            className="px-4 py-2 text-xs rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? 'Excluindo...' : 'Excluir definitivamente'}
          </button>
        </div>
      </section>
    </div>
  );
};
