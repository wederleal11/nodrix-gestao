import type { KanbanColumn, TaskStatus } from '../types';
export function getKanbanStatusOptions(columns: ReadonlyArray<KanbanColumn>): KanbanColumn[] {
  const seen = new Set<string>();
  return [...columns].sort((a,b)=>a.order-b.order).filter(col=>{
    if (!col.id?.trim() || !col.title?.trim() || col.id === '__unmapped__' || seen.has(col.id)) return false;
    seen.add(col.id); return true;
  });
}
export function getDefaultNewTaskStatus(columns: ReadonlyArray<KanbanColumn>): TaskStatus | null {
  const options=getKanbanStatusOptions(columns);
  return options.find(c=>c.id==='backlog')?.id ?? options[0]?.id ?? null;
}
export function isConfiguredTaskStatus(id: string, columns: ReadonlyArray<KanbanColumn>) {
  return getKanbanStatusOptions(columns).some(c=>c.id===id);
}
