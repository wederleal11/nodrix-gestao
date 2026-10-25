import React, { useState } from 'react';
import {
  Download,
  Building,
  User,
  FolderKanban,
} from 'lucide-react';
import type { Task, Project, UserProfile } from '../../types';
import { formatDateBR, exportToCSV, isOverdue } from '../../utils/formatters';

interface ReportsViewProps {
  tasks: Task[];
  projects: Project[];
  users: UserProfile[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ tasks, projects, users }) => {
  const [activeReport, setActiveReport] = useState<'company' | 'individual' | 'projects'>('company');

  // REPORT 1: SEMANA DA EMPRESA
  const plannedTasks = tasks.filter((t) => t.status !== 'cancelled' && t.status !== 'backlog');
  const validatedTasks = tasks.filter((t) => t.status === 'completed');
  const overdueTasks = tasks.filter((t) => isOverdue(t.deadline, t.status));
  const blockedTasks = tasks.filter((t) => t.status === 'blocked');
  const pendingNextWeek = tasks.filter((t) => t.status === 'in_progress' || t.status === 'planned');

  const handleExportCompanyCSV = () => {
    const headers = ['Demanda', 'Projeto', 'Responsável', 'Prioridade', 'Prazo', 'Status', 'Resultado Esperado'];
    const rows = tasks.map((t) => [
      t.title,
      t.projectName,
      t.assigneeName || 'Não atribuído',
      t.priority,
      t.deadline || '',
      t.status,
      t.expectedResult || '',
    ]);
    exportToCSV(`nodrix_relatorio_semana_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // REPORT 2: RESULTADO INDIVIDUAL
  const individualStats = users.map((u) => {
    const userTasks = tasks.filter((t) => t.assigneeId === u.uid);
    const committed = userTasks.length;
    const validated = userTasks.filter((t) => t.status === 'completed').length;
    const returned = userTasks.filter((t) => t.validationResult === 'rejected').length;
    const late = userTasks.filter((t) => isOverdue(t.deadline, t.status)).length;
    const blocked = userTasks.filter((t) => t.status === 'blocked').length;
    const rate = committed > 0 ? Math.round((validated / committed) * 100) : 0;

    return {
      userId: u.uid,
      userName: u.name,
      role: u.role,
      title: u.title,
      committed,
      validated,
      returned,
      late,
      blocked,
      rate,
    };
  });

  const handleExportIndividualCSV = () => {
    const headers = ['Profissional', 'Cargo', 'Nível', 'Compromissos', 'Validadas', 'Devoluções', 'Atrasos', 'Bloqueios', 'Taxa Validação'];
    const rows = individualStats.map((s) => [
      s.userName,
      s.title,
      s.role,
      s.committed,
      s.validated,
      s.returned,
      s.late,
      s.blocked,
      `${s.rate}%`,
    ]);
    exportToCSV(`nodrix_resultado_individual_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  // REPORT 3: PROJETOS
  const projectStats = projects.map((p) => {
    const pTasks = tasks.filter((t) => t.projectId === p.id);
    const total = pTasks.length;
    const validated = pTasks.filter((t) => t.status === 'completed').length;
    const criticalPending = pTasks.filter(
      (t) => (t.priority === 'P0' || t.priority === 'P1') && t.status !== 'completed'
    ).length;
    const progress = total > 0 ? Math.round((validated / total) * 100) : 0;

    return {
      id: p.id,
      name: p.name,
      client: p.client || '-',
      lead: p.leadName,
      status: p.status,
      priority: p.priority,
      milestone: p.nextMilestone || '-',
      targetDate: p.targetDate || '-',
      total,
      validated,
      criticalPending,
      progress,
    };
  });

  const handleExportProjectsCSV = () => {
    const headers = ['Projeto', 'Cliente', 'Líder', 'Status', 'Prioridade', 'Progresso Comprovado', 'Demandas Críticas Pendentes', 'Próximo Marco', 'Previsão'];
    const rows = projectStats.map((p) => [
      p.name,
      p.client,
      p.lead,
      p.status,
      p.priority,
      `${p.progress}%`,
      p.criticalPending,
      p.milestone,
      p.targetDate,
    ]);
    exportToCSV(`nodrix_relatorio_projetos_${new Date().toISOString().split('T')[0]}`, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* 1. FILTER & EXPORT TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md">
          <button
            onClick={() => setActiveReport('company')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer ${
              activeReport === 'company' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Semana da Empresa
          </button>
          <button
            onClick={() => setActiveReport('individual')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer ${
              activeReport === 'individual' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Resultado Individual
          </button>
          <button
            onClick={() => setActiveReport('projects')}
            className={`px-3 py-1.5 rounded font-semibold transition-colors cursor-pointer ${
              activeReport === 'projects' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Projetos e Marcos
          </button>
        </div>

        <button
          onClick={() => {
            if (activeReport === 'company') handleExportCompanyCSV();
            else if (activeReport === 'individual') handleExportIndividualCSV();
            else handleExportProjectsCSV();
          }}
          className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </button>
      </div>

      {/* 2. REPORT CONTENT */}
      {activeReport === 'company' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-blue-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">PLANEJADO</span>
              <div className="text-2xl font-black text-blue-600 mt-1">{plannedTasks.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">VALIDADO</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{validatedTasks.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-red-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">ATRASADAS</span>
              <div className="text-2xl font-black text-red-600 mt-1">{overdueTasks.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-rose-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">BLOQUEIOS</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{blockedTasks.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-purple-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">PENDÊNCIAS P/ PRÓXIMA</span>
              <div className="text-2xl font-black text-purple-600 mt-1">{pendingNextWeek.length}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Demanda</th>
                    <th className="py-2.5 px-4">Projeto</th>
                    <th className="py-2.5 px-4">Responsável</th>
                    <th className="py-2.5 px-4">Prioridade</th>
                    <th className="py-2.5 px-4">Prazo</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{t.title}</td>
                      <td className="py-2.5 px-4 text-slate-600">{t.projectName}</td>
                      <td className="py-2.5 px-4 text-slate-600">{t.assigneeName || 'Não atribuído'}</td>
                      <td className="py-2.5 px-4 font-semibold">{t.priority}</td>
                      <td className="py-2.5 px-4">{formatDateBR(t.deadline)}</td>
                      <td className="py-2.5 px-4 capitalize">{t.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeReport === 'individual' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Profissional</th>
                  <th className="py-2.5 px-4">Função</th>
                  <th className="py-2.5 px-4 text-center">Compromissos</th>
                  <th className="py-2.5 px-4 text-center">Validadas</th>
                  <th className="py-2.5 px-4 text-center">Devoluções</th>
                  <th className="py-2.5 px-4 text-center">Atrasos</th>
                  <th className="py-2.5 px-4 text-center">Bloqueios</th>
                  <th className="py-2.5 px-4 text-center">Taxa Conclusão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {individualStats.map((s) => (
                  <tr key={s.userId} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.userName} ({s.role === 'admin' ? 'Gestor' : 'Dev'})
                    </td>
                    <td className="py-3 px-4 text-slate-600">{s.title}</td>
                    <td className="py-3 px-4 text-center font-semibold">{s.committed}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">{s.validated}</td>
                    <td className="py-3 px-4 text-center text-amber-600">{s.returned}</td>
                    <td className="py-3 px-4 text-center text-red-600 font-semibold">{s.late}</td>
                    <td className="py-3 px-4 text-center text-rose-600">{s.blocked}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600">{s.rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReport === 'projects' && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Projeto</th>
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-4">Líder</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Progresso Validado</th>
                  <th className="py-2.5 px-4">Pendências Críticas</th>
                  <th className="py-2.5 px-4">Próximo Marco</th>
                  <th className="py-2.5 px-4">Previsão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectStats.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.client}</td>
                    <td className="py-3 px-4 text-slate-600">{p.lead}</td>
                    <td className="py-3 px-4 font-semibold">{p.status}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{p.progress}%</td>
                    <td className="py-3 px-4 text-amber-600 font-semibold">{p.criticalPending}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{p.milestone}</td>
                    <td className="py-3 px-4">{formatDateBR(p.targetDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
