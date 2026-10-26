import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  getCountFromServer,
  getDocFromServer,
  writeBatch,
  query,
  arrayUnion,
  arrayRemove,
  runTransaction,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type {
  Project,
  ProjectStatus,
  Task,
  TaskImage,
  TaskActivity,
  UserProfile,
  WeeklyEvent,
  DailyCheckin,
  Feedback,
  PriorityRequest,
  AuditLog,
  PriorityLevel,
  TaskStatus,
  KanbanColumn,
} from '../types';

export const INITIAL_ADMIN_EMAIL = 'wederleal11@gmail.com';

// ==========================================
// AUDIT LOG
// ==========================================
export async function logAuditEvent(entry: {
  action: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  details: string;
  taskId?: string;
  projectId?: string;
}): Promise<void> {
  const path = 'audit_logs';
  try {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const logDoc: AuditLog = {
      id,
      action: entry.action,
      actorId: entry.actorId,
      actorName: entry.actorName,
      actorEmail: entry.actorEmail,
      details: entry.details,
      taskId: entry.taskId || '',
      projectId: entry.projectId || '',
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, path, id), logDoc);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Non-blocking in background, but log error
  }
}

// Firestore listeners invoke error handlers asynchronously. Throwing from an
// onSnapshot error callback can crash the UI after the Google session succeeds.
type SubscriptionErrorHandler = (error: { code?: string; message: string }) => void;

function reportFirestoreSubscriptionError(
  path: string,
  error: { code?: string; message: string },
  onError?: SubscriptionErrorHandler,
): void {
  console.error('Firestore live subscription failed:', { path, code: error.code });
  onError?.(error);
}

export function subscribeAuditLogs(
  onUpdate: (logs: AuditLog[]) => void,
  limitCount = 50
): Unsubscribe {
  const path = 'audit_logs';
  const q = query(collection(db, path), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const logs: AuditLog[] = [];
      snapshot.forEach((d) => logs.push(d.data() as AuditLog));
      onUpdate(logs.slice(0, limitCount));
    },
    (err) => reportFirestoreSubscriptionError(path, err)
  );
}

// ==========================================
// USERS & TEAM MEMBERS
// ==========================================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    // Remove undefined properties; Firestore rejects them even on a merge.
    const payload = Object.fromEntries(Object.entries(profile).filter(([, value]) => value !== undefined));
    await setDoc(doc(db, 'users', profile.uid), {
      ...payload,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUsers(onUpdate: (users: UserProfile[]) => void, onError?: SubscriptionErrorHandler): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const users: UserProfile[] = [];
      snapshot.forEach((d) => users.push(d.data() as UserProfile));
      onUpdate(users);
    },
    (err) => reportFirestoreSubscriptionError(path, err, onError)
  );
}

export async function deleteUser(uid: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    // Keep a tombstone so a returning Firebase Auth account is not silently
    // created as an active user again. Firebase Authentication deletion needs
    // an Admin SDK operation and must not be impersonated by the frontend.
    await updateDoc(doc(db, 'users', uid), {
      status: 'inactive',
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeCurrentUser(
  uid: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: SubscriptionErrorHandler,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snapshot) => onUpdate(snapshot.exists() ? snapshot.data() as UserProfile : null),
    (err) => reportFirestoreSubscriptionError(`users/${uid}`, err, onError),
  );
}

// ==========================================
// PROJECTS
// ==========================================
// Firestore-generated IDs avoid collisions with existing project names and seeded records.
export function createProjectId(): string {
  return doc(collection(db, 'projects')).id;
}

export function formatProjectWriteError(error: unknown): string {
  let detail = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(detail) as { error?: string };
    detail = parsed.error || detail;
  } catch {
    // Native Firebase errors are already plain text.
  }
  if (/permission-denied|missing or insufficient permissions/i.test(detail)) {
    return 'O Firestore recusou esta ação. Entre com uma conta gestora e confirme a publicação das regras de autorização do banco.';
  }
  if (/unavailable|offline|network|deadline-exceeded/i.test(detail)) {
    return 'Não foi possível acessar o banco agora. Verifique sua conexão e tente novamente; a alteração não foi confirmada.';
  }
  if (/undefined|invalid data|invalid argument/i.test(detail)) {
    return 'Há um campo inválido no projeto. Confira as informações preenchidas e tente novamente.';
  }
  return 'Não foi possível salvar a alteração. Tente novamente e, se continuar, informe o gestor.';
}

