import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Boxes,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  TrendingDown,
  Clock,
  Sparkles,
  Calendar,
  X,
  Edit2,
  Trash2
} from 'lucide-react';

interface Props {
  reportId: string;
  dateFrom: string;
  dateTo: string;
  onRefreshParent?: () => void;
}

export const InventoryReportViews: React.FC<Props> = ({ reportId, dateFrom, dateTo, onRefreshParent }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [stallId, setStallId] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [forecastDays, setForecastDays] = useState(14);

  // Record Wastage Modal
  const [wastageModalOpen, setWastageModalOpen] = useState(false);
  const [wasteItemId, setWasteItemId] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Spoilage / Shelf Expiry');
  const [wasteUnitCost, setWasteUnitCost] = useState('');
  const [wasteSubmitting, setWasteSubmitting] = useState(false);

  // Remove Wastage Modal
  const [removeWastageModalOpen, setRemoveWastageModalOpen] = useState(false);
  const [wastageToRemove, setWastageToRemove] = useState<any>(null);
  const [removeWastageReason, setRemoveWastageReason] = useState('Incorrect entry');
  const [removingWastage, setRemovingWastage] = useState(false);

  // Record Stock Adjustment Modal
  const [adjModalOpen, setAdjModalOpen] = useState(false);
  const [adjItemId, setAdjItemId] = useState('');
  const [adjNewQty, setAdjNewQty] = useState('');
  const [adjReason, setAdjReason] = useState('Physical count reconciliation');
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Menu items list for select dropdowns
  const [menuItems, setMenuItems] = useState<any[]>([]);

  const userContext = { name: currentUser.name, role: currentUser.role, stallId: currentUser.stallId || null };

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const params: any = {
        dateFrom,
        dateTo,
        stallId: stallId !== 'ALL' ? stallId : undefined,
        category: category !== 'ALL' ? category : undefined,
        status: status !== 'ALL' ? status : undefined,
        search,
        days: forecastDays
      };

      if (reportId === 'inv-valuation') {
        const res = await api.getInventoryValuation(params, userContext);
        setData(res);
      } else if (reportId === 'stock-summary') {
        const res = await api.getStockSummary(params, userContext);
        setData(res);
      } else if (reportId === 'stock-movements') {
        const res = await api.getStockMovements(params, userContext);
        setData(res);
      } else if (reportId === 'stock-in') {
        const res = await api.getStockInReport(params, userContext);
        setData(res);
      } else if (reportId === 'stock-out') {
        const res = await api.getStockOutReport(params, userContext);
        setData(res);
      } else if (reportId === 'low-stock') {
        const res = await api.getLowStockReport(params, userContext);
        setData(res);
      } else if (reportId === 'wastage-report') {
        const res = await api.getWastageReport(params, userContext);
        setData(res);
      } else if (reportId === 'ingredient-consumption') {
        const res = await api.getIngredientConsumption(params, userContext);
        setData(res);
      } else if (reportId === 'inv-forecast') {
        const res = await api.getInventoryForecast(params, userContext);
        setData(res);
      } else if (reportId === 'stock-adjustment') {
        const res = await api.getStockMovements({ ...params, movementType: 'ADJUSTMENT' }, userContext);
        setData(res);
      }
    } catch (e) {
      console.error('Error loading inventory report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, [reportId, dateFrom, dateTo, stallId, category, status, search, forecastDays]);

  useEffect(() => {
    api.getInventory(stallId !== 'ALL' ? stallId : undefined).then(res => setMenuItems(res)).catch(() => {});
  }, [stallId]);

  const handleRecordWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteItemId || !wasteQty || Number(wasteQty) <= 0) {
      alert('Please select an item and enter a valid positive quantity.');
      return;
    }
    setWasteSubmitting(true);
    try {
      await api.recordWastage({
        itemId: wasteItemId,
        quantity: Number(wasteQty),
        reason: wasteReason,
        unitCost: wasteUnitCost ? Number(wasteUnitCost) : undefined
      }, userContext);
      setWastageModalOpen(false);
      setWasteItemId('');
      setWasteQty('');
      setWasteUnitCost('');
      fetchInventoryData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Failed to record wastage');
    } finally {
      setWasteSubmitting(false);
    }
  };

  const handleRecordAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjItemId || adjNewQty === '' || Number(adjNewQty) < 0) {
      alert('Please select an item and enter a valid new stock quantity.');
      return;
    }
    setAdjSubmitting(true);
    try {
      await api.recordStockAdjustment({
        itemId: adjItemId,
        newQuantity: Number(adjNewQty),
        reason: adjReason
      }, userContext);
      setAdjModalOpen(false);
      setAdjItemId('');
      setAdjNewQty('');
      fetchInventoryData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Failed to record stock adjustment');
    } finally {
      setAdjSubmitting(false);
    }
  };

  const handleRemoveWastage = async () => {
    if (!wastageToRemove) return;
    setRemovingWastage(true);
    try {
      const recordId = wastageToRemove.id || wastageToRemove.movementId || wastageToRemove.refNo;
      await api.removeWastage(recordId, removeWastageReason || 'Incorrect entry removal', userContext);
      setRemoveWastageModalOpen(false);
      setWastageToRemove(null);
      setRemoveWastageReason('Incorrect entry');
      fetchInventoryData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Failed to remove wastage record');
    } finally {
      setRemovingWastage(false);
    }
  };

  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
    rows.forEach(r => {
      csvContent += r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${dateFrom}-to-${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = (title: string, headers: string[], rows: (string | number)[][], summary?: { label: string; value: string }[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const summaryHtml = summary && summary.length > 0 ? `
      <div style="display:flex;gap:20px;margin-bottom:14px;padding:10px;background:#f8f9fa;border-radius:6px;border:1px solid #e9ecef;">
        ${summary.map(s => `<div><span style="font-size:10px;color:#6c757d;text-transform:uppercase;font-weight:bold;">${s.label}: </span><strong style="font-size:13px;color:#212529;">${s.value}</strong></div>`).join('')}
      </div>` : '';

    const tableHeaders = headers.map(h => `<th style="padding:6px 10px;border:1px solid #dee2e6;background:#f1f3f5;font-size:10px;text-transform:uppercase;font-weight:bold;text-align:left;">${h}</th>`).join('');
    const tableRows = rows.map((r, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fcfcfc'};">
        ${r.map(cell => `<td style="padding:6px 10px;border:1px solid #dee2e6;font-size:11px;color:#212529;">${cell ?? '-'}</td>`).join('')}
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Vivacity Food Court</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 12px; color: #212529; }
            .header { border-bottom: 2px solid #212529; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 11px; color: #495057; margin-top: 4px; }
            .meta { font-size: 10px; color: #6c757d; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">VIVACITY FOOD COURT</h1>
            <div class="subtitle"><strong>${title}</strong></div>
            <div class="meta">Date Period: <strong>${dateFrom}</strong> to <strong>${dateTo}</strong> &bull; Generated: <strong>${new Date().toLocaleString()}</strong></div>
          </div>
          ${summaryHtml}
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/90 shadow-2xs space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="font-bold text-zinc-500 text-xs">Querying stock ledger &amp; food valuations...</p>
      </div>
    );
  }

  // ========================================================
  // A. INVENTORY VALUATION
  // ========================================================
  if (reportId === 'inv-valuation') {
    const items = data?.items || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Inventory Valuation &amp; Asset Value</h2>
            <p className="text-[11px] text-zinc-500">
              Total stock on hand, reserved portions, available count &amp; valuation at cost
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-right mr-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Asset Valuation: </span>
              <span className="text-base font-black text-emerald-600">৳{(data?.totalValuation || 0).toLocaleString()}</span>
            </div>
            <button
              onClick={() => exportCSV('Vivacity-Inventory-Valuation', ['Item Name', 'Stall', 'Category', 'Unit', 'Physical Stock', 'Reserved', 'Available', 'Unit Cost (BDT)', 'Total Valuation (BDT)', 'Status'],
                items.map((i: any) => [i.name, i.stallName, i.category, i.unit, i.physicalStock, i.reservedStock, i.availableStock, i.unitCost, i.stockValue, i.status])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Inventory Valuation & Asset Value', ['Item Name', 'Stall', 'Category', 'Unit', 'Physical Stock', 'Reserved', 'Available', 'Unit Cost', 'Total Valuation', 'Status'],
                items.map((i: any) => [i.name, i.stallName, i.category, i.unit, `${i.physicalStock} ${i.unit}s`, i.reservedStock, i.availableStock, `৳${i.unitCost}`, `৳${Number(i.stockValue || 0).toLocaleString()}`, i.status]),
                [{ label: 'Total Asset Valuation', value: `৳${(data?.totalValuation || 0).toLocaleString()}` }]
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Stall &amp; Category</th>
                <th className="p-3 text-right">Physical Stock</th>
                <th className="p-3 text-right">Reserved</th>
                <th className="p-3 text-right">Available</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Total Stock Value</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((i: any) => (
                <tr key={i.itemId} className="hover:bg-zinc-50/70">
                  <td className="p-3 font-black text-zinc-900">{i.name}</td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-800">{i.stallName}</div>
                    <span className="text-[10px] text-zinc-400">{i.category}</span>
                  </td>
                  <td className="p-3 text-right font-black text-zinc-900">{i.physicalStock} {i.unit}s</td>
                  <td className="p-3 text-right text-amber-600 font-bold">{i.reservedStock}</td>
                  <td className="p-3 text-right font-black text-brand-600">{i.availableStock}</td>
                  <td className="p-3 text-right font-bold text-zinc-600">৳{i.unitCost}</td>
                  <td className="p-3 text-right font-black text-emerald-700">৳{i.stockValue.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      i.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800' :
                      i.status === 'LOW_STOCK' ? 'bg-amber-100 text-amber-800' :
                      i.status === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-zinc-200 text-zinc-700'
                    }`}>
                      {i.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // C. STOCK MOVEMENT / STOCK LEDGER
  // ========================================================
  if (reportId === 'stock-movements' || reportId === 'stock-adjustment') {
    const movements = data?.movements || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">
              {reportId === 'stock-adjustment' ? 'Stock Adjustment Audit Register' : 'Stock Movement & Material Ledger'}
            </h2>
            <p className="text-[11px] text-zinc-500">
              Traceable chronological audit trail of all receipts, issues, kitchen sales consumption &amp; adjustments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdjModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" /> Adjust Stock Count
            </button>
            <button
              onClick={() => exportCSV('Vivacity-Stock-Movements', ['Timestamp', 'Item', 'Movement Type', 'Qty In', 'Qty Out', 'Prev Balance', 'New Balance', 'Ref No', 'User', 'Notes'],
                movements.map((m: any) => [m.timestamp, m.itemName, m.movementType, m.quantityIn, m.quantityOut, m.previousBalance, m.newBalance, m.refNo, m.user, m.notes])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Stock Movement & Material Ledger', ['Timestamp', 'Item', 'Movement Type', 'Qty In', 'Qty Out', 'Balance', 'Reference', 'Recorded By', 'Notes'],
                movements.map((m: any) => [m.timestamp, m.itemName, m.movementType, m.quantityIn, m.quantityOut, m.newBalance, m.refNo, m.user, m.notes])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Timestamp &amp; Date</th>
                <th className="p-3">Item Name</th>
                <th className="p-3">Movement Type</th>
                <th className="p-3 text-right">In</th>
                <th className="p-3 text-right">Out</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Recorded By</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {movements.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-zinc-400">No stock movement events recorded yet.</td></tr>
              ) : (
                movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono text-[11px] text-zinc-600">
                      <div>{m.date}</div>
                      <div className="text-[9px] text-zinc-400">{m.timestamp?.slice(11, 19)}</div>
                    </td>
                    <td className="p-3 font-black text-zinc-900">{m.itemName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                        m.movementType === 'PURCHASE_RECEIPT' ? 'bg-blue-100 text-blue-800' :
                        m.movementType === 'SALES_CONSUMPTION' ? 'bg-zinc-100 text-zinc-800' :
                        m.movementType === 'WASTAGE' ? 'bg-rose-100 text-rose-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {m.movementType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600">{m.quantityIn > 0 ? `+${m.quantityIn}` : '-'}</td>
                    <td className="p-3 text-right font-bold text-rose-600">{m.quantityOut > 0 ? `-${m.quantityOut}` : '-'}</td>
                    <td className="p-3 text-right font-black text-zinc-900">{m.newBalance}</td>
                    <td className="p-3 font-mono text-zinc-500">{m.refNo}</td>
                    <td className="p-3 text-zinc-600">{m.user}</td>
                    <td className="p-3 text-zinc-500 italic max-w-xs truncate">{m.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Adjust Stock Count Modal */}
        {adjModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-brand-600" />
                  <span>Manual Physical Stock Adjustment</span>
                </h3>
                <button onClick={() => setAdjModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordAdjustment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Select Inventory Food Item
                  </label>
                  <select
                    value={adjItemId}
                    onChange={e => setAdjItemId(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                    required
                  >
                    <option value="">-- Choose item --</option>
                    {menuItems.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.stallName || m.stallId}) - Current: {m.inv?.preparedQty ?? 50}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Actual Physical Count (New Baseline)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 45"
                    value={adjNewQty}
                    onChange={e => setAdjNewQty(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Adjustment Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly physical inventory count count audit"
                    value={adjReason}
                    onChange={e => setAdjReason(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjSubmitting}
                    className="px-5 py-2 bg-brand-500 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {adjSubmitting ? 'Recording...' : 'Save Adjustment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // G. WASTAGE & DAMAGE REPORT
  // ========================================================
  if (reportId === 'wastage-report') {
    const list = data?.wastageRecords || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Kitchen Wastage &amp; Spoilage Loss</h2>
            <p className="text-[11px] text-zinc-500">Record food spoilage, burnt portions &amp; financial write-offs</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-right mr-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Financial Loss: </span>
              <span className="text-base font-black text-rose-600">৳{(data?.totalLossValue || 0).toLocaleString()}</span>
            </div>
            <button
              onClick={() => setWastageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Record Spoilage
            </button>
            <button
              onClick={() => exportCSV('Vivacity-Kitchen-Wastage', ['Date', 'Item Name', 'Quantity', 'Unit', 'Unit Cost', 'Total Loss Value', 'Reason', 'User'],
                list.map((w: any) => [w.date, w.itemName, w.quantityOut, w.unit, w.unitCost, w.totalValue, w.notes, w.user])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Kitchen Wastage & Spoilage Loss', ['Date', 'Wasted Item', 'Quantity', 'Unit Cost', 'Loss Value', 'Reason / Notes', 'Employee'],
                list.map((w: any) => [w.date, w.itemName, `${w.quantityOut} ${w.unit}s`, `৳${w.unitCost}`, `৳${Number(w.totalValue).toLocaleString()}`, w.notes, w.user]),
                [{ label: 'Total Financial Loss', value: `৳${(data?.totalLossValue || 0).toLocaleString()}` }]
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Wasted Item</th>
                <th className="p-3 text-right">Quantity</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Total Loss Value</th>
                <th className="p-3">Reason / Details</th>
                <th className="p-3">Employee</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-zinc-400">Zero wastage recorded for this period. Great kitchen efficiency!</td></tr>
              ) : (
                list.map((w: any) => (
                  <tr key={w.id} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono text-zinc-600">{w.date}</td>
                    <td className="p-3 font-black text-zinc-900">{w.itemName}</td>
                    <td className="p-3 text-right font-black text-rose-600">{w.quantityOut} {w.unit}s</td>
                    <td className="p-3 text-right font-bold text-zinc-600">৳{w.unitCost}</td>
                    <td className="p-3 text-right font-black text-rose-600">৳{w.totalValue.toLocaleString()}</td>
                    <td className="p-3 text-zinc-600 italic">{w.notes}</td>
                    <td className="p-3 font-bold text-zinc-700">{w.user}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setWastageToRemove(w);
                          setRemoveWastageReason('Entered by mistake');
                          setRemoveWastageModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                        title="Remove incorrect wastage record"
                      >
                        <Trash2 className="w-3 h-3 text-rose-600" />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Record Wastage Modal */}
        {wastageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                  <span>Record Kitchen Wastage / Loss</span>
                </h3>
                <button onClick={() => setWastageModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordWastage} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Select Wasted Food Item
                  </label>
                  <select
                    value={wasteItemId}
                    onChange={e => setWasteItemId(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                    required
                  >
                    <option value="">-- Choose item --</option>
                    {menuItems.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.stallName || m.stallId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Wasted Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 3"
                    value={wasteQty}
                    onChange={e => setWasteQty(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Reason for Loss
                  </label>
                  <select
                    value={wasteReason}
                    onChange={e => setWasteReason(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl"
                  >
                    <option value="Spoilage / Shelf Expiry">Spoilage / Shelf Expiry</option>
                    <option value="Kitchen Preparation Burn / Mistake">Kitchen Preparation Burn / Mistake</option>
                    <option value="Packaging Damage">Packaging Damage</option>
                    <option value="Dropped / Accident">Dropped / Accident</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setWastageModalOpen(false)}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={wasteSubmitting}
                    className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {wasteSubmitting ? 'Recording...' : 'Write-Off Loss'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Remove Wastage Confirmation Modal */}
        {removeWastageModalOpen && wastageToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Remove Wastage Entry</span>
                </h3>
                <button onClick={() => setRemoveWastageModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
                <p className="font-bold">Are you sure you want to remove this wastage record?</p>
                <p className="text-[11px] text-rose-700">
                  <strong>{wastageToRemove.itemName}</strong> &bull; {wastageToRemove.quantityOut} {wastageToRemove.unit}s (৳{Number(wastageToRemove.totalValue || 0).toLocaleString()})
                </p>
                <p className="text-[10px] text-zinc-500 pt-1">
                  The deducted stock will be reversed back into active inventory, the loss value deducted from financial reports, and an immutable audit log created.
                </p>
              </div>

              <div className="space-y-1 text-xs">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase">
                  Removal Reason (Audit Log)
                </label>
                <input
                  type="text"
                  value={removeWastageReason}
                  onChange={e => setRemoveWastageReason(e.target.value)}
                  placeholder="e.g. Mistyped quantity, duplicate entry..."
                  className="w-full p-2 border border-zinc-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setRemoveWastageModalOpen(false)}
                  disabled={removingWastage}
                  className="px-4 py-2 border border-zinc-200 text-zinc-600 font-bold rounded-xl cursor-pointer hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveWastage}
                  disabled={removingWastage}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {removingWastage ? 'Removing...' : 'Confirm Remove'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // H. INGREDIENT CONSUMPTION (RECIPE BOM)
  // ========================================================
  if (reportId === 'ingredient-consumption') {
    const list = data?.consumption || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Ingredient Consumption (Recipe BOM)</h2>
            <p className="text-[11px] text-zinc-500">
              Bill of Materials consumption derived from finalized customer tickets. Unconfigured items are explicitly marked.
            </p>
          </div>
          <button
            onClick={() => exportCSV('Vivacity-Ingredient-Consumption', ['Food Item', 'Qty Sold', 'Ingredient', 'Recipe Qty', 'Total Expected Consumption', 'Total Cost'],
              list.map((c: any) => [c.foodItemName, c.quantitySold, c.ingredientName, c.recipeQtyPerItem || '-', c.totalExpectedConsumption || '-', c.totalConsumptionCost || '-'])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Food Item Sold</th>
                <th className="p-3 text-right">Sold Count</th>
                <th className="p-3">Required Ingredient</th>
                <th className="p-3 text-right">Per Portion</th>
                <th className="p-3 text-right">Expected Consumption</th>
                <th className="p-3 text-right">Total Ingredient Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-400">No finalized sales found for ingredient breakdown.</td></tr>
              ) : (
                list.map((c: any, idx: number) => (
                  <tr key={`${c.foodItemId}-${idx}`} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">{c.foodItemName}</td>
                    <td className="p-3 text-right font-bold text-brand-600">{c.quantitySold}</td>
                    <td className="p-3 font-bold text-zinc-800">
                      {c.hasRecipe ? (
                        <span>{c.ingredientName}</span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Recipe Not Configured</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-zinc-600">
                      {c.hasRecipe ? `${c.recipeQtyPerItem} ${c.unit}` : '-'}
                    </td>
                    <td className="p-3 text-right font-black text-zinc-900">
                      {c.hasRecipe ? `${c.totalExpectedConsumption} ${c.unit}` : '-'}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-700">
                      {c.hasRecipe ? `৳${c.totalConsumptionCost?.toLocaleString()}` : (
                        <span className="text-[10px] text-zinc-400 italic">Recipe Not Configured</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // B. STOCK SUMMARY
  // ========================================================
  if (reportId === 'stock-summary') {
    const items: any[] = data?.items || [];
    const counts = data?.counts || { IN_STOCK: 0, LOW_STOCK: 0, CRITICAL: 0, OUT_OF_STOCK: 0 };
    const filtered = items.filter(i => {
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.category.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== 'ALL' && i.status !== status) return false;
      return true;
    });

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Stock Summary Position</h2>
            <p className="text-[11px] text-zinc-500">
              Live inventory balances across prepared, sold, reserved & available stock ({items.length} items)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search stock items..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs"
              />
            </div>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="p-1.5 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50"
            >
              <option value="ALL">All Statuses</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="CRITICAL">Critical</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
            <button
              onClick={() => exportCSV(
                'Vivacity-Stock-Summary',
                ['Item', 'Stall', 'Category', 'Unit', 'Prepared Qty', 'Sold Qty', 'Physical Stock', 'Reserved', 'Available', 'Min Stock', 'Reorder Level', 'Status'],
                filtered.map(i => [i.name, i.stallName, i.category, i.unit, i.preparedQty, i.soldQty, i.physicalStock, i.reservedStock, i.availableStock, i.minStock, i.reorderLevel, i.status])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Status Counts Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">In Stock</span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{counts.IN_STOCK || 0}</div>
            <span className="text-[10px] text-emerald-600">Healthy quantity</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Low Stock</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">{counts.LOW_STOCK || 0}</div>
            <span className="text-[10px] text-amber-600">Nearing reorder level</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Critical Stock</span>
            <div className="text-xl font-black text-rose-900 mt-0.5">{counts.CRITICAL || 0}</div>
            <span className="text-[10px] text-rose-600">Below minimum buffer</span>
          </div>
          <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-zinc-600 uppercase">Out of Stock</span>
            <div className="text-xl font-black text-zinc-900 mt-0.5">{counts.OUT_OF_STOCK || 0}</div>
            <span className="text-[10px] text-zinc-500">Zero inventory</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200 sticky top-0 z-10">
              <tr>
                <th className="p-3">Item Name</th>
                <th className="p-3">Stall & Category</th>
                <th className="p-3 text-right">Physical Stock</th>
                <th className="p-3 text-right">Reserved</th>
                <th className="p-3 text-right">Available</th>
                <th className="p-3 text-right">Reorder Threshold</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">No stock items match your search.</td>
                </tr>
              ) : (
                filtered.map(i => (
                  <tr key={i.itemId} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">
                      <div>{i.name}</div>
                      <span className="text-[10px] text-zinc-400 font-mono">{i.itemId}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-800">{i.stallName}</div>
                      <span className="text-[10px] text-zinc-400">{i.category}</span>
                    </td>
                    <td className="p-3 text-right font-black text-zinc-900">{i.physicalStock} {i.unit}s</td>
                    <td className="p-3 text-right font-bold text-amber-600">{i.reservedStock}</td>
                    <td className="p-3 text-right font-black text-emerald-600">{i.availableStock}</td>
                    <td className="p-3 text-right text-zinc-500">Min: {i.minStock} | Reorder: {i.reorderLevel}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        i.status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800' :
                        i.status === 'LOW_STOCK' ? 'bg-amber-100 text-amber-800' :
                        i.status === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-zinc-200 text-zinc-800'
                      }`}>
                        {i.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // D. STOCK IN REPORT (RECEIPTS & DELIVERIES)
  // ========================================================
  if (reportId === 'stock-in') {
    const list: any[] = Array.isArray(data) ? data : [];
    const totalQty = list.reduce((s, x) => s + (x.quantity || x.receivedQty || 0), 0);
    const totalVal = list.reduce((s, x) => s + (x.totalValue || 0), 0);

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Stock In Report (Goods Received)</h2>
            <p className="text-[11px] text-zinc-500">
              Audit log of all ingredient receipts, supplier deliveries, GRNs, and inventory additions
            </p>
          </div>
          <button
            onClick={() => exportCSV(
              'Vivacity-Stock-In',
              ['Date', 'Item Name', 'Supplier', 'PO #', 'Quantity', 'Unit Cost (BDT)', 'Total Value (BDT)', 'Received By'],
              list.map(r => [r.date, r.itemName || r.name, r.supplier || 'Direct', r.poNumber || '—', `${r.quantity || r.receivedQty} ${r.unit || 'unit'}`, r.unitCost || 0, r.totalValue || 0, r.receivedBy || 'Staff'])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Intake Records</span>
            <div className="text-lg font-black text-zinc-900 mt-0.5">{list.length} GRNs</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase">Received Units</span>
            <div className="text-lg font-black text-blue-900 mt-0.5">{totalQty} units</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Stock-In Financial Value</span>
            <div className="text-lg font-black text-emerald-900 mt-0.5">৳{totalVal.toLocaleString()}</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Receipt Date</th>
                <th className="p-3">Ingredient / Item</th>
                <th className="p-3">Vendor / Supplier</th>
                <th className="p-3 font-mono">PO # / Ref</th>
                <th className="p-3 text-right">Quantity In</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Total Value</th>
                <th className="p-3">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    No stock-in receipts recorded for this period.
                  </td>
                </tr>
              ) : (
                list.map((r, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-semibold text-zinc-700">{r.date}</td>
                    <td className="p-3 font-black text-zinc-900">{r.itemName || r.name}</td>
                    <td className="p-3 font-bold text-zinc-800">{r.supplier || 'Direct'}</td>
                    <td className="p-3 font-mono text-zinc-600">{r.poNumber || '—'}</td>
                    <td className="p-3 text-right font-black text-emerald-700">+{r.quantity || r.receivedQty} {r.unit || 'unit'}</td>
                    <td className="p-3 text-right text-zinc-600">৳{(r.unitCost || 0).toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-zinc-900">৳{(r.totalValue || 0).toLocaleString()}</td>
                    <td className="p-3 text-zinc-500 text-[11px]">{r.receivedBy || 'Staff'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // E. STOCK OUT REPORT (ISSUES & DISBURSEMENTS)
  // ========================================================
  if (reportId === 'stock-out') {
    const list: any[] = Array.isArray(data) ? data : [];
    const totalOut = list.reduce((s, x) => s + (x.quantity || 0), 0);

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Stock Out Report (Consumption & Issues)</h2>
            <p className="text-[11px] text-zinc-500">
              Disbursements to kitchen stalls, production recipe consumption, and write-offs
            </p>
          </div>
          <button
            onClick={() => exportCSV(
              'Vivacity-Stock-Out',
              ['Date', 'Item Name', 'Stall / Location', 'Quantity Out', 'Reason', 'Responsible User'],
              list.map(o => [o.date, o.itemName, o.stallName || 'Kitchen', `${o.quantity} ${o.unit || 'portion'}`, o.reason || 'Production', o.responsibleUser || 'Kitchen'])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Stock-Out Transactions</span>
            <div className="text-lg font-black text-zinc-900 mt-0.5">{list.length} disbursements</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Total Portions Disbursed</span>
            <div className="text-lg font-black text-rose-900 mt-0.5">{totalOut} units</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Disbursement Date</th>
                <th className="p-3">Item / Ingredient</th>
                <th className="p-3">Destination / Stall</th>
                <th className="p-3 text-right">Quantity Out</th>
                <th className="p-3">Reason / Context</th>
                <th className="p-3">Authorized By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    No stock-out entries found for this period.
                  </td>
                </tr>
              ) : (
                list.map((o, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-semibold text-zinc-700">{o.date}</td>
                    <td className="p-3 font-black text-zinc-900">{o.itemName}</td>
                    <td className="p-3 font-bold text-brand-600">{o.stallName || 'Main Kitchen'}</td>
                    <td className="p-3 text-right font-black text-rose-600">-{o.quantity} {o.unit || 'portion'}</td>
                    <td className="p-3 text-zinc-700">{o.reason || 'Kitchen Production'}</td>
                    <td className="p-3 text-zinc-500 text-[11px]">{o.responsibleUser || 'Staff'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // F. LOW STOCK & REORDER REPORT
  // ========================================================
  if (reportId === 'low-stock') {
    const items: any[] = data?.lowStockItems || [];
    const totalCount = data?.totalLowStockCount || items.length;
    const estCost = data?.estimatedReorderCost || 0;

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Low Stock & Reorder Alerts</h2>
            <p className="text-[11px] text-zinc-500">
              Items at or below safe replenishment threshold with suggested procurement quantities
            </p>
          </div>
          <button
            onClick={() => exportCSV(
              'Vivacity-Low-Stock',
              ['Item Name', 'Stall', 'Available', 'Reorder Level', 'Min Stock', 'Suggested Purchase', 'Est Cost (BDT)'],
              items.map(i => [i.name, i.stallName, i.available, i.reorderLevel, i.minStock, i.suggestedPurchaseQty, i.estimatedPurchaseCost])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Alert Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-amber-700">Breached Reorder Level</span>
            <div className="text-2xl font-black text-amber-900 mt-0.5">{totalCount} items</div>
            <p className="text-[10px] text-amber-600 mt-1">Requires immediate supplier purchase order</p>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-zinc-500">Estimated Reorder Outlay</span>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">৳{estCost.toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500 mt-1">To bring stock back to par level</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Item / Ingredient</th>
                <th className="p-3">Stall</th>
                <th className="p-3 text-right">Available Stock</th>
                <th className="p-3 text-right">Reorder Threshold</th>
                <th className="p-3 text-right">Min Par Level</th>
                <th className="p-3 text-right">Suggested Purchase</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-emerald-600 font-bold">
                    ✓ All inventory levels are healthy! No items have breached minimum replenishment thresholds.
                  </td>
                </tr>
              ) : (
                items.map((i, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">{i.name}</td>
                    <td className="p-3 font-bold text-zinc-700">{i.stallName}</td>
                    <td className="p-3 text-right font-black text-rose-600">{i.available}</td>
                    <td className="p-3 text-right font-bold text-amber-600">{i.reorderLevel}</td>
                    <td className="p-3 text-right text-zinc-500">{i.minStock}</td>
                    <td className="p-3 text-right font-black text-blue-600">+{i.suggestedPurchaseQty}</td>
                    <td className="p-3 text-zinc-700">{i.preferredSupplier || '—'}</td>
                    <td className="p-3 text-right font-black text-zinc-900">৳{(i.estimatedPurchaseCost || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // K. INVENTORY FORECASTING (DEMAND PREDICTION)
  // ========================================================
  if (reportId === 'inv-forecast') {
    const horizon = data?.forecastHorizonDays || forecastDays;
    const forecasts: any[] = data?.forecasts || [];
    const totalEstCost = data?.totalSuggestedReorderCost || 0;
    const stockoutRisks = forecasts.filter(f => f.willStockOut);

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-zinc-900">Inventory Demand Forecast</h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                {horizon}-Day Horizon
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Run-rate demand model based on historical daily consumption & order trends
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={forecastDays}
              onChange={e => setForecastDays(Number(e.target.value))}
              className="p-1.5 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50"
            >
              <option value={7}>7-Day Horizon</option>
              <option value={14}>14-Day Horizon</option>
              <option value={30}>30-Day Horizon</option>
              <option value={60}>60-Day Horizon</option>
            </select>
            <button
              onClick={() => exportCSV(
                'Vivacity-Inventory-Forecast',
                ['Item Name', 'Category', 'Available Stock', 'Avg Daily Burn', 'Days Until Stockout', 'Will Stockout?', 'Suggested PO Qty', 'Est Reorder Outlay (BDT)'],
                forecasts.map(f => [f.itemName, f.category, f.availableStock, f.avgDailyConsumption, f.daysUntilStockout, f.willStockOut ? 'YES' : 'NO', f.suggestedReorderQuantity, f.estimatedPurchaseCost])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Prediction Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-zinc-500">Analyzed Menu Items</span>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">{forecasts.length} items</div>
            <p className="text-[10px] text-zinc-400 mt-1">Simulated against {horizon} days</p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-rose-700">Projected Stockouts</span>
            <div className="text-2xl font-black text-rose-900 mt-0.5">{stockoutRisks.length} items</div>
            <p className="text-[10px] text-rose-600 mt-1">Will exhaust buffer before horizon</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-blue-700">Projected Reorder Capital</span>
            <div className="text-2xl font-black text-blue-900 mt-0.5">৳{totalEstCost.toLocaleString()}</div>
            <p className="text-[10px] text-blue-600 mt-1">Recommended replenishment budget</p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200 sticky top-0 z-10">
              <tr>
                <th className="p-3">Item / Product</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Available Stock</th>
                <th className="p-3 text-right">Daily Burn Rate</th>
                <th className="p-3 text-right">Weekly Burn Rate</th>
                <th className="p-3 text-right">Stockout Runway</th>
                <th className="p-3 text-right">Suggested PO</th>
                <th className="p-3 text-right">Est. Outlay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {forecasts.map(f => (
                <tr key={f.itemId} className="hover:bg-zinc-50/70">
                  <td className="p-3 font-black text-zinc-900">{f.itemName}</td>
                  <td className="p-3 font-semibold text-zinc-600">{f.category}</td>
                  <td className="p-3 text-right font-black text-zinc-900">{f.availableStock} {f.unit}s</td>
                  <td className="p-3 text-right font-bold text-zinc-700">~{f.avgDailyConsumption} / day</td>
                  <td className="p-3 text-right text-zinc-500">~{f.avgWeeklyConsumption} / wk</td>
                  <td className="p-3 text-right font-black">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      f.daysUntilStockout <= 7 ? 'bg-rose-100 text-rose-800' :
                      f.daysUntilStockout <= 14 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {f.daysUntilStockout} days
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-blue-600">
                    {f.suggestedReorderQuantity > 0 ? `+${f.suggestedReorderQuantity} ${f.unit}` : '0'}
                  </td>
                  <td className="p-3 text-right font-black text-emerald-700">
                    {f.estimatedPurchaseCost > 0 ? `৳${f.estimatedPurchaseCost.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Fallback (clean error, never raw JSON)
  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-8 text-center space-y-2">
      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
      <h3 className="text-base font-black text-zinc-900 capitalize">{reportId.replace(/-/g, ' ')}</h3>
      <p className="text-xs text-zinc-500">Report data loaded. No additional layout required.</p>
    </div>
  );
};
