import React, { useState, useEffect } from 'react';
import { X, Sun, Moon } from 'lucide-react';
import type { Task, DailyCheckin } from '../../types';
import { saveDailyCheckin } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface DailyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTasks: Task[];
  existingCheckin?: DailyCheckin | null;
}

export const DailyCheckinModal: React.FC<DailyCheckinModalProps> = ({
  isOpen,
  onClose,
  userTasks,
  existingCheckin,
}) => {
  const { activeProfile } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'morning' | 'evening'>('morning');

  // Morning fields
  const [morningPriority, setMorningPriority] = useState('');
  const [morningGoal, setMorningGoal] = useState('');
  const [morningBlocker, setMorningBlocker] = useState('');

  // Evening fields
  const [eveningDelivered, setEveningDelivered] = useState('');
  const [eveningEvidence, setEveningEvidence] = useState('');
  const [eveningPending, setEveningPending] = useState('');
  const [eveningNextStep, setEveningNextStep] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (existingCheckin) {
      setMorningPriority(existingCheckin.morningPriority || '');
      setMorningGoal(existingCheckin.morningGoal || '');
      setMorningBlocker(existingCheckin.morningBlocker || '');
      setEveningDelivered(existingCheckin.eveningDelivered || '');
      setEveningEvidence(existingCheckin.eveningEvidence || '');
      setEveningPending(existingCheckin.eveningPending || '');
      setEveningNextStep(existingCheckin.eveningNextStep || '');
    } else {
      const p0Task = userTasks.find((t) => t.priority === 'P0' && t.status !== 'completed');
      const inProgressTask = userTasks.find((t) => t.status === 'in_progress');
      const taskToSuggest = p0Task || inProgressTask;

      if (taskToSuggest) {
        setMorningPriority(`[${taskToSuggest.projectName}] ${taskToSuggest.title}`);
        setMorningGoal(taskToSuggest.expectedResult || 'Concluir critérios de aceite e submeter para validação');
      }
    }
  }, [existingCheckin, userTasks]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!activeProfile) return;

    const checkinId = existingCheckin?.id || `checkin_${todayStr}_${activeProfile.uid}`;

    const checkinData: DailyCheckin = {
      id: checkinId,
      userId: activeProfile.uid,
      userName: activeProfile.name,
      date: todayStr,
      morningPriority: morningPriority.trim(),
      morningGoal: morningGoal.trim(),
      morningBlocker: morningBlocker.trim() || undefined,
      eveningDelivered: eveningDelivered.trim() || undefined,
      eveningEvidence: eveningEvidence.trim() || undefined,
      eveningPending: eveningPending.trim() || undefined,
      eveningNextStep: eveningNextStep.trim() || undefined,
      submittedMorningAt: existingCheckin?.submittedMorningAt || (activeTab === 'morning' ? new Date().toISOString() : undefined),
      submittedEveningAt: activeTab === 'evening' ? new Date().toISOString() : existingCheckin?.submittedEveningAt,
    };

    try {
      setIsSubmitting(true);
      await saveDailyCheckin(checkinData);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar check-in diário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              Check-in diário — {activeProfile?.name}
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Alinhamento rápido em prioridade, entregas e impedimentos. Campos com <span className="text-red-400">*</span> são obrigatórios.
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

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('morning')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'morning'
                ? 'border-[#004e9a] text-[#004e9a] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            Check-in matinal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evening')}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
              activeTab === 'evening'
                ? 'border-[#004e9a] text-[#004e9a] bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-500" />
            Fechamento diário
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white text-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-medium text-xs">
              {errorMessage}
            </div>
          )}

          {activeTab === 'morning' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  1. Qual é a sua prioridade hoje? <span className="text-red-500 font-semibold">*</span>
                </label>
                <input
                  type="text"
                  value={morningPriority}
                  onChange={(e) => setMorningPriority(e.target.value)}
                  placeholder="Ex: Conciliação de publicações do Nolasco"
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  2. O que você vai concluir hoje? <span className="text-red-500 font-semibold">*</span>
                </label>
                <textarea
                  rows={2}
                  value={morningGoal}
                  onChange={(e) => setMorningGoal(e.target.value)}
                  placeholder="Ex: Planilha comparativa validada..."
                  className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  3. Algum impedimento ou dependência externa?
                </label>
                <input
                  type="text"
                  value={morningBlocker}
                  onChange={(e) => setMorningBlocker(e.target.value)}
                  placeholder="Deixe em branco se o caminho estiver livre..."
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  1. O que foi efetivamente entregue? <span className="text-red-500 font-semibold">*</span>
                </label>
                <textarea
                  rows={2}
                  value={eveningDelivered}
                  onChange={(e) => setEveningDelivered(e.target.value)}
                  placeholder="Descreva a entrega realizada objetivamente..."
                  className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  2. Qual a evidência verificável? <span className="text-red-500 font-semibold">*</span>
                </label>
                <input
                  type="text"
                  value={eveningEvidence}
                  onChange={(e) => setEveningEvidence(e.target.value)}
                  placeholder="Link do PR, relatório ou planilha validada..."
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    3. O que ficou pendente?
                  </label>
                  <input
                    type="text"
                    value={eveningPending}
                    onChange={(e) => setEveningPending(e.target.value)}
                    placeholder="Pendências para amanhã..."
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    4. Próximo passo
                  </label>
                  <input
                    type="text"
                    value={eveningNextStep}
                    onChange={(e) => setEveningNextStep(e.target.value)}
                    placeholder="Próxima ação..."
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
                  />
                </div>
              </div>
            </div>
          )}

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
              {isSubmitting ? 'Salvando...' : 'Salvar registro diário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
