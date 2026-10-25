import React, { useState } from 'react';
import { X, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import type { Feedback, FeedbackType, FeedbackStatus, UserProfile } from '../../types';
import { saveFeedback } from '../../services/db';
import { useAuth } from '../../context/AuthContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  initialFeedback?: Feedback | null;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  users,
  initialFeedback,
}) => {
  const { activeProfile } = useAuth();

  const [userId, setUserId] = useState(initialFeedback?.userId || (users.find(u => u.role !== 'admin')?.uid || ''));
  const [date, setDate] = useState(initialFeedback?.date || new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<FeedbackType>(initialFeedback?.type || 'alinhamento');
  const [fact, setFact] = useState(initialFeedback?.fact || '');
  const [impact, setImpact] = useState(initialFeedback?.impact || '');
  const [expectedBehavior, setExpectedBehavior] = useState(initialFeedback?.expectedBehavior || '');
  const [combinedCommitment, setCombinedCommitment] = useState(initialFeedback?.combinedCommitment || '');
  const [followUpDeadline, setFollowUpDeadline] = useState(initialFeedback?.followUpDeadline || '');
  const [status, setStatus] = useState<FeedbackStatus>(initialFeedback?.status || 'em_acompanhamento');
  const [sharedWithUser, setSharedWithUser] = useState(initialFeedback?.sharedWithUser ?? true);
  const [privateManagerNote, setPrivateManagerNote] = useState(initialFeedback?.privateManagerNote || '');
  const [showPrivateNotes, setShowPrivateNotes] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fact.trim()) {
      setErrorMessage('O fato observado é obrigatório.');
      return;
    }

    const targetUser = users.find((u) => u.uid === userId);
    const feedbackId = initialFeedback?.id || `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const feedbackData: Feedback = {
      id: feedbackId,
      userId,
      userName: targetUser?.name || 'Colaborador',
      date,
      type,
      fact: fact.trim(),
      impact: impact.trim(),
      expectedBehavior: expectedBehavior.trim(),
      combinedCommitment: combinedCommitment.trim(),
      followUpDeadline: followUpDeadline || undefined,
      status,
      sharedWithUser,
      privateManagerNote: privateManagerNote.trim() || undefined,
      createdById: activeProfile?.uid || '',
      createdByName: activeProfile?.name || 'Gestor',
      createdAt: initialFeedback?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await saveFeedback(
        feedbackData,
        {
          id: activeProfile?.uid || '',
          name: activeProfile?.name || '',
          email: activeProfile?.email || '',
        },
        !initialFeedback
      );
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              {initialFeedback ? 'Editar acompanhamento' : 'Novo registro de feedback'}
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Alinhamento profissional e compromissos de desenvolvimento contínuo. Campos com <span className="text-red-400">*</span> são obrigatórios.
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Profissional <span className="text-red-500 font-semibold">*</span>
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer"
                required
              >
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name} ({u.role === 'admin' ? 'Gestor' : 'Dev'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Tipo de feedback
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white cursor-pointer font-medium"
              >
                <option value="reconhecimento">Reconhecimento</option>
                <option value="orientacao">Orientação</option>
                <option value="alinhamento">Alinhamento</option>
                <option value="melhoria">Melhoria</option>
              </select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Data do registro
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Fato observado (O que aconteceu de forma concreta) <span className="text-red-500 font-semibold">*</span>
            </label>
            <textarea
              rows={2}
              value={fact}
              onChange={(e) => setFact(e.target.value)}
              placeholder="Descreva a situação específica..."
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Impacto causado
              </label>
              <textarea
                rows={2}
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="Impacto na entrega, no time ou no cliente..."
                className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Comportamento esperado
              </label>
              <textarea
                rows={2}
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="Qual o padrão de excelência esperado..."
                className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Compromisso combinado
            </label>
            <textarea
              rows={2}
              value={combinedCommitment}
              onChange={(e) => setCombinedCommitment(e.target.value)}
              placeholder="Ação acordada entre gestor e profissional..."
              className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 bg-white"
            />
          </div>

          {/* Collapsible Section: Observações internas e notas privadas (Print 2 style) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowPrivateNotes(!showPrivateNotes)}
              className="flex items-center gap-1.5 text-xs text-slate-600 font-medium hover:text-slate-900 cursor-pointer transition-colors"
            >
              {showPrivateNotes ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
              <span>Observações internas e notas confidenciais da gestão</span>
            </button>

            {showPrivateNotes && (
              <div className="mt-3 p-4 bg-amber-50/50 border border-amber-200/80 rounded-lg space-y-3 animate-in fade-in duration-100">
                <span className="font-semibold text-amber-900 text-xs flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  Nota privada do gestor (Nunca visível ao colaborador)
                </span>
                <textarea
                  rows={2}
                  value={privateManagerNote}
                  onChange={(e) => setPrivateManagerNote(e.target.value)}
                  placeholder="Anotações confidenciais para reflexão da gestão..."
                  className="w-full p-2.5 border border-amber-200 rounded-md bg-white text-slate-800 text-xs focus:outline-none focus:border-[#004e9a]"
                />

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={sharedWithUser}
                    onChange={(e) => setSharedWithUser(e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-slate-700 text-xs font-medium">
                    Compartilhar este alinhamento formalmente com o colaborador
                  </span>
                </label>
              </div>
            )}
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
              {isSubmitting ? 'Salvando...' : initialFeedback ? 'Salvar alterações' : 'Cadastrar feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
