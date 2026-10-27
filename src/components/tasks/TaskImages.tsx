import React, { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, FileText, ImagePlus, LoaderCircle, Paperclip, Trash2, X } from 'lucide-react';
import type { TaskImage } from '../../types';
import { formatTaskImageError, MAX_TASK_IMAGES, resolveTaskImageUrl } from '../../services/taskImages';

export interface PendingTaskImage {
  id: string;
  file: File;
  previewUrl: string;
}

const TaskImageThumb: React.FC<{
  image: TaskImage;
  canRemove: boolean;
  disabled?: boolean;
  onRemove?: (image: TaskImage) => void;
  compact?: boolean;
}> = ({ image, canRemove, disabled, onRemove, compact }) => {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc('');
    setError('');
    void resolveTaskImageUrl(image).then((url) => {
      if (active) setSrc(url);
    }).catch((err: unknown) => {
      if (active) setError(formatTaskImageError(err));
    });
    return () => { active = false; };
  }, [image.storagePath]);

  return (
    <>
      <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50 group">
        <button
          type="button"
          disabled={!src}
          title={image.name}
          onClick={() => {
            if (image.contentType.startsWith('image/')) setExpanded(true);
            else window.open(src, '_blank', 'noopener,noreferrer');
          }}
          className="w-full text-left cursor-pointer disabled:cursor-default"
        >
          {src ? (
            image.contentType.startsWith('image/') ? (
              <img src={src} alt={image.name} loading="lazy" className={`${compact ? 'h-12' : 'h-24'} w-full object-cover`} />
            ) : (
              <div className={`${compact ? 'h-12' : 'h-24'} flex items-center justify-center gap-1 text-blue-700`}>
                {image.contentType.includes('spreadsheet') || image.contentType.includes('excel')
                  ? <FileSpreadsheet className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                <span className="text-[10px] font-bold">{image.name.split('.').pop()?.toUpperCase()}</span>
              </div>
            )
          ) : (
            <div className={`${compact ? 'h-12' : 'h-24'} flex items-center justify-center p-2 text-xs text-slate-500 text-center`}>
              {error ? 'Anexo indisponível' : <LoaderCircle className="w-4 h-4 animate-spin" />}
            </div>
          )}
          <span className="block truncate p-1.5 text-[10px] text-slate-700" title={image.name}>{image.name}</span>
        </button>
        {canRemove && onRemove && (
          <button type="button" disabled={disabled} onClick={() => onRemove(image)}
            aria-label={`Remover anexo ${image.name}`}
            className="absolute right-1 top-1 rounded bg-white/95 text-rose-700 p-1 hover:bg-white disabled:opacity-50 cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        {error && <span title={error} className="block px-1 pb-1 text-[10px] text-rose-600">Falha ao carregar</span>}
      </div>
      {expanded && src && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog" aria-modal="true" aria-label={`Imagem: ${image.name}`}
          onClick={() => setExpanded(false)}>
          <button type="button" onClick={() => setExpanded(false)}
            className="absolute right-5 top-5 rounded bg-white/15 text-white p-2 hover:bg-white/25 cursor-pointer" aria-label="Fechar imagem">
            <X className="w-5 h-5" />
          </button>
          <img src={src} alt={image.name} onClick={(event) => event.stopPropagation()} className="max-h-[90vh] max-w-full object-contain" />
        </div>
      )}
    </>
  );
};

/** Shared across every task entry point: Kanban, list, project, and personal week. */
export const TaskImages: React.FC<{
  images?: TaskImage[];
  pending?: PendingTaskImage[];
  onFiles?: (files: File[]) => void;
  onRemovePending?: (id: string) => void;
  onRemoveExisting?: (image: TaskImage) => void;
  canRemove?: (image: TaskImage) => boolean;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  onViewAll?: () => void;
}> = ({ images = [], pending = [], onFiles, onRemovePending, onRemoveExisting, canRemove, disabled, busy, compact, onViewAll }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const total = images.length + pending.length;

  const pick = (files: FileList | File[]) => {
    if (!disabled && onFiles) onFiles(Array.from(files));
  };

  return (
    <section className={compact ? 'space-y-1.5' : 'space-y-2.5'} aria-label="Anexos da demanda">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
          <Paperclip className="w-4 h-4 text-blue-600" />
          Anexos ({total}/{MAX_TASK_IMAGES})
        </h4>
        {busy && <span role="status" className="text-xs text-blue-700 flex items-center gap-1"><LoaderCircle className="w-3.5 h-3.5 animate-spin" /> Enviando anexos...</span>}
        {compact && onViewAll && <button type="button" onClick={onViewAll} className="text-[11px] font-bold text-blue-700 whitespace-nowrap">Ver anexos</button>}
      </div>
      {onFiles && (
        <div
          onDragEnter={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
          onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }}
          onDragLeave={(e) => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); } }}
          className={`rounded-lg border border-dashed text-center transition-colors ${compact ? 'px-3 py-2' : 'px-4 py-4'} ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}
        >
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx" multiple
            disabled={disabled || total >= MAX_TASK_IMAGES} className="sr-only"
            onChange={(e) => { pick(e.target.files || []); e.target.value = ''; }} />
          <button type="button" disabled={disabled || total >= MAX_TASK_IMAGES} onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 disabled:opacity-50 cursor-pointer">
            <ImagePlus className="w-4 h-4" /> Escolher anexos
          </button>
          <p className="mt-1 text-[10px] text-slate-500">{compact ? 'Ctrl+V para imagem · arraste ou escolha arquivos' : 'Imagens, PDF, Word e Excel • até 6 MB por arquivo • arraste ou escolha'}</p>
        </div>
      )}
      {(images.length > 0 || pending.length > 0) && (
        <div className={compact ? 'grid grid-cols-4 gap-1.5' : 'grid grid-cols-2 sm:grid-cols-4 gap-2'}>
          {(compact ? images.slice(0, 3) : images).map((image) => (
            <TaskImageThumb key={image.id} image={image} compact={compact} disabled={disabled}
              canRemove={Boolean(canRemove?.(image))} onRemove={onRemoveExisting} />
          ))}
          {compact && images.length > 3 && <button type="button" onClick={onViewAll}
            className="rounded-lg bg-slate-100 text-blue-700 text-[11px] font-bold">+{images.length - 3} anexos</button>}
          {(compact ? pending.slice(0, 1) : pending).map((item) => (
            <div key={item.id} className="relative bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
              {item.previewUrl ? (
                <img src={item.previewUrl} alt={item.file.name} className={`${compact ? 'h-12' : 'h-24'} w-full object-cover`} />
              ) : (
                <div className={`${compact ? 'h-12' : 'h-24'} flex items-center justify-center text-blue-700`}>
                  {item.file.type.includes('sheet') || item.file.type.includes('excel')
                    ? <FileSpreadsheet className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                </div>
              )}
              <span className="block p-1.5 truncate text-[10px] text-slate-700">{item.file.name}</span>
              {onRemovePending && (
                <button type="button" disabled={disabled} onClick={() => onRemovePending(item.id)}
                  aria-label={`Retirar anexo ${item.file.name}`}
                  className="absolute top-1 right-1 p-1 rounded bg-white/95 text-rose-700 disabled:opacity-50 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
