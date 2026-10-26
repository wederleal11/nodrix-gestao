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
  toggleTaskChecklistItem,
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
import { TaskAvatar, ProjectPill, DeadlinePill, resolveTaskAssignee } from '../tasks/TaskIdentity';
import { TaskActivityPanel } from '../tasks/TaskActivityPanel';
import { TaskQuickActivity } from '../tasks/TaskQuickActivity';
import { TaskChecklistPanel } from '../tasks/TaskChecklistPanel';
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
  const [detailTab, setDetailTab] = useState<'summary'|'activity'|'images'|'links'>('summary');
  const [checklistError, setChecklistError] = useState('');
  useEffect(() => { setDetailTab('summary'); setChecklistError(''); }, [task?.id]);
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
  const assignee = resolveTaskAssignee(users, task.assigneeId, task.assigneeName);
  const checklist = task.checklist || [];
  const pendingCount = (task.activity || []).filter((item) => item.kind === 'pending' && !item.resolved).length;
  const isAssignee = activeProfile?.uid === task.assigneeId;
  const canApprove = isAdmin || (activeProfile?.uid !== task.assigneeId);
  const isSelfApproval = activeProfile?.uid === task.assigneeId;

  const handleToggleChecklist = async (itemId: string) => {
    if (!task || !profile) return;
    setChecklistError('');
    try {
      await toggleTaskChecklistItem(task.id, itemId);
    } catch {
      setChecklistError('Não foi possível atualizar o checklist. Tente novamente.');
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3"
      onPaste={onPasteImages}
      onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
      onDrop={(event) => {
        if (event.defaultPrevented || !event.dataTransfer.files.length) return;
        event.preventDefault();
        void addImages(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[min(815px,96dvh)] overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-5 py-3 flex items-start justify-between shrink-0 gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-1 text-[10px] font-black text-white ${task.priority === 'P0' ? 'bg-red-600' : task.priority === 'P1' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                {task.priority}
              </span>
              <div className="max-w-[180px] min-w-0" title={task.projectName}>
                <ProjectPill id={task.projectId} name={task.projectName} />
              </div>
              <DeadlinePill deadline={task.deadline} status={task.status} />
            </div>
            <h2 className="text-[16px] font-bold text-white leading-snug mt-1">{task.title}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-white">
                <TaskAvatar user={assignee} name={task.assigneeName} />{task.assigneeName || 'Não atribuído'}
              </span>
              <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200">{task.status.replace(/_/g,' ')}</span>
              {(task.links || []).slice(0, 2).map((link, index) => {
                const validUrl = /^https?:\/\//i.test(link.url);
                return validUrl ? <a key={index} href={link.url} target="_blank" rel="noopener noreferrer"
                  title={link.title} className="inline-flex max-w-[170px] items-center gap-1 truncate rounded border border-slate-600 px-2 py-1 text-[11px] text-cyan-200 hover:bg-slate-700">
                    <ExternalLink className="w-3 h-3 shrink-0"/><span className="truncate">{link.title}</span>
                  </a> : null;
              })}
              {(task.links?.length || 0) > 2 && <button type="button" onClick={()=>setDetailTab('links')}
                className="text-[11px] text-cyan-200 font-bold hover:underline">+{task.links!.length-2} referências</button>}
            </div>
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
        <div className="px-5 py-3 text-xs flex-1 min-h-0 bg-white flex flex-col gap-3 overflow-hidden">
          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium">
              {actionError}
            </div>
          )}

          <div role="tablist" aria-label="Seções da demanda" className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 shrink-0">
            {([
              ['summary', 'Resumo'],
              ['activity', `Acompanhamento${pendingCount ? ` (${pendingCount})` : ''}`],
              ['images', `Imagens (${task.images?.length || 0})`],
              ['links', `Referências (${task.links?.length || 0})`],
            ] as const).map(([tab, label]) => <button key={tab} role="tab" aria-selected={detailTab === tab} type="button" onClick={() => setDetailTab(tab)}
              className={`rounded-md px-3 py-2 text-[11px] font-bold transition-colors ${detailTab === tab ? 'bg-[#004e9a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {label}
            </button>)}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
            {detailTab === 'summary' && (
              <div className="space-y-3">
                {task.description && <p className="rounded-md bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 line-clamp-2" title={task.description}>{task.description}</p>}
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


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                  <div className="rounded-lg border border-blue-200 bg-slate-50 px-3 py-2.5">
                    <strong className="block text-[11px] uppercase text-blue-700 mb-1">Resultado esperado</strong>
                    <p className="text-xs text-slate-800 whitespace-pre-line line-clamp-3" title={task.expectedResult}>{task.expectedResult || 'Não definido'}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-slate-50 px-3 py-2.5">
                    <strong className="block text-[11px] uppercase text-emerald-700 mb-1">Critérios de aceite</strong>
                    <p className="text-xs text-slate-800 whitespace-pre-line line-clamp-3" title={task.acceptanceCriteria}>{task.acceptanceCriteria || 'Não definidos'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                  <TaskChecklistPanel
                    key={task.id}
                    items={checklist}
                    onToggle={handleToggleChecklist}
                    error={checklistError}
                  />
                  <div className="flex flex-col gap-2 min-w-0">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <TaskImages compact images={task.images || []}
                        onViewAll={() => setDetailTab('images')}
                        onFiles={(files) => void addImages(files)}
                        onRemoveExisting={(image) => void removeImage(image)}
                        canRemove={(image) => Boolean(profile?.uid && image.uploadedBy === profile.uid)}
                        disabled={imageBusy} busy={imageBusy} />
                      {imageError && <p role="alert" className="mt-1 text-[11px] text-rose-700">{imageError}</p>}
                    </div>
                    <TaskQuickActivity key={task.id} task={task} onHistory={()=>setDetailTab('activity')} />
                  </div>
                </div>
              </div>
            )}
            {detailTab === 'activity' && <TaskActivityPanel key={task.id} task={task} />}
            {detailTab === 'images' && <div className="space-y-3">
              <TaskImages images={task.images || []} onFiles={(files) => void addImages(files)}
                onRemoveExisting={(image) => void removeImage(image)}
                canRemove={(image) => Boolean(profile?.uid && image.uploadedBy === profile.uid)}
                disabled={imageBusy} busy={imageBusy} />
              {imageError && <p role="alert" className="text-xs text-rose-700">{imageError}</p>}
            </div>}
            {detailTab === 'links' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(task.links || []).map((link,i) => <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-3 text-xs font-semibold text-blue-700 hover:border-blue-400 hover:bg-blue-50">
                    <span className="truncate">{link.title}</span><ExternalLink className="w-4 h-4 shrink-0" />
                  </a>)}
                {!task.links?.length && <p className="text-xs text-slate-500">Nenhum link cadastrado. Edite a demanda para adicionar referências.</p>}
              </div>
            )}
          </div>

          {/* RELACIONA ACTION FOOTER */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
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
