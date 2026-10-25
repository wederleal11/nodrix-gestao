export type UserRole = 'admin' | 'collaborator';
export type UserStatus = 'active' | 'pending' | 'inactive';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  availability: string;
  phone?: string;
  document?: string;
  notes?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectStatus = 'Planejamento' | 'Ativo' | 'Bloqueado' | 'Em validação' | 'Concluído' | 'Arquivado';
export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

export interface Project {
  id: string;
  name: string;
  client?: string;
  description: string;
  leadId: string;
  leadName: string;
  memberIds: string[];
  status: ProjectStatus;
  priority: PriorityLevel;
  startDate: string;
  targetDate: string;
  nextMilestone: string;
  completionCriteria: string;
  repoUrl?: string;
  docsUrl?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export type TaskStatus = 
  | 'backlog' 
  | 'planned' 
  | 'in_progress' 
  | 'blocked' 
  | 'awaiting_validation' 
  | 'completed' 
  | 'cancelled'
  | (string & {});

export interface KanbanColumn {
  id: string; // Corresponds to task.status
  title: string;
  headerBg: string; // e.g. 'bg-[#5b52f9]' or hex
  borderAccent: string; // e.g. 'border-l-[#5b52f9]'
  order: number;
  isSystem?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskLink {
  title: string;
  url: string;
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  expectedResult: string;
  acceptanceCriteria: string;
  assigneeId?: string;
  assigneeName?: string;
  priority: PriorityLevel;
  status: TaskStatus;
  deadline?: string; // YYYY-MM-DD
  plannedWeek?: string; // e.g. "2026-W43"
  checklist?: ChecklistItem[];
  links?: TaskLink[];
  dependencies?: string;
  
  // Blocker details
  blockerReason?: string;
  blockerDependency?: string;
  blockerNextAction?: string;
  blockerActionOwner?: string;

  // Validation details
  deliverySummary?: string;
  deliveryEvidence?: string;
  submittedAt?: string;
  validatorId?: string;
  validatorName?: string;
  validatedAt?: string;
  validationResult?: 'approved' | 'rejected';
  rejectionReason?: string;

  // Audit
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type EventType = 'reuniao' | 'alinhamento' | 'visita' | 'validacao' | 'entrega' | 'outro';

export interface WeeklyEvent {
  id: string;
  title: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  projectId?: string;
  projectName?: string;
  assigneeIds: string[];
  description?: string;
  createdById: string;
  createdAt: string;
}

export interface DailyCheckin {
  id: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  morningPriority: string;
  morningGoal: string;
  morningBlocker?: string;
  eveningDelivered?: string;
  eveningEvidence?: string;
  eveningPending?: string;
  eveningNextStep?: string;
  submittedMorningAt?: string;
  submittedEveningAt?: string;
}

export type FeedbackType = 'reconhecimento' | 'orientacao' | 'alinhamento' | 'melhoria';
export type FeedbackStatus = 'em_acompanhamento' | 'evoluiu' | 'recorrente' | 'concluido';

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  date: string;
  type: FeedbackType;
  fact: string;
  impact: string;
  expectedBehavior: string;
  combinedCommitment: string;
  followUpDeadline?: string;
  followUpResult?: string;
  status: FeedbackStatus;
  sharedWithUser: boolean;
  privateManagerNote?: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriorityRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  requesterId: string;
  requesterName: string;
  requestedPriority: PriorityLevel;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  taskId?: string;
  projectId?: string;
  action: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  details: string;
  timestamp: string;
}
