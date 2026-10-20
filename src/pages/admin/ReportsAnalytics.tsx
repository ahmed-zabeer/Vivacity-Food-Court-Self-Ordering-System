import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Download, TrendingUp, DollarSign, Calendar, FileSpreadsheet } from 'lucide-react';

export const ReportsAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(res => setAnalytics(res))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCSV = () => {
    if (!analytics || !analytics.stallPerformance) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Stall Name,Total Orders,Gross Sales (BDT),Commission Rate,Commission (BDT),Net Settlement (BDT)\n";

    analytics.stallPerformance.forEach((s: any) => {
      csvContent += `"${s.name}",${s.orders},${s.grossSales},${s.commissionRate},${s.commission},${s.netSettlement}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VivaCity-Settlement-Report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Financial Analytics &amp; Stall Settlements
          </h1>
          <p className="text-xs text-zinc-500">
            Automated food hall merchant reconciliation, commissions, and revenue breakdowns
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer self-start"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Settlement CSV</span>
        </button>
      </div>

      {/* Top Revenue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-zinc-400">Total Food Court Volume</span>
          <div className="text-2xl font-black text-zinc-900">৳ {analytics?.totalRevenue || 0}</div>
          <p className="text-[11px] text-zinc-500">All paid dine-in and parcel master orders</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-zinc-400">Management Commission (15%)</span>
          <div className="text-2xl font-black text-brand-600">
            ৳ {Math.round((analytics?.totalRevenue || 0) * 0.15)}
          </div>
          <p className="text-[11px] text-zinc-500">Venue management revenue retained</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-zinc-400">Merchant Net Payout</span>
          <div className="text-2xl font-black text-emerald-600">
            ৳ {Math.round((analytics?.totalRevenue || 0) * 0.85)}
          </div>
          <p className="text-[11px] text-zinc-500">Net payout payable to the 6 culinary kitchens</p>
        </div>
      </div>

      {/* Merchant Settlement Ledger Table */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Stall Commission Settlement Ledger
          </h3>
          <span className="text-[10px] font-bold text-zinc-400">Standard 15% Settlement Agreement</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/60 text-[10px] font-black uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="p-4">Kitchen Stall</th>
                <th className="p-4">Orders Fulfilled</th>
                <th className="p-4">Gross Sales</th>
                <th className="p-4">Commission (15%)</th>
                <th className="p-4">Net Merchant Payout</th>
                <th className="p-4">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {analytics?.stallPerformance?.map((stall: any) => (
                <tr key={stall.stallId} className="hover:bg-zinc-50/50">
                  <td className="p-4 font-bold text-zinc-900">{stall.name}</td>
                  <td className="p-4 text-zinc-600">{stall.orders}</td>
                  <td className="p-4 font-black text-zinc-900">৳ {stall.grossSales}</td>
                  <td className="p-4 font-bold text-brand-600">৳ {stall.commission}</td>
                  <td className="p-4 font-black text-emerald-700">৳ {stall.netSettlement}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Reconciled
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
