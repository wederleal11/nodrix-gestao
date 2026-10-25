import React, { useState, useEffect } from 'react';
import {
  Plus,
  Lock,
  Eye,
  Trash2,
  Edit2,
  Search,
} from 'lucide-react';
import type { Feedback, UserProfile, FeedbackType, FeedbackStatus } from '../../types';
import { formatDateBR } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { subscribeFeedbacks, deleteFeedback } from '../../services/db';

interface FeedbacksViewProps {
  users: UserProfile[];
  onAddFeedback: () => void;
  onEditFeedback: (feedback: Feedback) => void;
}

export const FeedbacksView: React.FC<FeedbacksViewProps> = ({
  users,
  onAddFeedback,
  onEditFeedback,
}) => {
  const { activeProfile, isAdmin } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!activeProfile) return;
    const unsub = subscribeFeedbacks(activeProfile.uid, isAdmin, (items) => {
      setFeedbacks(items);
    });
    return () => unsub();
  }, [activeProfile, isAdmin]);

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (selectedUserFilter !== 'all' && fb.userId !== selectedUserFilter) return false;
    if (selectedTypeFilter !== 'all' && fb.type !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        fb.userName.toLowerCase().includes(q) ||
        fb.fact.toLowerCase().includes(q) ||
        (fb.combinedCommitment && fb.combinedCommitment.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (window.confirm('Excluir este registro de feedback?')) {
      await deleteFeedback(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs cursor-pointer"
            >
              <option value="all">Profissional: Todos</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>{u.name}</option>
              ))}
            </select>
          )}

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Tipo: Todos</option>
            <option value="reconhecimento">Reconhecimento</option>
            <option value="orientacao">Orientação</option>
            <option value="alinhamento">Alinhamento</option>
            <option value="melhoria">Melhoria</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end min-w-[280px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por fato ou compromisso..."
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 text-xs"
            />
          </div>

          {isAdmin && (
            <button
              onClick={onAddFeedback}
              className="px-4 py-1.5 bg-[#0066cc] hover:bg-[#0055aa] text-white font-semibold rounded-md transition-colors flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo feedback
            </button>
          )}
        </div>
      </div>

      {/* 2. FEEDBACKS LIST */}
      <div className="space-y-3">
        {filteredFeedbacks.map((fb) => (
          <div
            key={fb.id}
            className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    fb.type === 'reconhecimento'
                      ? 'bg-emerald-600 text-white'
                      : fb.type === 'melhoria'
                      ? 'bg-amber-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {fb.type.toUpperCase()}
                </span>
                <span className="font-bold text-slate-900">{fb.userName}</span>
                <span className="text-slate-400">· {formatDateBR(fb.date)}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded">
                  {fb.status.replace('_', ' ')}
                </span>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => onEditFeedback(fb)}
                      className="p-1 text-slate-400 hover:text-blue-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(fb.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Fato Observado:</span>
                <p className="text-slate-800 font-medium mt-0.5">{fb.fact}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Impacto:</span>
                <p className="text-slate-700 mt-0.5">{fb.impact || 'Não informado'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase block">Comportamento Esperado:</span>
                <p className="text-slate-800 mt-0.5">{fb.expectedBehavior || 'Padrão alinhado'}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase block">Compromisso Combinado:</span>
                <p className="text-slate-800 mt-0.5">{fb.combinedCommitment || 'Compromisso firmado'}</p>
              </div>
            </div>

            {isAdmin && fb.privateManagerNote && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Nota Privada do Gestor (Confidencial):
                </span>
                <p className="text-amber-950 mt-0.5 italic">{fb.privateManagerNote}</p>
              </div>
            )}
          </div>
        ))}

        {filteredFeedbacks.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs bg-white border border-slate-200 rounded-lg">
            Nenhum feedback registrado.
          </div>
        )}
      </div>
    </div>
  );
};
