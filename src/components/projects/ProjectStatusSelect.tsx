import React, { useState } from 'react';
import type { Project, ProjectStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatProjectWriteError, updateProjectStatus } from '../../services/db';

const statuses: Exclude<ProjectStatus, 'Arquivado'>[] = [
  'Planejamento', 'Ativo', 'Bloqueado', 'Em validação', 'Concluído',
];

const statusStyle: Record<ProjectStatus, string> = {
  Planejamento: 'bg-slate-200 text-slate-800',
  Ativo: 'bg-blue-600 text-white',
  Bloqueado: 'bg-rose-600 text-white',
  'Em validação': 'bg-amber-500 text-white',
  Concluído: 'bg-emerald-600 text-white',
  Arquivado: 'bg-slate-700 text-white',
};

export const ProjectStatusSelect: React.FC<{ project: Project }> = ({ project }) => {
  const { profile, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = Boolean(
    profile?.status === 'active' &&
    !project.isArchived &&
    project.status !== 'Arquivado' &&
    (isAdmin || (project.memberIds || []).includes(profile.uid)),
  );
  const badgeClass = `rounded-full px-2.5 py-1 text-[10px] font-bold ${statusStyle[project.status] || statusStyle.Planejamento}`;

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.stopPropagation();
    if (!canEdit || !profile || saving) return;
    const nextStatus = event.target.value as ProjectStatus;
    if (nextStatus === project.status) return;
    setError('');
    setSaving(true);
    try {
      await updateProjectStatus(project, nextStatus, {
        id: profile.uid,
        name: profile.name,
        email: profile.email,
      });
    } catch (err) {
      setError(formatProjectWriteError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) return <span className={badgeClass}>{project.status}</span>;

  return (
    <div className="inline-flex flex-col items-start gap-1" onClick={(event) => event.stopPropagation()}>
      <select
        aria-label={`Alterar status do projeto ${project.name}`}
        title="Alterar status do projeto"
        value={project.status}
        disabled={saving}
        onChange={handleChange}
        className={`${badgeClass} max-w-36 cursor-pointer border-0 outline-offset-2 disabled:opacity-60`}
      >
        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      {error && <span role="alert" className="max-w-64 text-[11px] font-medium text-rose-700">{error}</span>}
    </div>
  );
};
