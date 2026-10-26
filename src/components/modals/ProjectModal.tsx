import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import type { Project, ProjectStatus, PriorityLevel, UserProfile } from '../../types';
import { createProjectId, formatProjectWriteError, saveProject } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  initialProject?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  users,
  initialProject,
}) => {
  const { profile, isAdmin } = useAuth();

  const [name, setName] = useState(initialProject?.name || '');
  const [client, setClient] = useState(initialProject?.client || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [leadId, setLeadId] = useState(initialProject?.leadId || profile?.uid || '');
  const [status, setStatus] = useState<ProjectStatus>(initialProject?.status || 'Ativo');
  const [priority, setPriority] = useState<PriorityLevel>(initialProject?.priority || 'P1');
  const [startDate, setStartDate] = useState(initialProject?.startDate || new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState(initialProject?.targetDate || '');
  const [nextMilestone, setNextMilestone] = useState(initialProject?.nextMilestone || '');
  const [completionCriteria, setCompletionCriteria] = useState(initialProject?.completionCriteria || '');
  const [repoUrl, setRepoUrl] = useState(initialProject?.repoUrl || '');
  const [docsUrl, setDocsUrl] = useState(initialProject?.docsUrl || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This modal stays mounted while closed; reset its form on every open/edit switch.
  useEffect(() => {
    if (!isOpen) return;
    setName(initialProject?.name || '');
    setClient(initialProject?.client || '');
    setDescription(initialProject?.description || '');
    setLeadId(initialProject?.leadId || profile?.uid || '');
    setStatus(initialProject?.status || 'Ativo');
    setPriority(initialProject?.priority || 'P1');
    setStartDate(initialProject?.startDate || new Date().toISOString().split('T')[0]);
    setTargetDate(initialProject?.targetDate || '');
    setNextMilestone(initialProject?.nextMilestone || '');
    setCompletionCriteria(initialProject?.completionCriteria || '');
    setRepoUrl(initialProject?.repoUrl || '');
    setDocsUrl(initialProject?.docsUrl || '');
    setShowAdvanced(false);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, initialProject, profile?.uid]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('O nome do projeto é obrigatório.');
      return;
    }

    if (!profile || !isAdmin) {
      setErrorMessage('A criação e a edição completa de projetos exigem perfil gestor.');
      return;
    }

    const selectedLeadId = leadId || profile.uid;
    const leadUser = users.find((u) => u.uid === selectedLeadId);
    const projectId = initialProject?.id || createProjectId();

    const projectData: Project = {
      id: projectId,
      name: name.trim(),
      client: client.trim(),
      description: description.trim(),
      leadId: selectedLeadId,
      leadName: leadUser?.name || (selectedLeadId === profile.uid ? profile.name : initialProject?.leadName || 'Gestor'),
      memberIds: Array.from(new Set([...(initialProject?.memberIds || []), selectedLeadId])),
      status,
      priority,
      startDate,
      targetDate,
      nextMilestone: nextMilestone.trim(),
      completionCriteria: completionCriteria.trim(),
      repoUrl: repoUrl.trim(),
      docsUrl: docsUrl.trim(),
      isArchived: initialProject?.isArchived || false,
      createdById: initialProject?.createdById || profile.uid,
      createdAt: initialProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await saveProject(
        projectData,
        {
          id: profile.uid,
          name: profile.name,
          email: profile.email,
        },
        !initialProject
      );
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatProjectWriteError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              {initialProject ? 'Editar projeto' : 'Novo projeto'}
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Defina marcos claros, critérios de conclusão e liderança técnica. Campos com <span className="text-red-400">*</span> são obrigatórios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium text-xs">
              {errorMessage}
            </div>
          )}

          {/* Project Name & Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Nome do projeto <span className="text-red-500 font-semibold">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Nolasco"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Cliente / Área solicitante
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex: Nolasco Advocacia"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Descrição do projeto
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo principal da plataforma ou sistema..."
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
            />
          </div>

          {/* Lead, Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Líder técnico
              </label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                disabled={initialProject?.isArchived}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
              >
                <option value="Ativo">Ativo</option>
                <option value="Planejamento">Planejamento</option>
                <option value="Bloqueado">Bloqueado</option>
                <option value="Em validação">Em validação</option>
                <option value="Concluído">Concluído</option>
                {initialProject?.isArchived && <option value="Arquivado">Arquivado</option>}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Prioridade geral
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer font-medium"
              >
                <option value="P0">P0 — Crítica</option>
                <option value="P1">P1 — Alta</option>
                <option value="P2">P2 — Normal</option>
                <option value="P3">P3 — Melhoria</option>
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Data de início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Data-alvo / Previsão
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          {/* Next milestone */}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Próximo marco crítico
            </label>
            <input
              type="text"
              value={nextMilestone}
              onChange={(e) => setNextMilestone(e.target.value)}
              placeholder="Ex: Conciliação de publicações com Legal One validada"
              className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
            />
          </div>

          {/* Collapsible Section: Critérios e Repos (Print 2 style) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-slate-600 font-medium hover:text-slate-900 cursor-pointer transition-colors"
            >
              {showAdvanced ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span>Observações internas, critérios e repositórios</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3.5 animate-in fade-in duration-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Critério de conclusão do projeto
                  </label>
                  <textarea
                    rows={2}
                    value={completionCriteria}
                    onChange={(e) => setCompletionCriteria(e.target.value)}
                    placeholder="Condição objetiva para o projeto ser considerado 100% finalizado..."
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#004e9a]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Repositório Git
                    </label>
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/..."
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#004e9a]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Documentação
                    </label>
                    <input
                      type="url"
                      value={docsUrl}
                      onChange={(e) => setDocsUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:border-[#004e9a]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RELACIONA MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Salvando...' : initialProject ? 'Atualizar projeto' : 'Cadastrar projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
