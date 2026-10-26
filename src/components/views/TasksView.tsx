import React, { useState, useEffect } from 'react';
import {
  List,
  Kanban,
  Plus,
  Search,
  Filter,
  Eye,
  GripVertical,
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  Columns,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import type { Task, Project, UserProfile, PriorityLevel, TaskStatus, KanbanColumn } from '../../types';
import {
  formatDateBR,
  isOverdue,
} from '../../utils/formatters';
import {
  updateTaskStatus,
  subscribeKanbanColumns,
  saveKanbanColumns,
  DEFAULT_KANBAN_COLUMNS,
} from '../../services/db';
import { useAuth } from '../../context/AuthContext';
import { KanbanColumnModal } from '../modals/KanbanColumnModal';
import { TaskAvatar, ProjectPill } from '../tasks/TaskIdentity';
import { TaskBulkImportModal } from '../modals/TaskBulkImportModal';

interface TasksViewProps {
  tasks: Task[];
  projects: Project[];
  users: UserProfile[];
  onOpenTask: (task: Task) => void;
  onAddTask: () => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  projects,
  users,
  onOpenTask,
  onAddTask,
}) => {
  const { activeProfile, isAdmin } = useAuth();

  const [columnPages, setColumnPages] = useState<Record<string,number>>({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Kanban Columns state (customizable and persisted)
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_KANBAN_COLUMNS);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);

  // Drag and Drop state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Subscribe to live custom columns from Firestore
  useEffect(() => {
    const unsub = subscribeKanbanColumns((cols) => {
      setColumns(cols);
    });
    return () => unsub();
  }, []);

  const filteredTasks = tasks.filter((t) => {
    if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
    if (assigneeFilter !== 'all' && t.assigneeId !== assigneeFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      const matchAssignee = t.assigneeName?.toLowerCase().includes(q);
      const matchProject = t.projectName?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee && !matchProject) return false;
    }

    return true;
  });

  // DRAG AND DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving column container
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumnId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);

    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.status === targetStatus) return;

    try {
      setStatusFeedback(`Movendo "${task.title.slice(0, 30)}..." para ${targetStatus.toUpperCase()}`);
      await updateTaskStatus(
        taskId,
        task.title,
        targetStatus as TaskStatus,
        {
          id: activeProfile?.uid || 'user',
          name: activeProfile?.name || 'Usuário',
          email: activeProfile?.email || '',
        }
      );
      setTimeout(() => setStatusFeedback(null), 3000);
    } catch (err) {
      console.error('Erro ao mover demanda:', err);
      alert('Não foi possível mover a demanda.');
      setStatusFeedback(null);
    }
  };

  // COLUMN CREATION & EDITING HANDLERS
  const handleOpenAddColumn = () => {
    setEditingColumn(null);
    setIsColumnModalOpen(true);
  };

  const handleOpenEditColumn = (col: KanbanColumn) => {
    setEditingColumn(col);
    setIsColumnModalOpen(true);
  };

  const handleSaveColumn = async (savedCol: KanbanColumn) => {
    const actor = {
      id: activeProfile?.uid || '',
      name: activeProfile?.name || '',
      email: activeProfile?.email || '',
    };

    let updatedList: KanbanColumn[];
    const exists = columns.some((c) => c.id === savedCol.id);

    if (exists) {
      updatedList = columns.map((c) => (c.id === savedCol.id ? savedCol : c));
    } else {
      updatedList = [...columns, savedCol];
    }

    // Sort by order
    updatedList.sort((a, b) => a.order - b.order);

    setColumns(updatedList);
    await saveKanbanColumns(updatedList, actor);
  };

  const handleDeleteColumn = async (columnId: string) => {
    const actor = {
      id: activeProfile?.uid || '',
      name: activeProfile?.name || '',
      email: activeProfile?.email || '',
    };

    const updatedList = columns.filter((c) => c.id !== columnId);
    setColumns(updatedList);
    await saveKanbanColumns(updatedList, actor);
  };

  return (
    <div className="space-y-4">
      {/* Status Feedback Toast */}
      {statusFeedback && (
        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* 1. RELACIONA FILTER & ACTION BAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Dropdown selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 text-xs font-medium cursor-pointer"
          >
            <option value="all">Projeto: Todos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Situação: Todas</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Prioridade: Todas</option>
            <option value="P0">P0 — Crítica</option>
            <option value="P1">P1 — Alta</option>
            <option value="P2">P2 — Normal</option>
            <option value="P3">P3 — Melhoria</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Responsável: Todos</option>
            {users.map((u) => (
              <option key={u.uid} value={u.uid}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Right: Search & Action buttons */}
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[320px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar demanda, projeto..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Button to Create / Edit Kanban Lists */}
          <button
            onClick={handleOpenAddColumn}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-md transition-colors flex items-center gap-1 text-xs cursor-pointer shadow-2xs"
            title="Criar nova coluna / lista de Kanban"
          >
            <Columns className="w-3.5 h-3.5 text-blue-600" />
            <span>+ Coluna</span>
          </button>

          {isAdmin && <button type="button" onClick={() => setShowBulkImport(true)}
            className="px-3 py-1.5 rounded-md border border-blue-200 bg-white text-blue-700 font-bold text-xs hover:bg-blue-50">
            Importar CSV / JSON
          </button>}
          {/* Button to Add Task */}
          <button
            onClick={onAddTask}
            className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Nova demanda
          </button>
        </div>
      </div>

      {/* 2. KANBAN BOARD WITH FLUID DRAG & DROP */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 items-start select-none">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            const totalPages = Math.max(1, Math.ceil(colTasks.length/3));
            const page = Math.min(columnPages[col.id] || 0,totalPages-1);
            const visibleTasks = colTasks.slice(page*3,(page+1)*3);
            const isDragOver = dragOverColumnId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`bg-[#edf2f7] rounded-lg overflow-hidden flex flex-col min-h-[465px] w-full min-w-0 shadow-2xs border transition-all duration-150 ${
                  isDragOver
                    ? 'ring-2 ring-blue-500 bg-blue-50/60 border-blue-400 scale-[1.01]'
                    : 'border-slate-200'
                }`}
              >
                {/* Solid Colored Header matching Image 1 with Edit Column Action */}
                <div
                  className={`${col.headerBg} text-white px-3 py-2.5 flex items-center justify-between font-bold text-xs uppercase tracking-wide select-none shadow-2xs group`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate">{col.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditColumn(col);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-black/20 rounded transition-all cursor-pointer text-white/80 hover:text-white"
                      title="Editar título ou cor da lista"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black shrink-0">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards Container with Drag and Drop */}
                <div className="p-2 space-y-2.5 flex-1">
                  {visibleTasks.map((t) => {
                    const late = isOverdue(t.deadline, t.status);
                    const isDragging = draggingTaskId === t.id;

                    return (
                      <div
                        key={t.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onOpenTask(t)}
                        className={`bg-white rounded-md p-3 border transition-all cursor-grab active:cursor-grabbing space-y-2.5 border-l-4 ${col.borderAccent} ${
                          isDragging
                            ? 'opacity-30 scale-95 border-dashed border-2 border-blue-500 shadow-xl'
                            : 'border-slate-200 hover:border-slate-400 hover:shadow-md'
                        }`}
                      >
                        {/* Top: drag grip + title */}
                        <div className="flex items-start gap-1.5">
                          <GripVertical className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">
                              {t.title}
                            </h4>
                            <div className="mt-1"><ProjectPill id={t.projectId} name={t.projectName} /></div>
                          </div>
                        </div>

                        {/* Middle info */}
                        <div className="text-[11px] text-slate-500 space-y-1 pl-5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <TaskAvatar user={users.find((u) => u.uid === t.assigneeId) || users.find((u) => u.name.toLowerCase() === (t.assigneeName || '').toLowerCase())} name={t.assigneeName} />
                            <strong className="text-slate-800 truncate">{t.assigneeName || 'Não atribuído'}</strong>
                          </div>
                          {t.expectedResult && (
                            <p className="text-[10px] text-slate-400 truncate">
                              Entrega: {t.expectedResult}
                            </p>
                          )}
                        </div>

                        {/* Bottom: Priority & HIGH-CONTRAST HIGHLIGHTED DEADLINE (Destaque do Prazo) */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] pl-5">
                          <span
                            className={`px-1.5 py-0.5 font-extrabold rounded ${
                              t.priority === 'P0'
                                ? 'bg-red-600 text-white'
                                : t.priority === 'P1'
                                ? 'bg-amber-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {t.priority}
                          </span>

                          {/* DESTACADO: PRAZO VISÍVEL, CLARO E NUNCA APAGADO */}
                          {t.deadline ? (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold shadow-2xs border ${
                                late
                                  ? 'bg-red-600 text-white border-red-700'
                                  : 'bg-slate-100 text-slate-900 border-slate-300'
                              }`}
                              title={late ? 'Demanda com prazo expirado!' : `Prazo: ${formatDateBR(t.deadline)}`}
                            >
                              <Calendar className={`w-3 h-3 ${late ? 'text-white' : 'text-slate-700'}`} />
                              <span>{formatDateBR(t.deadline)}</span>
                              {late && (
                                <span className="bg-red-900 text-white text-[9px] px-1 rounded uppercase font-black">
                                  Atrasada
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sem prazo</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {totalPages > 1 && (
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-[11px]">
                      <button type="button" disabled={page === 0}
                        onClick={() => setColumnPages((old) => ({ ...old, [col.id]: page - 1 }))}
                        className="text-blue-700 font-bold disabled:opacity-25">Anterior</button>
                      <span className="text-slate-600 font-semibold">{page+1}/{totalPages}</span>
                      <button type="button" disabled={page+1 === totalPages}
                        onClick={() => setColumnPages((old) => ({ ...old, [col.id]: page + 1 }))}
                        className="text-blue-700 font-bold disabled:opacity-25">Próxima</button>
                    </div>
                  )}
                  {colTasks.length === 0 && (
                    <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                      <span>Sem demandas nesta etapa</span>
                      <span className="text-[10px] text-slate-300">Arraste uma demanda aqui</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      {showBulkImport && <TaskBulkImportModal
        projects={projects} users={users} tasks={tasks} onClose={() => setShowBulkImport(false)} />}
      {/* KANBAN COLUMN CREATE / EDIT MODAL */}
      <KanbanColumnModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        column={editingColumn}
        totalColumns={columns.length}
        onSave={handleSaveColumn}
        onDelete={handleDeleteColumn}
      />
    </div>
  );
};
