import React, { useState } from 'react';
import { CheckCircle2, Circle, GitBranch, Search, X } from 'lucide-react';
import type { Task, Project } from '../../types';
import { validatePredecessorSelection } from '../../utils/taskDependencies';

interface Props {
  taskId: string;
  projectId: string;
  projects: Project[];
  tasks: Task[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const TaskPredecessorsPicker: React.FC<Props> = ({
  taskId, projectId, projects, tasks, selectedIds, onChange,
}) => {
  const [filterProject, setFilterProject] = useState(projectId || 'all');
  const [search, setSearch] = useState('');
  const selectedTasks = selectedIds.map(id => tasks.find(task => task.id === id));
  const finished = selectedTasks.filter(task => task?.status === 'completed').length;
  const matching = tasks.filter(task =>
    task.id !== taskId &&
    (filterProject === 'all' || task.projectId === filterProject) &&
    (!search.trim() || [task.title, task.projectName, task.assigneeName || ''].some(s =>
      s.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))))
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));

  return <section className="h-full min-h-0 flex flex-col gap-2.5 text-xs">
    <div className="border border-blue-200 bg-blue-50/50 rounded-lg px-3 py-2 text-slate-700">
      <strong className="inline-flex items-center gap-1.5 text-blue-900"><GitBranch className="w-4 h-4"/> Tarefas predecessoras</strong>
      <p className="mt-1 text-[11px]">Selecione quais tarefas devem terminar antes desta. A relação inversa é calculada automaticamente.</p>
    </div>
    <div className="border border-slate-200 rounded-lg p-2.5">
      <strong className="text-slate-800">Selecionadas: {selectedIds.length}</strong>
      <span className="ml-2 text-slate-500">{finished} concluídas · {selectedIds.length - finished} faltando</span>
      {!!selectedTasks.length && <div className="mt-2 flex flex-wrap gap-1">
        {selectedTasks.map((task, i) => <button key={selectedIds[i]} type="button"
          title="Remover vínculo" onClick={() => onChange(selectedIds.filter(id => id !== selectedIds[i]))}
          className="inline-flex items-center max-w-full gap-1 rounded border border-blue-200 bg-blue-50 text-blue-800 px-2 py-1 hover:border-blue-500">
          <span className="truncate max-w-[230px]">{task?.title || 'Tarefa não encontrada'}</span><X className="w-3 h-3 shrink-0"/>
        </button>)}
      </div>}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2">
      <select aria-label="Filtrar por projeto" value={filterProject} onChange={e => setFilterProject(e.target.value)}
        className="h-9 min-w-0 bg-white rounded-md border border-slate-300 px-2 text-slate-800">
        <option value="all">Todos os projetos</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="relative">
        <Search className="absolute top-2.5 left-2.5 w-3.5 h-3.5 text-slate-400"/>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} aria-label="Buscar tarefas"
          placeholder="Buscar tarefa..." className="h-9 w-full pl-8 pr-3 bg-white border border-slate-300 rounded-md text-slate-800"/>
      </div>
    </div>
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 divide-y divide-slate-100">
      {matching.map(task => {
        const checked = selectedIds.includes(task.id);
        const invalid = checked ? null : validatePredecessorSelection(taskId, [...selectedIds, task.id], tasks);
        return <label key={task.id} title={invalid || undefined}
          className={`flex items-center gap-2 px-3 py-2.5 ${invalid ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50'}`}>
          <input type="checkbox" checked={checked} disabled={!!invalid} className="w-4 h-4 accent-blue-700 shrink-0"
            onChange={e => onChange(e.target.checked ? [...selectedIds, task.id] : selectedIds.filter(id => id !== task.id))}/>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-slate-900">{task.title}</strong>
            <small className="block truncate text-slate-500">{task.projectName} · {task.assigneeName || 'Sem responsável'}</small>
          </span>
          {task.status === 'completed'
            ? <span className="shrink-0 inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5"/> Concluída</span>
            : <span className="shrink-0 inline-flex items-center gap-1 text-slate-500"><Circle className="w-3.5 h-3.5"/> Pendente</span>}
        </label>;
      })}
      {!matching.length && <p className="p-5 text-center text-slate-500">Nenhuma tarefa encontrada.</p>}
    </div>
  </section>;
};
