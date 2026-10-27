import type { Task } from '../types';

export function checklistProgress(task: Pick<Task, 'checklist'>) {
  const items = task.checklist || [];
  const total = items.length;
  const completed = items.filter(item => item.done).length;
  return { total, completed, pending: total - completed, isComplete: total > 0 && completed === total };
}

/** Only the dependent task stores predecessor IDs; reverse links are derived. */
export const taskPredecessors = (task: Task, tasks: Task[]) => {
  const byId = new Map(tasks.map(item => [item.id, item]));
  return [...new Set(task.predecessorIds || [])].flatMap(id => {
    const found = byId.get(id);
    return found ? [found] : [];
  });
};
export const taskDependents = (task: Pick<Task, 'id'>, tasks: Task[]) =>
  tasks.filter(candidate => candidate.id !== task.id && (candidate.predecessorIds || []).includes(task.id));

export function taskDependencySummary(task: Task, tasks: Task[]) {
  const predecessors = taskPredecessors(task, tasks);
  const missingPredecessorIds = [...new Set(task.predecessorIds || [])]
    .filter(id => !tasks.some(candidate => candidate.id === id));
  const dependents = taskDependents(task, tasks);
  return {
    predecessors, missingPredecessorIds,
    predecessorsTotal: predecessors.length + missingPredecessorIds.length,
    predecessorsPending: predecessors.filter(item => item.status !== 'completed').length + missingPredecessorIds.length,
    dependents, dependentsTotal: dependents.length,
    dependentsPending: dependents.filter(item => item.status !== 'completed').length,
  };
}

export function validatePredecessorSelection(currentTaskId: string, ids: string[], tasks: Task[]): string | null {
  if (new Set(ids).size !== ids.length) return 'Há predecessoras duplicadas.';
  const byId = new Map(tasks.map(task => [task.id, task]));
  for (const id of ids) {
    if (id === currentTaskId) return 'Uma tarefa não pode depender de si mesma.';
    if (!byId.has(id)) return 'Uma predecessora não existe mais. Remova o vínculo.';
    const stack = [id], seen = new Set<string>();
    while (stack.length) {
      const current = stack.pop()!;
      if (current === currentTaskId) return 'Dependência circular: remova o vínculo que forma o ciclo.';
      if (seen.has(current)) continue;
      seen.add(current);
      stack.push(...(byId.get(current)?.predecessorIds || []));
    }
  }
  return null;
}
