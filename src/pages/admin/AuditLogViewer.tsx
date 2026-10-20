import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { AuditLogEntry } from '../../types';
import { Shield, Clock, UserCheck } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await api.getAuditLogs();
      setLogs(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const unsub = realtime.on('audit_log', () => {
      fetchLogs();
    });

    return () => unsub();
  }, []);

  return (
    <div className="max-w-5xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Security &amp; Operations Audit Trail
          </h1>
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Immutable log of all order modifications, cashier confirmations, and menu updates
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="divide-y divide-zinc-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-zinc-50/50 transition-colors flex items-start gap-4 text-xs">
              <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                LOG
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-zinc-900">{log.action}</span>
                  <span className="text-[10px] text-zinc-400 font-bold">• By {log.user}</span>
                </div>
                <p className="text-zinc-600 mt-0.5 leading-relaxed font-normal">
                  {log.details}
                </p>
              </div>

              <div className="text-[10px] text-zinc-400 shrink-0 font-mono">
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
