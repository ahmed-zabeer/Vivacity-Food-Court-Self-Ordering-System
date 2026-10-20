import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Table } from '../../types';
import { QRBadgeModal } from '../../components/common/QRBadgeModal';
import { QrCode, Printer, Download, Copy, Check, Search, Filter } from 'lucide-react';

export const QRCodesManager: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedQRTable, setSelectedQRTable] = useState<Table | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTables()
      .then(res => setTables(res))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (tableId: string) => {
    const url = `${window.location.origin}/t/${tableId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tableId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintA4Sheet = () => {
    window.print();
  };

  const filtered = tables.filter(t => 
    t.id.toLowerCase().includes(search.toLowerCase()) || 
    t.zone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 no-print">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            55 Table QR Code Management
          </h1>
          <p className="text-xs text-zinc-500">
            Generate, preview, download, and print table tent badges for all 55 dining stations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintA4Sheet}
            className="px-4 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print All 55 A4 Sheet</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="no-print">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search table number (e.g. T17) or zone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      {/* Grid of 55 Table QR Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((table) => {
          const tableUrl = typeof window !== 'undefined'
            ? `${window.location.origin}/t/${table.id}`
            : `https://vivacity.food/t/${table.id}`;

          return (
            <div
              key={table.id}
              className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs hover:shadow-sm hover:border-brand-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 block">
                    {table.zone}
                  </span>
                  <h3 className="text-xl font-black text-zinc-900">
                    TABLE {table.id}
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                  table.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {table.status}
                </span>
              </div>

              {/* QR Preview Graphic */}
              <div
                onClick={() => setSelectedQRTable(table)}
                className="w-36 h-36 mx-auto bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center p-2 cursor-pointer hover:border-brand-500 group transition-all"
                title="Click to expand high-res QR Badge"
              >
                <QrCode className="w-16 h-16 text-zinc-800 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-extrabold text-zinc-500 group-hover:text-brand-600 mt-1">
                  Preview Badge
                </span>
              </div>

              {/* URL & Action Tools */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 text-xs">
                <div className="text-[10px] text-zinc-400 font-mono truncate">
                  {tableUrl}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCopy(table.id)}
                    className="py-1.5 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center gap-1 transition-colors text-[11px]"
                  >
                    {copiedId === table.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === table.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedQRTable(table)}
                    className="py-1.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold flex items-center justify-center gap-1 transition-colors text-[11px] shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Badge</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for single Table QR */}
      {selectedQRTable && (
        <QRBadgeModal
          tableId={selectedQRTable.id}
          tableName={selectedQRTable.name}
          zone={selectedQRTable.zone}
          onClose={() => setSelectedQRTable(null)}
        />
      )}
    </div>
  );
};
