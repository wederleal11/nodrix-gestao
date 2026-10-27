import React, { useEffect, useState } from 'react';
import { X, Palette, Trash2, Check } from 'lucide-react';
import type { KanbanColumn } from '../../types';

interface KanbanColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  column?: KanbanColumn | null;
  totalColumns: number;
  onSave: (column: KanbanColumn) => Promise<void>;
  onDelete?: (columnId: string) => Promise<void>;
}

const COLOR_PRESETS = [
  { name: 'Roxo Relaciona', bg: 'bg-[#5b52f9]', border: 'border-l-[#5b52f9]', hex: '#5b52f9' },
  { name: 'Âmbar Execução', bg: 'bg-[#d97706]', border: 'border-l-[#d97706]', hex: '#d97706' },
  { name: 'Vermelho Crítico', bg: 'bg-[#dc2626]', border: 'border-l-[#dc2626]', hex: '#dc2626' },
  { name: 'Azul Validação', bg: 'bg-[#0284c7]', border: 'border-l-[#0284c7]', hex: '#0284c7' },
  { name: 'Verde Concluído', bg: 'bg-[#059669]', border: 'border-l-[#059669]', hex: '#059669' },
  { name: 'Rosa Vibrante', bg: 'bg-[#db2777]', border: 'border-l-[#db2777]', hex: '#db2777' },
  { name: 'Índigo Profundo', bg: 'bg-[#4f46e5]', border: 'border-l-[#4f46e5]', hex: '#4f46e5' },
  { name: 'Teal Moderno', bg: 'bg-[#0d9488]', border: 'border-l-[#0d9488]', hex: '#0d9488' },
  { name: 'Grafite Noturno', bg: 'bg-[#475569]', border: 'border-l-[#475569]', hex: '#475569' },
  { name: 'Amarelo Ouro', bg: 'bg-[#ca8a04]', border: 'border-l-[#ca8a04]', hex: '#ca8a04' },
];

export const KanbanColumnModal: React.FC<KanbanColumnModalProps> = ({
  isOpen,
  onClose,
  column,
  totalColumns,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(column?.title || '');
  const [id, setId] = useState(column?.id || '');
  const [selectedColor, setSelectedColor] = useState(
    COLOR_PRESETS.find((c) => c.bg === column?.headerBg) || COLOR_PRESETS[0]
  );
  const [order, setOrder] = useState<number>(column ? column.order : totalColumns);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // The form stays mounted across edit/create transitions; synchronize on open.
  useEffect(() => {
    if (!isOpen) return;
    setTitle(column?.title || '');
    setId(column?.id || '');
    setSelectedColor(COLOR_PRESETS.find((color) => color.bg === column?.headerBg) || COLOR_PRESETS[0]);
    setOrder(column?.order ?? totalColumns);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, column?.id, column?.title, column?.headerBg, column?.order, totalColumns]);

  if (!isOpen) return null;

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!column) {
      // Auto-generate slug ID if creating new column
      const slug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 30);
      setId(slug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('O título da coluna é obrigatório.');
      return;
    }

    const cleanId = (id || title)
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 30);

    if (!cleanId) {
      setErrorMessage('O identificador de status da etapa é obrigatório.');
      return;
    }

    const updatedColumn: KanbanColumn = {
      id: column ? column.id : cleanId,
      title: title.trim().toUpperCase(),
      headerBg: selectedColor.bg,
      borderAccent: selectedColor.border,
      order: Number(order),
      isSystem: column?.isSystem || false,
    };

    try {
      setIsSubmitting(true);
      await onSave(updatedColumn);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Falha ao salvar coluna do Kanban.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!column || !onDelete) return;
    if (column.isSystem && totalColumns <= 3) {
      alert('Não é recomendado excluir colunas essenciais do fluxo quando há poucas etapas.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja excluir a coluna "${column.title}"?`)) {
      try {
        setIsSubmitting(true);
        await onDelete(column.id);
        onClose();
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Falha ao excluir coluna.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-6 overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* RELACIONA DARK NAVY HEADER (Print 2 style) */}
        <div className="bg-[#0e213e] text-white px-6 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-bold text-white tracking-tight">
              {column ? 'Editar Coluna do Kanban' : 'Nova Coluna do Kanban'}
            </h2>
            <p className="text-xs text-slate-300 font-normal mt-0.5">
              Personalize títulos, cores e etapas do fluxo. Campos com <span className="text-red-400">*</span> são obrigatórios.
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

          {/* Title */}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
              Título da Coluna (Etapa) <span className="text-red-500 font-semibold">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: EM REVISÃO, HOMOLOGAÇÃO, TESTES..."
              className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs uppercase placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white font-bold"
              required
            />
          </div>

          {/* Status ID & Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Identificador de Status <span className="text-red-500 font-semibold">*</span>
              </label>
              <input
                type="text"
                value={id}
                disabled={!!column}
                onChange={(e) => setId(e.target.value)}
                placeholder="ex: em_revisao"
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Ordem no Fluxo
              </label>
              <input
                type="number"
                min={0}
                max={totalColumns + 2}
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-[#004e9a] focus:ring-1 focus:ring-[#004e9a]/30 transition-all bg-white font-bold"
              />
            </div>
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="block text-[13px] font-medium text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-500" />
                Cor do Cabeçalho da Coluna: <strong>{selectedColor.name}</strong>
              </span>
            </label>

            <div className="grid grid-cols-5 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {COLOR_PRESETS.map((color) => {
                const isSelected = selectedColor.bg === color.bg;
                return (
                  <button
                    type="button"
                    key={color.bg}
                    onClick={() => setSelectedColor(color)}
                    className={`h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs ${color.bg} ${
                      isSelected
                        ? 'ring-3 ring-slate-900 scale-105'
                        : 'hover:scale-102 hover:opacity-95'
                    }`}
                    title={color.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Column Header Preview */}
          <div className="pt-1">
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">
              Pré-visualização do cabeçalho da lista:
            </span>
            <div
              className={`${selectedColor.bg} text-white px-3.5 py-2.5 rounded-lg flex items-center justify-between font-bold text-xs uppercase tracking-wide shadow-xs`}
            >
              <span>{title.trim() || 'NOME DA COLUNA'}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-black">
                0
              </span>
            </div>
          </div>

          {/* RELACIONA MODAL FOOTER */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              {column && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Coluna
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
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
                {isSubmitting ? 'Salvando...' : column ? 'Atualizar Coluna' : 'Criar Coluna'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