export async function updateProjectStatus(
  project: Project,
  status: ProjectStatus,
  actor: { id: string; name: string; email: string },
): Promise<void> {
  if (project.isArchived || project.status === 'Arquivado') {
    throw new Error('Reative o projeto antes de alterar seu status.');
  }
  if (!(['Planejamento', 'Ativo', 'Bloqueado', 'Em validação', 'Concluído'] as string[]).includes(status)) {
    throw new Error('Status de projeto inválido.');
  }
  if (project.status === status) return;
  const path = `projects/${project.id}`;
  try {
    // Narrow write: members are permitted to update only status + updatedAt.
    await updateDoc(doc(db, 'projects', project.id), {
      status,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'Alteração de Status do Projeto',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      projectId: project.id,
      details: `Alterou o status do projeto "${project.name}" de "${project.status}" para "${status}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
export function subscribeProjects(onUpdate: (projects: Project[]) => void, onError?: SubscriptionErrorHandler): Unsubscribe {
  const path = 'projects';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const projects: Project[] = [];
      snapshot.forEach((d) => projects.push(d.data() as Project));
      onUpdate(projects);
    },
    (err) => reportFirestoreSubscriptionError(path, err, onError)
  );
}

export async function saveProject(
  project: Project,
  actor: { id: string; name: string; email: string },
  isNew: boolean
): Promise<void> {
  const path = `projects/${project.id}`;
  try {
    // Firestore rejects undefined optional fields, even when they are valid in TypeScript.
    const payload = Object.fromEntries(
      Object.entries(project).filter(([, value]) => value !== undefined),
    );
    await setDoc(doc(db, 'projects', project.id), {
      ...payload,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: isNew ? 'Criação de Projeto' : 'Atualização de Projeto',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      projectId: project.id,
      details: `${isNew ? 'Criou' : 'Atualizou'} o projeto "${project.name}" (Status: ${project.status})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleArchiveProject(
  projectId: string,
  projectName: string,
  isArchived: boolean,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      isArchived,
      status: isArchived ? 'Arquivado' : 'Ativo',
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: isArchived ? 'Arquivamento de Projeto' : 'Desarquivamento de Projeto',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      projectId,
      details: `${isArchived ? 'Arquivou' : 'Reativou'} o projeto "${projectName}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Permanent project deletion is deliberately allowed only for empty projects.
 * Neither a project deletion nor Firestore document cascades remove global tasks
 * and weekly events automatically. Check both collections on the server.
 */
export interface ProjectDeletionDependencies {
  tasks: number;
  events: number;
}

export class ProjectDeletionBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectDeletionBlockedError';
  }
}

export function projectDeletionBlockedMessage({ tasks, events }: ProjectDeletionDependencies): string | null {
  if (tasks === 0 && events === 0) return null;
  const parts = [
    ...(tasks > 0 ? [`${tasks} demanda${tasks === 1 ? '' : 's'}`] : []),
    ...(events > 0 ? [`${events} compromisso${events === 1 ? '' : 's'} na agenda`] : []),
  ];
  return `Exclusão bloqueada: este projeto possui ${parts.join(' e ')}. Remova ou transfira esses registros antes de excluir o projeto.`;
}

export async function inspectProjectDeletion(projectId: string): Promise<ProjectDeletionDependencies> {
  const path = `projects/${projectId}`;
  try {
    const [project, taskCount, eventCount] = await Promise.all([
      getDocFromServer(doc(db, 'projects', projectId)),
      getCountFromServer(query(collection(db, 'tasks'), where('projectId', '==', projectId))),
      getCountFromServer(query(collection(db, 'weekly_events'), where('projectId', '==', projectId))),
    ]);
    if (!project.exists()) {
      throw new ProjectDeletionBlockedError('Este projeto não existe mais. Atualize a lista.');
    }
    return {
      tasks: taskCount.data().count,
      events: eventCount.data().count,
    };
  } catch (error) {
    if (error instanceof ProjectDeletionBlockedError) throw error;
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteProject(
  projectId: string,
  projectName: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `projects/${projectId}`;
  if (!actor.id) throw new ProjectDeletionBlockedError('Sessão expirada. Entre novamente antes de excluir.');
  try {
    // Recheck server-side data immediately before committing, not only when
    // the user opened the confirmation dialog.
    const dependencies = await inspectProjectDeletion(projectId);
    const blockedMessage = projectDeletionBlockedMessage(dependencies);
    if (blockedMessage) throw new ProjectDeletionBlockedError(blockedMessage);

    // One atomic Firestore write: deletion and immutable audit receipt.
    // Audits deliberately survive project deletion.
    const auditRef = doc(collection(db, 'audit_logs'));
    const audit: AuditLog = {
      id: auditRef.id,
      action: 'Exclusão de Projeto',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      projectId,
      taskId: '',
      details: `Excluiu definitivamente o projeto "${projectName}" (sem demandas ou compromissos vinculados)`,
      timestamp: new Date().toISOString(),
    };
    const batch = writeBatch(db);
    batch.delete(doc(db, 'projects', projectId));
    batch.set(auditRef, audit);
    await batch.commit();
  } catch (error) {
    if (error instanceof ProjectDeletionBlockedError) throw error;
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// TASKS
// ==========================================
export function subscribeTasks(onUpdate: (tasks: Task[]) => void, onError?: SubscriptionErrorHandler): Unsubscribe {
  const path = 'tasks';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((d) => tasks.push(d.data() as Task));
      onUpdate(tasks);
    },
    (err) => reportFirestoreSubscriptionError(path, err, onError)
  );
}

export async function saveTask(
  task: Task,
  actor: { id: string; name: string; email: string },
  isNew: boolean,
  newlyUploadedImages: TaskImage[] = [],
): Promise<void> {
  const path = `tasks/${task.id}`;
  try {
    const safeTask = Object.fromEntries(Object.entries(task).filter(([, value]) => value !== undefined));
    const taskRef = doc(db, 'tasks', task.id);
    if (isNew) {
      await setDoc(taskRef, { ...safeTask, updatedAt: new Date().toISOString() });
    } else {
      // Merge current attachments transactionally: a stale edit or checklist update
      // must never erase screenshots attached from another session.
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(taskRef);
        if (!snap.exists()) throw new Error('A demanda não existe mais. Atualize a lista.');
        const persisted = snap.data() as Task;
        const currentImages = persisted.images || [];
        const additions = newlyUploadedImages.filter((image) => !currentImages.some((saved) => saved.id === image.id));
        transaction.update(taskRef, {
          ...safeTask,
          // Operator activity and images are independently updated using atomic
          // field operations. Never replace them with stale form data.
          activity: persisted.activity || [],
          images: [...currentImages, ...additions],
          updatedAt: new Date().toISOString(),
        });
      });
    }
    await logAuditEvent({
      action: isNew ? 'Criação de Tarefa' : 'Atualização de Tarefa',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId: task.id,
      projectId: task.projectId,
      details: `${isNew ? 'Criou' : 'Atualizou'} a tarefa "${task.title}" (Prioridade: ${task.priority}, Responsável: ${task.assigneeName || 'Não atribuído'})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/** Atomic field-level additions prevent attachment uploads from overwriting task workflow changes. */
/** Checklist writes never replace attachments, comments or a newer task status. */
export async function toggleTaskChecklistItem(taskId: string, itemId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await runTransaction(db, async (transaction) => {
      const taskRef = doc(db, 'tasks', taskId);
      const snap = await transaction.get(taskRef);
      if (!snap.exists()) throw new Error('Demanda não encontrada. Atualize a tela.');
      const items: NonNullable<Task['checklist']> = snap.data().checklist || [];
      if (!items.some((item) => item.id === itemId)) throw new Error('Item de checklist não encontrado.');
      transaction.update(taskRef, {
        checklist: items.map((item) => item.id === itemId ? { ...item, done: !item.done } : item),
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addTaskActivity(taskId: string, item: TaskActivity): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      activity: arrayUnion(item),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveTaskPending(taskId: string, itemId: string, actorId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await runTransaction(db, async (tx) => {
      const taskRef = doc(db, 'tasks', taskId);
      const snap = await tx.get(taskRef);
      if (!snap.exists()) throw new Error('Esta demanda não existe mais.');
      const activity: TaskActivity[] = snap.data().activity || [];
      const index = activity.findIndex((item) => item.id === itemId && item.kind === 'pending');
      if (index < 0) throw new Error('Pendência não encontrada. Atualize a demanda.');
      if (activity[index].resolved) return;
      tx.update(taskRef, {
        activity: activity.map((item, i) => i === index
          ? { ...item, resolved: true, resolvedBy: actorId, resolvedAt: new Date().toISOString() }
          : item),
        updatedAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function attachTaskImage(taskId: string, image: TaskImage): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      images: arrayUnion(image),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function detachTaskImage(taskId: string, image: TaskImage): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      images: arrayRemove(image),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTaskStatus(
  taskId: string,
  taskTitle: string,
  newStatus: TaskStatus,
  actor: { id: string; name: string; email: string },
  additionalData?: Partial<Task>
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      ...(additionalData || {}),
    });
    await logAuditEvent({
      action: 'Mudança de Status da Tarefa',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Alterou o status da tarefa "${taskTitle}" para "${newStatus}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTaskAssignee(
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  assigneeName: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      assigneeId,
      assigneeName,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'Alteração de Responsável',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Atribuiu a tarefa "${taskTitle}" a "${assigneeName}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTaskPriority(
  taskId: string,
  taskTitle: string,
  priority: PriorityLevel,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      priority,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'Alteração de Prioridade',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Alterou a prioridade da tarefa "${taskTitle}" para ${priority}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function submitTaskForValidation(
  taskId: string,
  taskTitle: string,
  submission: {
    deliverySummary: string;
    deliveryEvidence: string;
  },
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'awaiting_validation',
      deliverySummary: submission.deliverySummary,
      deliveryEvidence: submission.deliveryEvidence,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'Envio para Validação',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Submeteu a entrega de "${taskTitle}" para validação com evidência`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function validateDelivery(
  taskId: string,
  taskTitle: string,
  decision: 'approved' | 'rejected',
  rejectionReason: string,
  validator: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    const isApproved = decision === 'approved';
    const newStatus: TaskStatus = isApproved ? 'completed' : 'in_progress';

    await updateDoc(doc(db, 'tasks', taskId), {
      status: newStatus,
      validatorId: validator.id,
      validatorName: validator.name,
      validatedAt: new Date().toISOString(),
      validationResult: decision,
      rejectionReason: isApproved ? '' : rejectionReason,
      updatedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      action: isApproved ? 'Validação Aprovada' : 'Entrega Devolvida',
      actorId: validator.id,
      actorName: validator.name,
      actorEmail: validator.email,
      taskId,
      details: isApproved
        ? `Aprovou a entrega da tarefa "${taskTitle}" como validada e concluída`
        : `Devolveu a tarefa "${taskTitle}" para execução. Motivo: ${rejectionReason}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function reportTaskBlocker(
  taskId: string,
  taskTitle: string,
  blocker: {
    blockerReason: string;
    blockerDependency: string;
    blockerNextAction: string;
    blockerActionOwner: string;
  },
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'blocked',
      blockerReason: blocker.blockerReason,
      blockerDependency: blocker.blockerDependency,
      blockerNextAction: blocker.blockerNextAction,
      blockerActionOwner: blocker.blockerActionOwner,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'Registro de Bloqueio',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Registrou impedimento em "${taskTitle}": ${blocker.blockerReason} (Próxima ação com ${blocker.blockerActionOwner})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveTaskBlocker(
  taskId: string,
  taskTitle: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'in_progress',
      blockerReason: '',
      blockerDependency: '',
      blockerNextAction: '',
      blockerActionOwner: '',
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: 'Desbloqueio de Tarefa',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Resolveu o impedimento da tarefa "${taskTitle}", retornando para execução`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTask(
  taskId: string,
  taskTitle: string,
  actor: { id: string; name: string; email: string }
): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
    await logAuditEvent({
      action: 'Exclusão de Tarefa',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      taskId,
      details: `Excluiu a tarefa "${taskTitle}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// WEEKLY EVENTS & AGENDA
// ==========================================
export function subscribeWeeklyEvents(onUpdate: (events: WeeklyEvent[]) => void, onError?: SubscriptionErrorHandler): Unsubscribe {
  const path = 'weekly_events';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const events: WeeklyEvent[] = [];
      snapshot.forEach((d) => events.push(d.data() as WeeklyEvent));
      onUpdate(events);
    },
    (err) => reportFirestoreSubscriptionError(path, err, onError)
  );
}

export async function saveWeeklyEvent(event: WeeklyEvent): Promise<void> {
  const path = `weekly_events/${event.id}`;
  try {
    await setDoc(doc(db, 'weekly_events', event.id), event);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteWeeklyEvent(eventId: string): Promise<void> {
  const path = `weekly_events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'weekly_events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// DAILY CHECK-INS & CHECK-OUTS
// ==========================================
export function subscribeDailyCheckins(
  dateStr: string,
  onUpdate: (checkins: DailyCheckin[]) => void
): Unsubscribe {
  const path = 'daily_checkins';
  const q = query(collection(db, path), where('date', '==', dateStr));
  return onSnapshot(
    q,
    (snapshot) => {
      const checkins: DailyCheckin[] = [];
      snapshot.forEach((d) => checkins.push(d.data() as DailyCheckin));
      onUpdate(checkins);
    },
    (err) => reportFirestoreSubscriptionError(path, err)
  );
}

export async function saveDailyCheckin(checkin: DailyCheckin): Promise<void> {
  const path = `daily_checkins/${checkin.id}`;
  try {
    await setDoc(doc(db, 'daily_checkins', checkin.id), checkin, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// FEEDBACKS (Confidential & RBAC)
// ==========================================
export function subscribeFeedbacks(
  currentUserId: string,
  isAdminUser: boolean,
  onUpdate: (feedbacks: Feedback[]) => void
): Unsubscribe {
  // Only administrators/managers can view sent and answered feedbacks
  if (!isAdminUser) {
    onUpdate([]);
    return () => {};
  }

  const path = 'feedbacks';
  const q = collection(db, path);

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Feedback[] = [];
      snapshot.forEach((d) => items.push(d.data() as Feedback));
      onUpdate(items);
    },
    (err) => reportFirestoreSubscriptionError(path, err)
  );
}

export async function saveFeedback(
  feedback: Feedback,
  actor: { id: string; name: string; email: string },
  isNew: boolean
): Promise<void> {
  const path = `feedbacks/${feedback.id}`;
  try {
    await setDoc(doc(db, 'feedbacks', feedback.id), {
      ...feedback,
      updatedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      action: isNew ? 'Novo Feedback Individual' : 'Atualização de Feedback',
      actorId: actor.id,
      actorName: actor.name,
      actorEmail: actor.email,
      details: `${isNew ? 'Registrou' : 'Atualizou'} feedback para ${feedback.userName} (${feedback.type.toUpperCase()})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  const path = `feedbacks/${feedbackId}`;
  try {
    await deleteDoc(doc(db, 'feedbacks', feedbackId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// PRIORITY CHANGE REQUESTS
// ==========================================
export function subscribePriorityRequests(
  onUpdate: (requests: PriorityRequest[]) => void,
  onError?: SubscriptionErrorHandler
): Unsubscribe {
  const path = 'priority_requests';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: PriorityRequest[] = [];
      snapshot.forEach((d) => items.push(d.data() as PriorityRequest));
      onUpdate(items);
    },
    (err) => reportFirestoreSubscriptionError(path, err, onError)
  );
}

export async function requestPriorityChange(requestItem: PriorityRequest): Promise<void> {
  const path = `priority_requests/${requestItem.id}`;
  try {
    await setDoc(doc(db, 'priority_requests', requestItem.id), requestItem);
    await logAuditEvent({
      action: 'Solicitação de Mudança de Prioridade',
      actorId: requestItem.requesterId,
      actorName: requestItem.requesterName,
      actorEmail: '',
      taskId: requestItem.taskId,
      details: `Solicitou mudança para ${requestItem.requestedPriority} na tarefa "${requestItem.taskTitle}". Justificativa: ${requestItem.reason}`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function resolvePriorityRequest(
  requestId: string,
  taskId: string,
  taskTitle: string,
  approvedPriority: PriorityLevel | null,
  reviewer: { id: string; name: string; email: string },
  approved: boolean
): Promise<void> {
  const path = `priority_requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'priority_requests', requestId), {
      status: approved ? 'approved' : 'rejected',
      reviewedById: reviewer.id,
      reviewedByName: reviewer.name,
      reviewedAt: new Date().toISOString(),
    });

    if (approved && approvedPriority) {
      await updateDoc(doc(db, 'tasks', taskId), {
        priority: approvedPriority,
        updatedAt: new Date().toISOString(),
      });
    }

    await logAuditEvent({
      action: approved ? 'Aprovação de Mudança de Prioridade' : 'Rejeição de Mudança de Prioridade',
      actorId: reviewer.id,
      actorName: reviewer.name,
      actorEmail: reviewer.email,
      taskId,
      details: approved
        ? `Aprovou a mudança de prioridade da tarefa "${taskTitle}" para ${approvedPriority}`
        : `Rejeitou a alteração de prioridade da tarefa "${taskTitle}"`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// SEED INITIAL TEMPLATES
// ==========================================
export async function seedInitialNodrixData(actor: { id: string; name: string; email: string }): Promise<void> {
  const defaultProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'createdById'>[] = [
    {
      name: 'Nolasco',
      client: 'Nolasco Advocacia',
      description: 'Plataforma jurídica especializada em acompanhamento e conciliação de publicações oficiais e processos.',
      leadId: actor.id,
      leadName: actor.name,
      memberIds: [actor.id],
      status: 'Ativo',
      priority: 'P0',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: '2026-11-30',
      nextMilestone: 'Conciliação e validação de publicações com Legal One',
      completionCriteria: 'Divergências de publicações 100% catalogadas, corrigidas e validadas em produção.',
      repoUrl: 'https://github.com/nodrix/nolasco-platform',
      isArchived: false,
    },
    {
      name: 'Relaciona V2',
      client: 'Nodrix Produtos',
      description: 'CRM e plataforma de atendimento multicanal com triagem inteligente e relatórios de satisfação.',
      leadId: actor.id,
      leadName: actor.name,
      memberIds: [actor.id],
      status: 'Ativo',
      priority: 'P1',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: '2026-12-15',
      nextMilestone: 'Módulo de pipeline de vendas e SLA de atendimento',
      completionCriteria: 'Fluxos de mensagens e relatórios em tempo real aprovados.',
      isArchived: false,
    },
    {
      name: 'Relaciona Indica',
      client: 'Nodrix Produtos',
      description: 'Gestão de programas de indicação, campanhas de afiliados e premiações com acompanhamento de conversões.',
      leadId: actor.id,
      leadName: actor.name,
      memberIds: [actor.id],
      status: 'Planejamento',
      priority: 'P2',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: '2027-01-30',
      nextMilestone: 'Definição da arquitetura e regras de remuneração',
      completionCriteria: 'Painel de indicação testado ponta a ponta com link rastreável.',
      isArchived: false,
    },
    {
      name: 'Nodrix Ponto Digital',
      client: 'Nodrix Tech',
      description: 'Gestão moderna de ponto eletrônico, banco de horas e conformidade com a portaria 671 do MTE.',
      leadId: actor.id,
      leadName: actor.name,
      memberIds: [actor.id],
      status: 'Planejamento',
      priority: 'P2',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: '2027-02-28',
      nextMilestone: 'Geolocalização e comprovante digital com assinatura hash',
      completionCriteria: 'Emissão de espelho de ponto e relatório AFD validado.',
      isArchived: false,
    },
  ];

  // Create initial projects
  for (const p of defaultProjects) {
    const id = p.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const existingSnap = await getDoc(doc(db, 'projects', id));
    if (!existingSnap.exists()) {
      const fullProj: Project = {
        ...p,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: actor.id,
      };
      await setDoc(doc(db, 'projects', id), fullProj);
    }
  }

  // Seed default demand from prompt spec:
  // "Validar com Matheus as publicações não localizadas" on project "nolasco"
  const defaultTaskId = 'task-validar-publicacoes-nolasco';
  const taskSnap = await getDoc(doc(db, 'tasks', defaultTaskId));
  if (!taskSnap.exists()) {
    const defaultTask: Task = {
      id: defaultTaskId,
      projectId: 'nolasco',
      projectName: 'Nolasco',
      title: 'Validar com Matheus as publicações não localizadas',
      description: 'Comparativo detalhado entre atos oficiais do Legal One e publicações capturadas no Nolasco.',
      expectedResult: 'Comparar os atos específicos identificados por Matheus, lado a lado, entre Legal One e Nolasco.',
      acceptanceCriteria: `- Casos reclamados identificados.\n- Verificação por processo e ato.\n- Resultado encontrado ou ausente registrado.\n- Divergências confirmadas separadas de suspeitas.\n- Causa identificada ou impedimento documentado.\n- Correções aplicáveis encaminhadas e validadas.`,
      assigneeId: 'bruno-nodrix',
      assigneeName: 'Bruno',
      priority: 'P0',
      status: 'planned',
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      plannedWeek: 'Atual',
      checklist: [
        { id: '1', text: 'Casos reclamados identificados junto ao Matheus', done: false },
        { id: '2', text: 'Verificação comparativa por processo e ato oficial', done: false },
        { id: '3', text: 'Resultado encontrado ou ausente registrado em planilha de conferência', done: false },
        { id: '4', text: 'Divergências confirmadas separadas de falsos positivos/suspeitas', done: false },
        { id: '5', text: 'Causa raiz identificada ou impedimento técnico documentado', done: false },
        { id: '6', text: 'Correções aplicáveis encaminhadas e validadas', done: false },
      ],
      links: [
        { title: 'Painel Nolasco', url: 'https://nolasco.nodrix.com.br' },
      ],
      createdById: actor.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'tasks', defaultTaskId), defaultTask);
  }

  // Seed default team members if they don't exist
  const defaultMembers: UserProfile[] = [
    {
      uid: actor.id,
      name: actor.name || 'Weder Leal',
      email: actor.email,
      role: 'admin',
      title: 'Gestor & Proprietário',
      availability: '40h semanais',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'jefferson-nodrix',
      name: 'Jefferson',
      email: 'jefferson@nodrix.com.br',
      role: 'collaborator',
      title: 'Desenvolvedor Full-Stack',
      availability: '40h semanais',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      uid: 'bruno-nodrix',
      name: 'Bruno',
      email: 'bruno@nodrix.com.br',
      role: 'collaborator',
      title: 'Desenvolvedor Backend & Integrações',
      availability: '40h semanais',
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ];

  for (const m of defaultMembers) {
    const memSnap = await getDoc(doc(db, 'users', m.uid));
    if (!memSnap.exists()) {
      await setDoc(doc(db, 'users', m.uid), m);
    }
  }
}

// ==========================================
// KANBAN COLUMNS (Customizable Workflow)
// ==========================================
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'BACKLOG',
    headerBg: 'bg-[#475569]',
    borderAccent: 'border-l-[#475569]',
    order: 0,
    isSystem: true,
  },
  {
    id: 'planned',
    title: 'PLANEJADO',
    headerBg: 'bg-[#5b52f9]',
    borderAccent: 'border-l-[#5b52f9]',
    order: 1,
    isSystem: true,
  },
  {
    id: 'in_progress',
    title: 'EM ANDAMENTO',
    headerBg: 'bg-[#d97706]',
    borderAccent: 'border-l-[#d97706]',
    order: 2,
    isSystem: true,
  },
  {
    id: 'blocked',
    title: 'BLOQUEADA',
    headerBg: 'bg-[#dc2626]',
    borderAccent: 'border-l-[#dc2626]',
    order: 3,
    isSystem: true,
  },
  {
    id: 'awaiting_validation',
    title: 'EM VALIDAÇÃO',
    headerBg: 'bg-[#0284c7]',
    borderAccent: 'border-l-[#0284c7]',
    order: 4,
    isSystem: true,
  },
  {
    id: 'completed',
    title: 'VALIDADA / CONCLUÍDA',
    headerBg: 'bg-[#059669]',
    borderAccent: 'border-l-[#059669]',
    order: 5,
    isSystem: true,
  },
];

export function subscribeKanbanColumns(
  onUpdate: (columns: KanbanColumn[]) => void
): Unsubscribe {
  const docRef = doc(db, 'system_settings', 'kanban_columns');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.columns && Array.isArray(data.columns) && data.columns.length > 0) {
          onUpdate(data.columns.sort((a: KanbanColumn, b: KanbanColumn) => a.order - b.order));
          return;
        }
      }
      onUpdate(DEFAULT_KANBAN_COLUMNS);
    },
    (err) => {
      console.warn('Error reading kanban columns:', err);
      onUpdate(DEFAULT_KANBAN_COLUMNS);
    }
  );
}

export async function saveKanbanColumns(
  columns: KanbanColumn[],
  actor?: { id: string; name: string; email: string }
): Promise<void> {
  const path = 'system_settings/kanban_columns';
  try {
    await setDoc(doc(db, 'system_settings', 'kanban_columns'), {
      columns,
      updatedAt: new Date().toISOString(),
      updatedBy: actor?.name || 'Sistema',
    });
    if (actor) {
      await logAuditEvent({
        action: 'Configuração de Colunas do Kanban',
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
        details: `Atualizou as listas de Kanban (${columns.length} colunas ativas)`,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

