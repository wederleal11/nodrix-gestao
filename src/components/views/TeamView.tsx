import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Sun,
  Moon,
  Edit2,
  Trash2,
  Eye,
} from 'lucide-react';
import type { UserProfile, Task, DailyCheckin } from '../../types';
import { formatDateBR, isOverdue } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { subscribeDailyCheckins, deleteUser } from '../../services/db';

interface TeamViewProps {
  users: UserProfile[];
  tasks: Task[];
  selectedUserId?: string;
  onOpenTask: (task: Task) => void;
  onOpenDailyCheckin: (checkin?: DailyCheckin) => void;
  onAddMember: () => void;
  onEditMember: (member: UserProfile) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({
  users,
  tasks,
  selectedUserId,
  onOpenTask,
  onOpenDailyCheckin,
  onAddMember,
  onEditMember,
}) => {
  const { activeProfile, isAdmin, setActiveUserId } = useAuth();
  const [activeTabMemberId, setActiveTabMemberId] = useState<string>(
    selectedUserId || activeProfile?.uid || users[0]?.uid || ''
  );

  const [todayCheckins, setTodayCheckins] = useState<DailyCheckin[]>([]);
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsub = subscribeDailyCheckins(todayStr, (items) => {
      setTodayCheckins(items);
    });
    return () => unsub();
  }, [todayStr]);

  const activeMembers = users.filter((user) => user.status === 'active');
  const selectedMember = activeMembers.find((u) => u.uid === activeTabMemberId) || activeMembers[0];
  const memberTasks = tasks.filter((t) => t.assigneeId === selectedMember?.uid);

  const p0Task = memberTasks.find(
    (t) => t.priority === 'P0' && t.status !== 'completed' && t.status !== 'cancelled'
  );
  const inProgressCount = memberTasks.filter((t) => t.status === 'in_progress').length;
  const validatedCount = memberTasks.filter((t) => t.status === 'completed').length;
  const overdueCount = memberTasks.filter((t) => isOverdue(t.deadline, t.status)).length;
  const blockedCount = memberTasks.filter((t) => t.status === 'blocked').length;

  const myCheckinToday = todayCheckins.find((c) => c.userId === activeProfile?.uid);

  const handleDeleteMember = async (member: UserProfile) => {
    if (!isAdmin) return;
    if (member.role === 'admin') {
      alert('Não é permitido excluir um administrador.');
      return;
    }
    if (window.confirm(`Excluir o cadastro de ${member.name}?`)) {
      await deleteUser(member.uid);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. FILTER & ACTION TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Member selector tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {activeMembers.map((member) => {
            const isSelected = member.uid === selectedMember?.uid;
            const hasCheckin = todayCheckins.some((c) => c.userId === member.uid);

            return (
              <button
                key={member.uid}
                onClick={() => setActiveTabMemberId(member.uid)}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#0066cc] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{member.name}</span>
                {hasCheckin && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenDailyCheckin(myCheckinToday)}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-md transition-colors flex items-center gap-1 text-xs cursor-pointer"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            {myCheckinToday ? 'Editar check-in diário' : 'Fazer check-in diário'}
          </button>

          {isAdmin && (
            <button
              onClick={onAddMember}
              className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" /> Cadastrar membro
            </button>
          )}
        </div>
      </div>

      {/* 2. SELECTED MEMBER KPI CARDS */}
      {selectedMember && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-blue-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                TOTAL DE MANDAS
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {memberTasks.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">{selectedMember.availability}</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-sky-500 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                EM ANDAMENTO
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {inProgressCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Executando</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-emerald-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                ENTREGAS VALIDADAS
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {validatedCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Aprovadas</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-red-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                ATRASOS
              </span>
              <div className="text-2xl font-black text-red-600 mt-1">
                {overdueCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Prazo expirado</span>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 border-t-4 border-t-rose-600 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                BLOQUEIOS
              </span>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {blockedCount}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Impedimentos</span>
            </div>
          </div>

          {/* 3. PROFILE HEADER & DAILY CHECK-IN BOX */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Profile Info */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{selectedMember.name}</h3>
                  <p className="text-xs text-slate-500">{selectedMember.title}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => onEditMember(selectedMember)}
                    className="p-1 text-slate-400 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="text-xs space-y-1.5 text-slate-600">
                <p>E-mail: <strong>{selectedMember.email}</strong></p>
                <p>Nível: <strong>{selectedMember.role === 'admin' ? 'Gestor' : 'Desenvolvedor'}</strong></p>
                <p>Carga horária: <strong>{selectedMember.availability}</strong></p>
              </div>

              {p0Task && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs">
                  <span className="text-[10px] font-extrabold text-red-600 uppercase block">Foco P0:</span>
                  <p className="font-bold text-slate-900 truncate mt-0.5">{p0Task.title}</p>
                </div>
              )}
            </div>

            {/* Daily Check-in / Checkout Status */}
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800">
                  Check-in Diário de Hoje ({formatDateBR(todayStr)})
                </h4>
                {activeProfile?.uid === selectedMember.uid && (
                  <button
                    onClick={() => onOpenDailyCheckin(myCheckinToday)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Atualizar
                  </button>
                )}
              </div>

              {todayCheckins.find((c) => c.userId === selectedMember.uid) ? (
                (() => {
                  const checkin = todayCheckins.find((c) => c.userId === selectedMember.uid)!;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                        <span className="font-bold text-amber-700 block">Check-in Matinal</span>
                        <p><strong>Prioridade:</strong> {checkin.morningPriority || '-'}</p>
                        <p><strong>Meta:</strong> {checkin.morningGoal || '-'}</p>
                        {checkin.morningBlocker && (
                          <p className="text-red-600"><strong>Bloqueio:</strong> {checkin.morningBlocker}</p>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-1">
                        <span className="font-bold text-indigo-700 block">Fechamento Diário</span>
                        <p><strong>Entregue:</strong> {checkin.eveningDelivered || 'Ainda não registrado'}</p>
                        {checkin.eveningEvidence && (
                          <p><strong>Evidência:</strong> {checkin.eveningEvidence}</p>
                        )}
                        {checkin.eveningNextStep && (
                          <p><strong>Próximo passo:</strong> {checkin.eveningNextStep}</p>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="py-6 text-center text-slate-400 text-xs">
                  Nenhum check-in registrado para hoje por {selectedMember.name}.
                </div>
              )}
            </div>
          </div>

          {/* 4. MEMBER'S TASKS TABLE */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Demandas de {selectedMember.name} ({memberTasks.length})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Prioridade</th>
                    <th className="py-2.5 px-4">Demanda</th>
                    <th className="py-2.5 px-4">Projeto</th>
                    <th className="py-2.5 px-4">Prazo</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onOpenTask(t)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-bold">{t.priority}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{t.title}</td>
                      <td className="py-3 px-4 text-slate-600">{t.projectName}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDateBR(t.deadline)}</td>
                      <td className="py-3 px-4 capitalize">{t.status.replace('_', ' ')}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> Ver detalhes
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {memberTasks.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhuma demanda atribuída no momento.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
