import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { WeeklyEvent, EventType, Project, UserProfile } from '../../types';
import { saveWeeklyEvent } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  users: UserProfile[];
  initialDate?: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  projects,
  users,
  initialDate,
}) => {
  const { activeProfile } = useAuth();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('alinhamento');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [projectId, setProjectId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([activeProfile?.uid || '']);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleToggleAssignee = (uid: string) => {
    if (assigneeIds.includes(uid)) {
      setAssigneeIds(assigneeIds.filter((id) => id !== uid));
    } else {
      setAssigneeIds([...assigneeIds, uid]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('O título do compromisso é obrigatório.');
      return;
    }

    const selectedProj = projects.find((p) => p.id === projectId);
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const eventData: WeeklyEvent = {
      id: eventId,
      title: title.trim(),
      type,
      date,
      time: time || undefined,
      projectId: projectId || undefined,
      projectName: selectedProj?.name || undefined,
      assigneeIds,
      description: description.trim() || undefined,
      createdById: activeProfile?.uid || '',
      createdAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await saveWeeklyEvent(eventData);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar evento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              Novo compromisso na agenda
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Reuniões, alinhamentos diários e marcos de validação. Campos com <span className="text-red-400">*</span> são obrigatórios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Título do compromisso <span className="text-red-500 font-semibold">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Alinhamento diário / Homologação com cliente"
              className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EventType)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
              >
                <option value="alinhamento">Alinhamento</option>
                <option value="reuniao">Reunião</option>
                <option value="validacao">Validação</option>
                <option value="entrega">Entrega</option>
                <option value="visita">Visita a cliente</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Data <span className="text-red-500 font-semibold">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Projeto (Opcional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
              >
                <option value="">Nenhum vínculo</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Participantes envolvidos
            </label>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const isSelected = assigneeIds.includes(u.uid);
                return (
                  <button
                    type="button"
                    key={u.uid}
                    onClick={() => handleToggleAssignee(u.uid)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#004e9a] text-white border-[#004e9a] font-medium shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Pauta / Observações
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo do alinhamento..."
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
            />
          </div>

          {/* RELACIONA MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#004e9a] hover:bg-[#003d7a] text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar compromisso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
