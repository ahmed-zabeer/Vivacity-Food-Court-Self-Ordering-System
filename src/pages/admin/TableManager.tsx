import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { Table, TableStatus } from '../../types';
import { QRBadgeModal } from '../../components/common/QRBadgeModal';
import {
  Grid,
  MapPin,
  Clock,
  QrCode,
  Users,
  CheckCircle,
  XCircle,
  RotateCcw,
  Printer
} from 'lucide-react';

export const TableManager: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [qrModalTableId, setQrModalTableId] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [loading, setLoading] = useState(true);
  const [confirmAvailableModal, setConfirmAvailableModal] = useState<any | null>(null);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const fetchTables = async () => {
    try {
      const res = await api.getTables();
      setTables(res);
      if (selectedTable) {
        const refreshed = await api.getTable(selectedTable.id);
        setSelectedTable(refreshed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();

    const unsub = realtime.on('table_updated', () => {
      fetchTables();
    });

    return () => unsub();
  }, []);

  const handleSelectTable = async (table: Table) => {
    try {
      const full = await api.getTable(table.id);
      setSelectedTable(full);
    } catch (e) {
      setSelectedTable(table);
    }
  };

  const handleStatusChange = async (tableId: string, status: TableStatus) => {
    try {
      await api.updateTableStatus(tableId, status);
      fetchTables();
    } catch (e) {
      alert('Failed to update table status');
    }
  };

  const handleCloseSession = async (tableId: string) => {
    try {
      await api.closeTableSession(tableId);
      fetchTables();
    } catch (e) {
      alert('Failed to close table session');
    }
  };

  const handleMarkAvailable = async (tableId: string, force = false) => {
    setClearing(true);
    setClearError(null);
    try {
      await api.markTableAvailable(tableId, {
        clearedBy: 'Manager',
        role: 'MANAGER',
        forceOverride: force
      });
      setConfirmAvailableModal(null);
      await fetchTables();
    } catch (err: any) {
      setClearError(err.message || 'Failed to mark table available');
    } finally {
      setClearing(false);
    }
  };

  const zones = [
    'ALL',
    'Zone A (Central Piazza)',
    'Zone B (Fusion Boulevard)',
    'Zone C (Garden Terrace)',
    'Executive VIP Lounge'
  ];

  const filteredTables = tables.filter(t => {
    return activeZone === 'ALL' || t.zone === activeZone;
  });

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ACTIVE': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PAYMENT DUE': return 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse';
      case 'PREPARING': return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'READY': return 'bg-teal-50 text-teal-700 border-teal-300';
      case 'DELIVERING': return 'bg-purple-50 text-purple-700 border-purple-300';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            55 Table Management &amp; Floor Map
          </h1>
          <p className="text-xs text-zinc-500">
            Real-time occupancy, dining sessions, and table-to-runner status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'grid' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            Card Grid
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'map' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'
            }`}
          >
            Visual Floor Map
          </button>
        </div>
      </div>

      {/* Zone Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {zones.map((zone) => (
          <button
            key={zone}
            onClick={() => setActiveZone(zone)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              activeZone === zone
                ? 'bg-brand-500 text-white'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {zone === 'ALL' ? `All 55 Tables` : zone}
          </button>
        ))}
      </div>

      {/* Tables Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2.5">
          {filteredTables.map((t) => (
            <div
              key={t.id}
              onClick={() => handleSelectTable(t)}
              className={`p-3 rounded-2xl border text-center cursor-pointer transition-all hover:scale-105 active:scale-95 flex flex-col justify-between shadow-2xs ${
                selectedTable?.id === t.id ? 'ring-2 ring-brand-500 shadow-md' : ''
              } ${getStatusColor(t.status)}`}
            >
              <div>
                <span className="text-sm font-black block tracking-tight">
                  {t.id}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider block mt-0.5">
                  {t.status}
                </span>
              </div>

              {t.activeOrderToken && (
                <span className="mt-2 text-[9px] font-black bg-zinc-900 text-white px-1.5 py-0.2 rounded-full inline-block">
                  #{t.activeOrderToken}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Visual Restaurant Floor Layout */
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-6">
          <div className="text-center text-xs font-bold text-zinc-400 uppercase tracking-widest pb-2 border-b border-zinc-100">
            FOOD HALL CENTRAL COUNTER &amp; KITCHEN PASS
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Zone A */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <h3 className="text-xs font-black uppercase text-zinc-800">Zone A: Central Piazza (T01 - T18)</h3>
              <div className="grid grid-cols-6 gap-2">
                {tables.slice(0, 18).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTable(t)}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all ${getStatusColor(t.status)}`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone B */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <h3 className="text-xs font-black uppercase text-zinc-800">Zone B: Fusion Boulevard (T19 - T36)</h3>
              <div className="grid grid-cols-6 gap-2">
                {tables.slice(18, 36).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTable(t)}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all ${getStatusColor(t.status)}`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone C & VIP */}
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
              <h3 className="text-xs font-black uppercase text-zinc-800">Garden Terrace &amp; VIP (T37 - T55)</h3>
              <div className="grid grid-cols-6 gap-2">
                {tables.slice(36).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTable(t)}
                    className={`p-2 rounded-xl border text-center text-xs font-bold transition-all ${getStatusColor(t.status)}`}
                  >
                    {t.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Table Inspection Drawer */}
      {selectedTable && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-zinc-900">
                  Table {selectedTable.id}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${getStatusColor(selectedTable.status)}`}>
                  {selectedTable.status}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{selectedTable.zone} • Capacity: {selectedTable.seats} Guests</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setQrModalTableId(selectedTable.id)}
                className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-brand-600" />
                <span>View &amp; Print QR</span>
              </button>

              {/* MARK TABLE AVAILABLE Button for active tables */}
              {selectedTable.status !== 'AVAILABLE' && (
                <button
                  onClick={() => {
                    setClearError(null);
                    setConfirmAvailableModal(selectedTable);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>MARK TABLE AVAILABLE</span>
                </button>
              )}

              {selectedTable.session?.active ? (
                <button
                  onClick={() => handleCloseSession(selectedTable.id)}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Table Session
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange(selectedTable.id, 'ACTIVE')}
                  className="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Open Table
                </button>
              )}
            </div>
          </div>

          {/* Table Session Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs">
              <span className="text-zinc-400 block font-bold text-[10px] uppercase">Active Session</span>
              <strong className="text-zinc-800 text-sm">{selectedTable.session?.id || 'No active session'}</strong>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs">
              <span className="text-zinc-400 block font-bold text-[10px] uppercase">Active Orders</span>
              <strong className="text-zinc-800 text-sm">{selectedTable.activeOrders?.length || 0} Orders</strong>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs">
              <span className="text-zinc-400 block font-bold text-[10px] uppercase">Total Spent Today</span>
              <strong className="text-brand-600 text-sm">৳ {selectedTable.totalSpentToday}</strong>
            </div>
          </div>
        </div>
      )}

      {/* QR Badge Modal */}
      {qrModalTableId && (
        <QRBadgeModal
          tableId={qrModalTableId}
          zone={tables.find(t => t.id === qrModalTableId)?.zone}
          onClose={() => setQrModalTableId(null)}
        />
      )}

      {/* MARK TABLE AVAILABLE Confirmation Modal */}
      {confirmAvailableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  Mark Table {confirmAvailableModal.id} Available
                </h3>
                <p className="text-xs text-zinc-500">
                  {confirmAvailableModal.zone} • {confirmAvailableModal.seats} Seats
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-100 text-xs text-zinc-700 leading-relaxed">
              Confirm that this table has been cleared and is ready for the next guest?
            </div>

            {clearError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                <div className="flex items-start gap-2 text-red-700 text-xs font-bold">
                  <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{clearError}</span>
                </div>
                <p className="text-[11px] text-red-600">
                  Please resolve unpaid bills or complete active food preparation before resetting this table.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmAvailableModal(null);
                  setClearError(null);
                }}
                disabled={clearing}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleMarkAvailable(confirmAvailableModal.id)}
                disabled={clearing}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                {clearing ? (
                  <span>Checking &amp; Clearing...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Available</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
