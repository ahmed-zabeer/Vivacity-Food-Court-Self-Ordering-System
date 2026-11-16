import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BusinessHealthData } from '../../types';
import { TrendingUp, AlertTriangle, Lightbulb, Wallet, ArrowUpRight, ArrowDownRight, Boxes, CalendarCheck, ShieldAlert, Sparkles } from 'lucide-react';

interface Props {
  onOpenDailyClosing: () => void;
}

export const BusinessHealthBar: React.FC<Props> = ({ onOpenDailyClosing }) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState<BusinessHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      const res = await api.getBusinessHealth({ name: currentUser.name, role: currentUser.role });
      setData(res);
    } catch (e) {
      console.error('Failed to load business health:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, [currentUser]);

  if (loading || !data) return null;

  return (
    <div className="space-y-4">
      {/* Top Banner: Quick KPIs & Daily Closing CTA */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-zinc-700/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-700/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Live Restaurant Business Intelligence
              </span>
              <span className="text-[11px] text-zinc-400">• Today: {data.today.date}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Financial Pulse &amp; Operational Health</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenDailyClosing}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Daily Restaurant Closing Report</span>
            </button>
          </div>
        </div>

        {/* 4 Primary Pulse Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Today Sales</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center gap-1.5">
              <span>৳{data.today.sales.toLocaleString()}</span>
              {data.today.salesChange !== null && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center ${
                  data.today.salesChange >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {data.today.salesChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(data.today.salesChange)}%
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400">{data.today.ordersCount} completed orders</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Today Expenses</span>
            <div className="text-xl sm:text-2xl font-black text-amber-400">
              ৳{data.today.expenses.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">Operating costs recorded</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Inventory Valuation</span>
            <div className="text-xl sm:text-2xl font-black text-blue-400">
              ৳{data.inventory.valuation.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">Stock on hand at cost</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Supplier Dues</span>
            <div className="text-xl sm:text-2xl font-black text-rose-400">
              ৳{data.payables.supplierPayables.toLocaleString()}
            </div>
            <p className="text-[10px] text-zinc-400">Outstanding vendor invoices</p>
          </div>
        </div>
      </div>

      {/* Dynamic Alerts & Smart Insights */}
      {(data.alerts.length > 0 || data.insights.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Smart Insights */}
          {data.insights.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Smart Restaurant Insights</span>
              </div>
              <div className="space-y-1.5">
                {data.insights.map(ins => (
                  <div key={ins.id} className="text-xs text-amber-950 flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-amber-200/50">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">{ins.title}: </strong>
                      <span>{ins.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operational Alerts */}
          {data.alerts.length > 0 && (
            <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Owner Attention Alerts</span>
              </div>
              <div className="space-y-1.5">
                {data.alerts.map(alt => (
                  <div key={alt.id} className="text-xs text-rose-950 flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-rose-200/50">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-bold">{alt.title}: </strong>
                      <span>{alt.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
