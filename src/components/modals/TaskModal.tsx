import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import type { Task, Project, UserProfile, PriorityLevel, TaskStatus, ChecklistItem, TaskLink } from '../../types';
import { saveTask } from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { TaskImages, type PendingTaskImage } from '../tasks/TaskImages';
import { deleteTaskImageBlob, formatTaskImageError, MAX_TASK_IMAGES, uploadTaskImage, validateTaskImage } from '../../services/taskImages';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  users: UserProfile[];
  initialTask?: Task | null;
  defaultProjectId?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  users,
  initialTask,
  defaultProjectId,
}) => {
  const { profile } = useAuth();

  const [projectId, setProjectId] = useState(
    initialTask?.projectId || defaultProjectId || (projects[0]?.id || '')
  );
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [expectedResult, setExpectedResult] = useState(initialTask?.expectedResult || '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(initialTask?.acceptanceCriteria || '');
  const [assigneeId, setAssigneeId] = useState(initialTask?.assigneeId || '');
  const [priority, setPriority] = useState<PriorityLevel>(initialTask?.priority || 'P2');
  const [status, setStatus] = useState<TaskStatus>(initialTask?.status || 'planned');
  const [deadline, setDeadline] = useState(initialTask?.deadline || '');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initialTask?.checklist || []);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [links, setLinks] = useState<TaskLink[]>(initialTask?.links || []);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingTaskImage[]>([]);
  const [imageError, setImageError] = useState('');
  const pendingRef = useRef<PendingTaskImage[]>([]);
  useEffect(() => { pendingRef.current = pendingImages; }, [pendingImages]);
  useEffect(() => () => {
    pendingRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, []);

  const queueImages = (files: File[]) => {
    setImageError('');
    const accepted: PendingTaskImage[] = [];
    for (const file of files) {
      const invalid = validateTaskImage(file);
      if (invalid) { setImageError(invalid); continue; }
      if ((initialTask?.images?.length || 0) + pendingRef.current.length + accepted.length >= MAX_TASK_IMAGES) {
        setImageError(`Limite de ${MAX_TASK_IMAGES} imagens por demanda.`);
        break;
      }
      accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) {
      pendingRef.current = [...pendingRef.current, ...accepted];
      setPendingImages(pendingRef.current);
    }
  };

  const removePendingImage = (id: string) => {
    const removed = pendingRef.current.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    pendingRef.current = pendingRef.current.filter((image) => image.id !== id);
    setPendingImages(pendingRef.current);
  };

  const onPasteImages = (event: React.ClipboardEvent) => {
    if (isSubmitting) return;
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile()).filter((file): file is File => file !== null);
    if (files.length) {
      event.preventDefault();
      queueImages(files);
    }
  };

  // Collapsible section like print 2
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      { id: Date.now().toString(), text: newChecklistText.trim(), done: false },
    ]);
    setNewChecklistText('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    setLinks([...links, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('O título da demanda é obrigatório.');
      return;
    }

    if (!projectId) {
      setErrorMessage('Selecione um projeto para a demanda.');
      return;
    }

    if (status === 'in_progress') {
      if (!assigneeId) {
        setErrorMessage('Para colocar a demanda "Em andamento", um responsável principal é obrigatório.');
        return;
      }
      if (!expectedResult.trim()) {
        setErrorMessage('Para colocar a demanda "Em andamento", o resultado esperado é obrigatório.');
        return;
      }
    }

    const selectedProject = projects.find((p) => p.id === projectId);
    const selectedAssignee = users.find((u) => u.uid === assigneeId);

    const taskId = initialTask?.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const taskData: Task = {
      ...(initialTask || {}),
      id: taskId,
      projectId,
      projectName: selectedProject?.name || 'Projeto',
      title: title.trim(),
      description: description.trim(),
      expectedResult: expectedResult.trim(),
      acceptanceCriteria: acceptanceCriteria.trim(),
      assigneeId,
      assigneeName: selectedAssignee?.name || '',
      priority,
      status: initialTask?.status || status,
      deadline,
      checklist,
      links,
      images: initialTask?.images || [],
      createdById: initialTask?.createdById || profile?.uid || 'system',
      createdAt: initialTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!profile || profile.status !== 'active') {
      setErrorMessage('Entre com uma conta ativa para salvar a demanda.');
      return;
    }

    const uploadedImages: Task['images'] = [];
    let saved = false;
    try {
      setIsSubmitting(true);
      // Upload before saving: the task is never created with a partial image list.
      for (const pending of pendingRef.current) {
        const uploaded = await uploadTaskImage(taskId, pending.file, profile.uid);
        uploadedImages.push(uploaded);
      }
      await saveTask(
        { ...taskData, images: [...(initialTask?.images || []), ...uploadedImages] },
        { id: profile.uid, name: profile.name, email: profile.email },
        !initialTask
      );
      saved = true;
      onClose();
    } catch (err: unknown) {
      setErrorMessage(formatTaskImageError(err));
    } finally {
      // Reclaim newly uploaded objects when Firestore refused the write.
      if (!saved && uploadedImages.length) {
        await Promise.allSettled(uploadedImages.map((image) => deleteTaskImageBlob(image)));
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-6 max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              {initialTask ? 'Editar demanda' : 'Nova demanda de trabalho'}
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Cadastre objetivos claros, resultados verificáveis e responsável direto. Campos com <span className="text-red-400">*</span> são obrigatórios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form
          onSubmit={handleSubmit}
          onPaste={onPasteImages}
          onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
          onDrop={(event) => {
            if (event.defaultPrevented || !event.dataTransfer.files.length) return;
            event.preventDefault();
            queueImages(Array.from(event.dataTransfer.files));
          }}
          className="p-6 space-y-4 bg-white text-xs overflow-y-auto"
        >
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium text-xs">
              {errorMessage}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Título da demanda <span className="text-red-500 font-semibold">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Conciliar atos do Legal One com as publicações Nolasco"
              className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              required
            />
          </div>

          {/* Project & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Projeto <span className="text-red-500 font-semibold">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
                required
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isArchived ? '(Arquivado)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Responsável principal
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
              >
                <option value="">Sem responsável definido</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name} ({u.role === 'admin' ? 'Gestor' : 'Dev'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority, Initial status & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer font-medium"
              >
                <option value="P0">P0 — Crítica (Foco absoluto)</option>
                <option value="P1">P1 — Alta</option>
                <option value="P2">P2 — Normal</option>
                <option value="P3">P3 — Melhoria futura</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Status inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
              >
                <option value="backlog">Backlog</option>
                <option value="planned">Planejada (Compromisso)</option>
                <option value="in_progress">Em andamento</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Prazo de entrega
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          {/* Objective Description */}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Descrição objetiva
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contexto direto da demanda sem prolixidade..."
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
            />
          </div>

          {/* Expected Result & Acceptance Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Resultado esperado (O que será entregue?)
              </label>
              <textarea
                rows={2}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                placeholder="Ex: Tabela comparativa e correções homologadas..."
                className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Critérios de aceite (Como validar?)
              </label>
              <textarea
                rows={2}
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                placeholder="Ex: Nenhuma publicação com discrepância de data..."
                className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
              />
            </div>
          </div>

          <TaskImages
            images={initialTask?.images || []}
            pending={pendingImages}
            onFiles={queueImages}
            onRemovePending={removePendingImage}
            disabled={isSubmitting}
            busy={isSubmitting && pendingImages.length > 0}
          />
          {imageError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{imageError}</p>}

          {/* Collapsible Section: Observações internas e checklist (Print 2 style) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs text-slate-600 font-medium hover:text-slate-900 cursor-pointer transition-colors"
            >
              {showAdvanced ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span>Observações internas, checklist e referências ({checklist.length + links.length})</span>
            </button>

            {showAdvanced && (
              <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3.5 animate-in fade-in duration-100">
                {/* Checklist */}
                <div>
                  <span className="font-semibold text-slate-700 text-xs block mb-1.5">
                    Itens de Checklist ({checklist.length})
                  </span>
                  <div className="space-y-1.5 mb-2">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-1.5 px-3 rounded bg-white border border-slate-200">
                        <span className="text-xs text-slate-700 truncate">{item.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder="Adicionar item de verificação..."
                      className="flex-1 h-8 px-2.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-[#004e9a]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="px-3 h-8 text-xs font-medium bg-slate-200 hover:bg-slate-300 rounded-md text-slate-800 cursor-pointer"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>

                {/* Links */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 text-xs block mb-1.5">
                    Links e referências ({links.length})
                  </span>
                  <div className="space-y-1.5 mb-2">
                    {links.map((link, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded bg-white border border-slate-200">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline truncate">
                          {link.title}: {link.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="text-slate-400 hover:text-red-500 p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={(e) => setNewLinkTitle(e.target.value)}
                      placeholder="Título (ex: PR)"
                      className="w-1/3 h-8 px-2.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-[#004e9a]"
                    />
                    <input
                      type="url"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 h-8 px-2.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-[#004e9a]"
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-3 h-8 text-xs font-medium bg-slate-200 hover:bg-slate-300 rounded-md text-slate-800 cursor-pointer"
                    >
                      Adicionar
                    </button>
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
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Salvando...' : initialTask ? 'Atualizar demanda' : 'Cadastrar demanda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
