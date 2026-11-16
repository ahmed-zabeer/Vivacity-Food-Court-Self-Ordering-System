import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  ShoppingCart,
  CheckCircle,
  Truck,
  Plus,
  RefreshCw,
  Wallet,
  Calendar,
  X,
  PackageCheck,
  AlertTriangle
} from 'lucide-react';

interface Props {
  reportId: string;
  dateFrom: string;
  dateTo: string;
  onRefreshParent?: () => void;
}

export const PurchaseReportViews: React.FC<Props> = ({ reportId, dateFrom, dateTo, onRefreshParent }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [supplier, setSupplier] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  // Supplier Payment Modal
  const [payModalPO, setPayModalPO] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRefNo, setPayRefNo] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Goods Receipt Modal
  const [receiveModalPO, setReceiveModalPO] = useState<any | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({});
  const [grnNumber, setGrnNumber] = useState('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);

  const userContext = { name: currentUser.name, role: currentUser.role };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = {
        dateFrom,
        dateTo,
        supplier: supplier !== 'ALL' ? supplier : undefined,
        status: status !== 'ALL' ? status : undefined,
        search
      };
      if (reportId === 'pur-order-list') {
        const res = await api.getPurchaseOrders(params, userContext);
        setData(res);
      } else if (reportId === 'pur-by-supplier') {
        const res = await api.getPurchaseBySupplier(params, userContext);
        setData(res);
      } else if (reportId === 'pur-item-details') {
        const res = await api.getPurchaseItemDetails(params, userContext);
        setData(res);
      } else if (reportId === 'pur-summary') {
        const res = await api.getPurchaseSummary(params, userContext);
        setData(res);
      }
    } catch (e) {
      console.error('Error loading purchase report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportId, dateFrom, dateTo, supplier, status, search]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalPO) return;
    const num = Number(payAmount);
    if (!payAmount || isNaN(num) || num <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }
    setPaySubmitting(true);
    try {
      await api.recordPurchasePayment(payModalPO.id, {
        amount: num,
        paymentMethod: payMethod,
        refNo: payRefNo
      }, userContext);
      setPayModalPO(null);
      setPayAmount('');
      setPayRefNo('');
      fetchData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Failed to record supplier payment');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveModalPO) return;
    setReceiveSubmitting(true);
    try {
      const itemsReceived = (receiveModalPO.items || []).map((it: any) => ({
        itemId: it.itemId,
        itemName: it.itemName,
        quantityReceived: Number(receiveQuantities[it.itemId] || 0)
      })).filter((ir: any) => ir.quantityReceived > 0);

      await api.recordGoodsReceipt(receiveModalPO.id, {
        itemsReceived,
        grnNumber: grnNumber || undefined
      }, userContext);

      setReceiveModalPO(null);
      setReceiveQuantities({});
      setGrnNumber('');
      fetchData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Failed to record goods receipt');
    } finally {
      setReceiveSubmitting(false);
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
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
        <p className="font-bold text-zinc-500 text-xs">Querying purchase orders &amp; supplier ledger...</p>
      </div>
    );
  }

  // ========================================================
  // A. PURCHASE ORDER LIST
  // ========================================================
  if (reportId === 'pur-order-list') {
    const orders = data?.orders || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Purchase Orders &amp; Invoices</h2>
            <p className="text-[11px] text-zinc-500">
              Procurement workflow: Draft → Ordered → Partially Received → Received with supplier settlement
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCSV('Vivacity-Purchase-Orders', ['PO Number', 'Supplier', 'Category', 'Order Date', 'Total Amount', 'Paid Amount', 'Due Amount', 'Order Status', 'Payment Status'],
                orders.map((p: any) => [p.poNumber, p.supplier, p.category, p.orderDate, p.totalAmount, p.paidAmount, p.dueAmount, p.orderStatus, p.paymentStatus])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Purchase Orders & Invoices', ['PO Number', 'Supplier', 'Category', 'Order Date', 'Total Amount', 'Paid Amount', 'Remaining Due', 'Delivery Status', 'Payment Status'],
                orders.map((p: any) => [p.poNumber, p.supplier, p.category, p.orderDate, `৳${Number(p.totalAmount || 0).toLocaleString()}`, `৳${Number(p.paidAmount || 0).toLocaleString()}`, `৳${Number(p.dueAmount || 0).toLocaleString()}`, p.orderStatus, p.paymentStatus]),
                [
                  { label: 'Total Orders', value: `${orders.length}` },
                  { label: 'Total Invoiced', value: `৳${orders.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0).toLocaleString()}` }
                ]
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
                <th className="p-3">PO Number</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Order Date</th>
                <th className="p-3 text-right">Total Invoice</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Remaining Due</th>
                <th className="p-3">Delivery Status</th>
                <th className="p-3">Payment</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-zinc-400">No purchase records found.</td></tr>
              ) : (
                orders.map((p: any) => (
                  <tr key={p.id} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono font-bold text-zinc-900">{p.poNumber}</td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-800">{p.supplier}</div>
                      <span className="text-[10px] text-zinc-400">{p.category}</span>
                    </td>
                    <td className="p-3">{p.orderDate}</td>
                    <td className="p-3 text-right font-black text-zinc-900">৳{p.totalAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">৳{p.paidAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-rose-600">৳{p.dueAmount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.orderStatus === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {p.orderStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.dueAmount > 0 && (
                          <button
                            onClick={() => {
                              setPayModalPO(p);
                              setPayAmount(String(p.dueAmount));
                            }}
                            className="px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Pay Due
                          </button>
                        )}
                        {p.orderStatus !== 'RECEIVED' && p.items?.length > 0 && (
                          <button
                            onClick={() => {
                              setReceiveModalPO(p);
                              const initial: Record<string, string> = {};
                              p.items.forEach((it: any) => {
                                initial[it.itemId] = String(Math.max(0, it.quantity - (it.receivedQuantity || 0)));
                              });
                              setReceiveQuantities(initial);
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Receive (GRN)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pay Supplier Modal */}
        {payModalPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-600" />
                  <span>Record Supplier Payment</span>
                </h3>
                <button onClick={() => setPayModalPO(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-50 p-3 rounded-2xl space-y-1 text-xs">
                <div className="font-bold text-zinc-900">PO: {payModalPO.poNumber}</div>
                <div className="text-zinc-500">Supplier: {payModalPO.supplier}</div>
                <div className="text-rose-600 font-black">Remaining Payable: ৳{payModalPO.dueAmount}</div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Payment Amount (৳)
                  </label>
                  <input
                    type="number"
                    max={payModalPO.dueAmount}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Payment Channel
                  </label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                  >
                    <option value="CASH">CASH (Physical Drawer)</option>
                    <option value="BANK">Bank Account / Cheque</option>
                    <option value="bKash">bKash Merchant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Voucher / Cheque Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cheque #49910"
                    value={payRefNo}
                    onChange={e => setPayRefNo(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayModalPO(null)}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paySubmitting}
                    className="px-5 py-2 bg-brand-500 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {paySubmitting ? 'Recording...' : 'Confirm Supplier Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Goods Receipt (GRN) Modal */}
        {receiveModalPO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-blue-600" />
                  <span>Receive Inventory (GRN)</span>
                </h3>
                <button onClick={() => setReceiveModalPO(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-50 p-3 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-zinc-900">PO: {receiveModalPO.poNumber} • {receiveModalPO.supplier}</div>
                <div className="text-zinc-500">Record physical stock delivered to restaurant store</div>
              </div>

              <form onSubmit={handleReceiveGoods} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    GRN / Delivery Note # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. GRN-2026-0041"
                    value={grnNumber}
                    onChange={e => setGrnNumber(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl"
                  />
                </div>

                <div className="space-y-2 border-t border-zinc-100 pt-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Received Quantities by Item:</span>
                  {(receiveModalPO.items || []).map((it: any) => (
                    <div key={it.itemId} className="flex items-center justify-between gap-3 bg-zinc-50 p-2 rounded-xl">
                      <div>
                        <div className="font-bold text-zinc-900">{it.itemName}</div>
                        <span className="text-[10px] text-zinc-500">
                          Ordered: {it.quantity} {it.unit}s • Already Received: {it.receivedQuantity || 0}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={receiveQuantities[it.itemId] || '0'}
                        onChange={e => setReceiveQuantities({ ...receiveQuantities, [it.itemId]: e.target.value })}
                        className="w-24 p-1.5 border border-zinc-200 rounded-lg text-right font-black"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReceiveModalPO(null)}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={receiveSubmitting}
                    className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {receiveSubmitting ? 'Recording...' : 'Accept & Update Stock'}
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
  // B. PURCHASE BY SUPPLIER
  // ========================================================
  if (reportId === 'pur-by-supplier') {
    const list = data || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Purchase By Supplier &amp; Accounts Payable</h2>
            <p className="text-[11px] text-zinc-500">Cumulative supplier transactions, deliveries, payments &amp; dues</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCSV('Vivacity-Purchases-By-Supplier', ['Supplier', 'PO Count', 'Total Invoices', 'Received Goods', 'Paid Amount', 'Outstanding Due'],
                list.map((s: any) => [s.supplierName, s.purchaseCount, s.totalPurchaseAmount, s.receivedValue, s.paidAmount, s.outstandingDue])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Purchase By Supplier & Accounts Payable', ['Supplier', 'PO Count', 'Total Invoiced', 'Received Goods', 'Paid Amount', 'Outstanding Due'],
                list.map((s: any) => [s.supplierName, s.purchaseCount, `৳${Number(s.totalPurchaseAmount || 0).toLocaleString()}`, `৳${Number(s.receivedValue || 0).toLocaleString()}`, `৳${Number(s.paidAmount || 0).toLocaleString()}`, `৳${Number(s.outstandingDue || 0).toLocaleString()}`]),
                [
                  { label: 'Suppliers', value: `${list.length}` },
                  { label: 'Total Invoices', value: `৳${list.reduce((sum: number, s: any) => sum + (s.totalPurchaseAmount || 0), 0).toLocaleString()}` },
                  { label: 'Total Outstanding Due', value: `৳${list.reduce((sum: number, s: any) => sum + (s.outstandingDue || 0), 0).toLocaleString()}` }
                ]
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
                <th className="p-3">Supplier Name</th>
                <th className="p-3 text-right">Invoices</th>
                <th className="p-3 text-right">Total Invoices (BDT)</th>
                <th className="p-3 text-right">Goods Received (BDT)</th>
                <th className="p-3 text-right">Amount Paid</th>
                <th className="p-3 text-right">Outstanding Payable</th>
                <th className="p-3">Last Purchase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((s: any) => (
                <tr key={s.supplierName} className="hover:bg-zinc-50/70">
                  <td className="p-3 font-black text-zinc-900">{s.supplierName}</td>
                  <td className="p-3 text-right font-bold">{s.purchaseCount}</td>
                  <td className="p-3 text-right font-black text-zinc-900">৳{s.totalPurchaseAmount.toLocaleString()}</td>
                  <td className="p-3 text-right text-blue-600 font-bold">৳{s.receivedValue.toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-600 font-bold">৳{s.paidAmount.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-600 font-black">৳{s.outstandingDue.toLocaleString()}</td>
                  <td className="p-3 text-zinc-500">{s.lastPurchaseDate || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // C. PURCHASE ITEM DETAILS
  // ========================================================
  if (reportId === 'pur-item-details') {
    const items: any[] = Array.isArray(data) ? data : (data ? [data] : []);
    const grandValue = items.reduce((s, x) => s + (x.totalPurchaseValue || 0), 0);
    const grandPurchasedQty = items.reduce((s, x) => s + (x.purchasedQuantity || 0), 0);
    const grandReceivedQty = items.reduce((s, x) => s + (x.receivedQuantity || 0), 0);

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Purchase Item Details</h2>
            <p className="text-[11px] text-zinc-500">
              Ingredient-wise procurement register with historical purchase prices, delivery status & quantities
            </p>
          </div>
          <button
            onClick={() => exportCSV(
              'Vivacity-Purchase-Item-Details',
              ['Item Name', 'Category', 'Supplier', 'Invoice #', 'Purchase Date', 'Purchased Qty', 'Received Qty', 'Unit Cost (BDT)', 'Total Value (BDT)'],
              items.map(i => [i.itemName, i.category, i.supplier, i.invoiceNumber, i.purchaseDate, `${i.purchasedQuantity} ${i.unit}`, `${i.receivedQuantity} ${i.unit}`, i.unitPurchaseCost, i.totalPurchaseValue])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-zinc-500">Total Purchase Value</span>
            <div className="text-xl font-black text-zinc-900 mt-0.5">৳{grandValue.toLocaleString()}</div>
            <span className="text-[10px] text-zinc-400">{items.length} line items ordered</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-blue-700">Total Ordered Units</span>
            <div className="text-xl font-black text-blue-900 mt-0.5">{grandPurchasedQty} units</div>
            <span className="text-[10px] text-blue-600">Expected intake</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-emerald-700">Delivered Units</span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{grandReceivedQty} units</div>
            <span className="text-[10px] text-emerald-600">
              {grandPurchasedQty > 0 ? `${Math.round((grandReceivedQty / grandPurchasedQty) * 100)}% fulfillment` : '0%'}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Ingredient / Item</th>
                <th className="p-3">Category</th>
                <th className="p-3">Supplier</th>
                <th className="p-3 font-mono">Invoice #</th>
                <th className="p-3">Order Date</th>
                <th className="p-3 text-right">Ordered Qty</th>
                <th className="p-3 text-right">Received Qty</th>
                <th className="p-3 text-right">Unit Cost</th>
                <th className="p-3 text-right">Line Total (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    No purchase item records found for this period.
                  </td>
                </tr>
              ) : (
                items.map((i, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">{i.itemName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold uppercase">
                        {i.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-zinc-800">{i.supplier}</td>
                    <td className="p-3 font-mono text-zinc-600">{i.invoiceNumber || '—'}</td>
                    <td className="p-3 text-zinc-500">{i.purchaseDate}</td>
                    <td className="p-3 text-right font-black text-zinc-800">{i.purchasedQuantity} {i.unit}</td>
                    <td className="p-3 text-right font-black text-blue-600">{i.receivedQuantity} {i.unit}</td>
                    <td className="p-3 text-right text-zinc-600">৳{i.unitPurchaseCost?.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-emerald-700">৳{i.totalPurchaseValue?.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-zinc-100 font-black text-zinc-900 text-xs border-t-2 border-zinc-300">
                <tr>
                  <td className="p-3" colSpan={5}>TOTAL</td>
                  <td className="p-3 text-right">{grandPurchasedQty}</td>
                  <td className="p-3 text-right text-blue-700">{grandReceivedQty}</td>
                  <td className="p-3 text-right">—</td>
                  <td className="p-3 text-right text-emerald-700">৳{grandValue.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // D. PURCHASE SUMMARY & TOP VENDORS
  // ========================================================
  if (reportId === 'pur-summary') {
    const s = data || {};
    const topSuppliers: any[] = s.topSuppliers || [];

    return (
      <div className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Total Purchase Orders</span>
            <div className="text-xl font-black text-zinc-900">{s.totalPurchaseOrders || 0}</div>
            <p className="text-[10px] text-zinc-500">{s.pendingDeliveriesCount || 0} pending receipt</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Total Procurement Value</span>
            <div className="text-xl font-black text-zinc-900">৳{(s.totalPurchaseValue || 0).toLocaleString()}</div>
            <p className="text-[10px] text-blue-600">৳{(s.totalGoodsReceivedValue || 0).toLocaleString()} goods delivered</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Paid to Vendors</span>
            <div className="text-xl font-black text-emerald-600">৳{(s.amountPaid || 0).toLocaleString()}</div>
            <p className="text-[10px] text-emerald-600">Settled invoices</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Outstanding Payables</span>
            <div className="text-xl font-black text-rose-600">৳{(s.amountDue || 0).toLocaleString()}</div>
            <p className="text-[10px] text-rose-500">Unsettled vendor liability</p>
          </div>
        </div>

        {/* Top Suppliers Table */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900">Top Ingredient Suppliers by Volume</h2>
              <p className="text-[11px] text-zinc-500">Ranked by total purchase transaction value</p>
            </div>
            <button
              onClick={() => exportCSV(
                'Vivacity-Top-Suppliers',
                ['Supplier Name', 'Total Purchases (BDT)'],
                topSuppliers.map(sup => [sup.name, sup.amount])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3 text-right">Total Procurement Value</th>
                  <th className="p-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-400">No supplier purchasing activity in this period.</td>
                  </tr>
                ) : (
                  topSuppliers.map((sup, idx) => {
                    const totalVal = s.totalPurchaseValue || 1;
                    const pct = Math.min(100, Math.round((sup.amount / totalVal) * 100));
                    return (
                      <tr key={idx} className="hover:bg-zinc-50/70">
                        <td className="p-3 font-bold text-zinc-400">{idx + 1}</td>
                        <td className="p-3 font-black text-zinc-900">{sup.name}</td>
                        <td className="p-3 text-right font-black text-zinc-900">৳{sup.amount.toLocaleString()}</td>
                        <td className="p-3 w-1/3">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                              <div className="bg-brand-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-bold text-zinc-500 text-[10px] w-8">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
