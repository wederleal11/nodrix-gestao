import React, { useEffect, useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { Task, TaskImage, Project, UserProfile, PriorityLevel } from '../../types';
import {
  saveTask,
  updateTaskStatus,
  submitTaskForValidation,
  validateDelivery,
  reportTaskBlocker,
  resolveTaskBlocker,
  deleteTask,
  attachTaskImage,
  detachTaskImage,
} from '../../services/db';
import { TaskImages } from '../tasks/TaskImages';
import { deleteTaskImageBlob, formatTaskImageError, MAX_TASK_IMAGES, uploadTaskImage, validateTaskImage } from '../../services/taskImages';
import { useAuth } from '../../context/AuthContext';
import {
  formatDateBR,
  formatDateTimeBR,
  isOverdue,
} from '../../utils/formatters';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  projects: Project[];
  users: UserProfile[];
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onEdit,
  projects,
  users,
}) => {
  const { activeProfile, profile, isAdmin } = useAuth();

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [deliverySummary, setDeliverySummary] = useState('');
  const [deliveryEvidence, setDeliveryEvidence] = useState('');

  const [showValidationReview, setShowValidationReview] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [showBlockerModal, setShowBlockerModal] = useState(false);
  const [blockerReason, setBlockerReason] = useState('');
  const [blockerDependency, setBlockerDependency] = useState('');
  const [blockerNextAction, setBlockerNextAction] = useState('');
  const [blockerActionOwner, setBlockerActionOwner] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    setImageError('');
    setImageBusy(false);
  }, [task?.id]);

  const addImages = async (files: File[]) => {
    if (!task || !profile || imageBusy) return;
    setImageError('');
    const validFiles = files.filter((file) => {
      const error = validateTaskImage(file);
      if (error) setImageError(error);
      return !error;
    });
    const slots = MAX_TASK_IMAGES - (task.images?.length || 0);
    if (validFiles.length > slots) {
      setImageError(`Limite de ${MAX_TASK_IMAGES} imagens. Existem ${task.images?.length || 0} salvas.`);
      return;
    }
    if (!validFiles.length) return;
    setImageBusy(true);
    try {
      for (const file of validFiles) {
        const uploaded = await uploadTaskImage(task.id, file, profile.uid);
        try {
          await attachTaskImage(task.id, uploaded);
        } catch (err) {
          await deleteTaskImageBlob(uploaded).catch(() => {});
          throw err;
        }
      }
    } catch (err) {
      setImageError(formatTaskImageError(err));
    } finally {
      setImageBusy(false);
    }
  };

  const removeImage = async (image: TaskImage) => {
    if (!task || !profile || imageBusy || image.uploadedBy !== profile.uid) return;
    if (!window.confirm(`Remover a imagem "${image.name}" desta demanda?`)) return;
    setImageError('');
    setImageBusy(true);
    try {
      // Remove the reference first to avoid dangling links if Storage is unavailable.
      await detachTaskImage(task.id, image);
      try {
        await deleteTaskImageBlob(image);
      } catch {
        setImageError('A imagem saiu da demanda, mas o arquivo não pôde ser limpo do Storage. Informe o gestor.');
      }
    } catch (err) {
      setImageError(formatTaskImageError(err));
    } finally {
      setImageBusy(false);
    }
  };

  const onPasteImages = (event: React.ClipboardEvent) => {
    if (imageBusy || !profile) return;
    const images = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile()).filter((file): file is File => file !== null);
    if (images.length) {
      event.preventDefault();
      void addImages(images);
    }
  };

  if (!task) return null;

  const overdue = isOverdue(task.deadline, task.status);
  const isAssignee = activeProfile?.uid === task.assigneeId;
  const canApprove = isAdmin || (activeProfile?.uid !== task.assigneeId);
  const isSelfApproval = activeProfile?.uid === task.assigneeId;

  const handleToggleChecklist = async (itemId: string) => {
    if (!task.checklist) return;
    const updatedChecklist = task.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    const updatedTask = { ...task, checklist: updatedChecklist };
    await saveTask(
      updatedTask,
      {
        id: activeProfile?.uid || '',
        name: activeProfile?.name || '',
        email: activeProfile?.email || '',
      },
      false
    );
  };

  const handleStartTask = async () => {
    if (!task.assigneeId) {
      setActionError('Uma demanda precisa de responsável para entrar em andamento.');
      return;
    }
    if (!task.expectedResult?.trim()) {
      setActionError('Uma demanda precisa de resultado esperado definido antes de ser iniciada.');
      return;
    }
    setIsProcessing(true);
    setActionError('');
    try {
      await updateTaskStatus(
        task.id,
        task.title,
        'in_progress',
        {
          id: activeProfile?.uid || '',
          name: activeProfile?.name || '',
          email: activeProfile?.email || '',
        }
      );
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao iniciar tarefa.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverySummary.trim() || !deliveryEvidence.trim()) {
      setActionError('Descrição da entrega e evidência verificável são obrigatórias.');
      return;
    }

    setIsProcessing(true);
    setActionError('');
    try {
      await submitTaskForValidation(
        task.id,
        task.title,
        { deliverySummary, deliveryEvidence },
        {
          id: activeProfile?.uid || '',
          name: activeProfile?.name || '',
          email: activeProfile?.email || '',
        }
      );
      setShowSubmitModal(false);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao enviar para validação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateDecision = async (decision: 'approved' | 'rejected') => {
    if (isSelfApproval && !isAdmin) {
      setActionError('Violação de Governança: Ninguém pode aprovar a própria entrega.');
      return;
    }
    if (decision === 'rejected' && !rejectionReason.trim()) {
      setActionError('Para devolver a entrega, informe o motivo claro.');
      return;
    }

    setIsProcessing(true);
    setActionError('');
    try {
      await validateDelivery(
        task.id,
        task.title,
        decision,
        rejectionReason,
        {
          id: activeProfile?.uid || '',
          name: activeProfile?.name || '',
          email: activeProfile?.email || '',
        }
      );
      setShowValidationReview(false);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao processar validação.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerReason.trim() || !blockerNextAction.trim()) {
      setActionError('Motivo e próxima ação são obrigatórios.');
      return;
    }

    setIsProcessing(true);
    setActionError('');
    try {
      await reportTaskBlocker(
        task.id,
        task.title,
        {
          blockerReason,
          blockerDependency,
          blockerNextAction,
          blockerActionOwner: blockerActionOwner || activeProfile?.name || 'Gestor',
        },
        {
          id: activeProfile?.uid || '',
          name: activeProfile?.name || '',
          email: activeProfile?.email || '',
        }
      );
      setShowBlockerModal(false);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao registrar bloqueio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveBlocker = async () => {
    setIsProcessing(true);
    setActionError('');
    try {
      await resolveTaskBlocker(
        task.id,
        task.title,
        {
          id: activeProfile?.uid || '',
          name: activeProfile?.name || '',
          email: activeProfile?.email || '',
        }
      );
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao desbloquear.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Excluir a demanda "${task.title}"?`)) return;
    try {
      await deleteTask(task.id, task.title, {
        id: activeProfile?.uid || '',
        name: activeProfile?.name || '',
        email: activeProfile?.email || '',
      });
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Falha ao excluir demanda.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      onPaste={onPasteImages}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
      onDrop={(event) => {
        if (event.defaultPrevented || !event.dataTransfer.files.length) return;
        event.preventDefault();
        void addImages(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh]">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                  task.priority === 'P0' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {task.priority}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 text-slate-200">
                {task.status}
              </span>
              {overdue && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-red-600 text-white rounded">
                  ATRASADA
                </span>
              )}
            </div>
            <h2 className="text-[17px] font-bold text-white tracking-tight mt-1">
              {task.title}
            </h2>
            <p className="text-xs text-slate-300 font-normal">
              Projeto: {task.projectName} • Responsável: {task.assigneeName || 'Não atribuído'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(isAdmin || isAssignee) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition-colors"
                title="Editar demanda"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-slate-300 hover:text-red-400 rounded hover:bg-slate-800 cursor-pointer transition-colors"
                title="Excluir demanda"
              >
                <Trash2 className="w-4 h-4" />
              </button>
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
          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {actionError}
            </div>
          )}

          {/* Metadata bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">PROJETO</span>
              <strong className="text-slate-900 text-xs">{task.projectName}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">RESPONSÁVEL</span>
              <strong className="text-slate-900 text-xs">{task.assigneeName || 'Não atribuído'}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">PRAZO</span>
              <strong className={`text-xs ${overdue ? 'text-red-600 font-bold' : 'text-slate-900'}`}>
                {formatDateBR(task.deadline)}
              </strong>
            </div>
          </div>

          {/* Blocker alert if blocked */}
          {task.status === 'blocked' && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-700 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Impedimento Ativo
                </span>
                <button
                  type="button"
                  onClick={handleResolveBlocker}
                  disabled={isProcessing}
                  className="px-3 py-1 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer shadow-xs"
                >
                  Resolver Impedimento
                </button>
              </div>
              <p><strong>Motivo:</strong> {task.blockerReason}</p>
              {task.blockerDependency && <p><strong>Dependência:</strong> {task.blockerDependency}</p>}
              <p><strong>Próxima ação:</strong> {task.blockerNextAction} ({task.blockerActionOwner})</p>
            </div>
          )}

          {/* Validation Notice Box */}
          {task.status === 'awaiting_validation' && (
            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-950 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Entrega Aguardando Validação
                </span>
                {canApprove && (
                  <button
                    type="button"
                    onClick={() => setShowValidationReview(true)}
                    className="px-3.5 py-1 text-xs font-semibold bg-[#004e9a] text-white rounded-md hover:bg-[#003d7a] cursor-pointer shadow-xs"
                  >
                    Avaliar Entrega
                  </button>
                )}
              </div>
              <p><strong>O que foi entregue:</strong> {task.deliverySummary}</p>
              <p>
                <strong>Evidência:</strong>{' '}
                {task.deliveryEvidence?.startsWith('http') ? (
                  <a href={task.deliveryEvidence} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 font-medium">
                    {task.deliveryEvidence}
                  </a>
                ) : (
                  task.deliveryEvidence
                )}
              </p>
              {isSelfApproval && !isAdmin && (
                <p className="text-[11px] text-amber-700 italic">
                  * Regra de governança: O responsável que entregou não pode validar a própria demanda.
                </p>
              )}
            </div>
          )}

          {/* Completed validation info */}
          {task.status === 'completed' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Entrega validada e aprovada por {task.validatorName || 'Gestor'} em {formatDateTimeBR(task.validatedAt)}</span>
            </div>
          )}

          {/* Expected Result & Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-blue-600 uppercase block mb-1">
                Resultado Esperado
              </span>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed text-xs">
                {task.expectedResult || 'Sem resultado formal definido.'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-emerald-600 uppercase block mb-1">
                Critérios de Aceite
              </span>
              <p className="text-slate-800 whitespace-pre-line leading-relaxed text-xs">
                {task.acceptanceCriteria || 'Critérios padrão de homologação.'}
              </p>
            </div>
          </div>

          {/* Checklist */}
          {task.checklist && task.checklist.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-semibold text-slate-700 block text-xs">
                Checklist ({task.checklist.filter(i => i.done).length}/{task.checklist.length})
              </span>
              <div className="space-y-1">
                {task.checklist.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklist(item.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className={item.done ? 'line-through text-slate-400 text-xs' : 'text-slate-800 text-xs'}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {task.links && task.links.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="font-semibold text-slate-700 block text-xs">Links e referências</span>
              <div className="flex flex-wrap gap-2">
                {task.links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 text-blue-600 rounded hover:underline"
                  >
                    {link.title} <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <TaskImages
              images={task.images || []}
              onFiles={(files) => void addImages(files)}
              onRemoveExisting={(image) => void removeImage(image)}
              canRemove={(image) => Boolean(profile?.uid && image.uploadedBy === profile.uid)}
              disabled={imageBusy}
              busy={imageBusy}
            />
            {imageError && <p role="alert" className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-2">{imageError}</p>}
          </div>

          {/* RELACIONA ACTION FOOTER */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(task.status === 'backlog' || task.status === 'planned') && (
                <button
                  type="button"
                  onClick={handleStartTask}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                >
                  Iniciar execução
                </button>
              )}

              {task.status === 'in_progress' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                  >
                    Submeter para validação
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBlockerModal(true)}
                    className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    Reportar bloqueio
                  </button>
                </>
              )}

              {task.status === 'awaiting_validation' && canApprove && (
                <button
                  type="button"
                  onClick={() => setShowValidationReview(true)}
                  className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white font-medium rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                >
                  Avaliar entrega
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-xs cursor-pointer transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

        {/* SUBMODAL: SUBMETER VALIDAÇÃO (Print 2 style) */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Submeter entrega para validação</h3>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">Campos com <span className="text-red-400">*</span> são obrigatórios.</p>
                </div>
                <button onClick={() => setShowSubmitModal(false)} className="text-slate-300 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs bg-white">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    O que foi entregue? <span className="text-red-500 font-semibold">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={deliverySummary}
                    onChange={(e) => setDeliverySummary(e.target.value)}
                    placeholder="Descrição objetiva da entrega realizada..."
                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Evidência verificável (Link ou PR) <span className="text-red-500 font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryEvidence}
                    onChange={(e) => setDeliveryEvidence(e.target.value)}
                    placeholder="https://github.com/... ou link de homologação"
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                    required
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-5 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitValidation}
                    disabled={isProcessing}
                    className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg text-xs shadow-xs transition-colors"
                  >
                    Confirmar envio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMODAL: AVALIAR ENTREGA (Print 2 style) */}
        {showValidationReview && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Auditoria da entrega</h3>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">Valide critérios de aceite antes de homologar.</p>
                </div>
                <button onClick={() => setShowValidationReview(false)} className="text-slate-300 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4 text-xs bg-white">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-slate-700">
                  <p><strong>Entregue por:</strong> {task.assigneeName}</p>
                  <p><strong>Resumo:</strong> {task.deliverySummary}</p>
                  <p className="truncate"><strong>Evidência:</strong> {task.deliveryEvidence}</p>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Motivo (obrigatório se devolver)
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Se devolver, informe o ajuste necessário..."
                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowValidationReview(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValidateDecision('rejected')}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs shadow-xs"
                  >
                    Devolver
                  </button>
                  <button
                    type="button"
                    onClick={() => handleValidateDecision('approved')}
                    disabled={isProcessing}
                    className="px-5 py-2 bg-[#059669] hover:bg-[#047857] text-white font-medium rounded-lg text-xs shadow-xs"
                  >
                    Aprovar entrega
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMODAL: REPORTAR BLOQUEIO (Print 2 style) */}
        {showBlockerModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Registrar impedimento</h3>
                  <p className="text-xs text-slate-300 font-normal mt-0.5">Campos com <span className="text-red-400">*</span> são obrigatórios.</p>
                </div>
                <button onClick={() => setShowBlockerModal(false)} className="text-slate-300 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-3.5 text-xs bg-white">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Motivo do bloqueio <span className="text-red-500 font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    value={blockerReason}
                    onChange={(e) => setBlockerReason(e.target.value)}
                    placeholder="Ex: Falta de credenciais da API"
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">Dependência externa</label>
                  <input
                    type="text"
                    value={blockerDependency}
                    onChange={(e) => setBlockerDependency(e.target.value)}
                    placeholder="Ex: Credenciais da API Legal One"
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Próxima ação <span className="text-red-500 font-semibold">*</span>
                  </label>
                  <input
                    type="text"
                    value={blockerNextAction}
                    onChange={(e) => setBlockerNextAction(e.target.value)}
                    placeholder="Ex: Alinhar no meet das 14h com cliente"
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                    required
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBlockerModal(false)}
                    className="px-5 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleReportBlocker}
                    disabled={isProcessing}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors"
                  >
                    Confirmar bloqueio
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
