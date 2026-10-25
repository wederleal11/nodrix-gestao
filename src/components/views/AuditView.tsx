import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Clock, User, ArrowRight } from 'lucide-react';
import type { AuditLog } from '../../types';
import { subscribeAuditLogs } from '../../services/db';
import { formatDateTimeBR } from '../../utils/formatters';

export const AuditView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = subscribeAuditLogs((items) => {
      setLogs(items);
    }, 100);
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actorName.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Trilha de Auditoria & Governança
          </h1>
          <p className="text-xs text-slate-500">
            Registro imutável de todas as transições de status, aprovações de entregas e alterações de prioridade.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por ação, autor ou termo..."
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs"
          />
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Nenhum evento de auditoria registrado ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {log.action}
                    </span>
                    <span className="text-slate-400">· {log.actorName}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    {log.details}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateTimeBR(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
