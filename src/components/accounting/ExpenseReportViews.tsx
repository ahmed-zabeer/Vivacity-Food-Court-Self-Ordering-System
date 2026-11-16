import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Wallet,
  Calendar,
  X
} from 'lucide-react';

interface Props {
  reportId: string;
  dateFrom: string;
  dateTo: string;
  onRefreshParent?: () => void;
}

export const ExpenseReportViews: React.FC<Props> = ({ reportId, dateFrom, dateTo, onRefreshParent }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');

  // Payment Modal for Due Expenses
  const [payModalExpense, setPayModalExpense] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const userContext = { name: currentUser.name, role: currentUser.role };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { dateFrom, dateTo, category: category !== 'ALL' ? category : undefined, search };
      if (reportId === 'exp-by-category') {
        const res = await api.getExpenseByCategory(params, userContext);
        setData(res);
      } else if (reportId === 'exp-by-supplier') {
        const res = await api.getExpenseBySupplier(params, userContext);
        setData(res);
      } else if (reportId === 'due-expenses') {
        const res = await api.getDueExpenses(userContext);
        setData(res);
      } else if (reportId === 'exp-list') {
        const res = await api.getExpenseList(params, userContext);
        setData(res);
      } else if (reportId === 'exp-summary') {
        const res = await api.getExpenseSummary(params, userContext);
        setData(res);
      }
    } catch (e) {
      console.error('Error loading expense report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportId, dateFrom, dateTo, category, search]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalExpense) return;
    const num = Number(payAmount);
    if (!payAmount || isNaN(num) || num <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }
    setPaySubmitting(true);
    try {
      await api.recordExpensePayment(payModalExpense.id, {
        amount: num,
        paymentMethod: payMethod,
        notes: payNotes
      }, userContext);
      setPayModalExpense(null);
      setPayAmount('');
      setPayNotes('');
      fetchData();
      if (onRefreshParent) onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense payment');
    } finally {
      setPaySubmitting(false);
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
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="font-bold text-zinc-500 text-xs">Querying actual expense transactions...</p>
      </div>
    );
  }

  // ========================================================
  // A. EXPENSE BY CATEGORY
  // ========================================================
  if (reportId === 'exp-by-category') {
    const list = data || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Expenses by Operational Category</h2>
            <p className="text-[11px] text-zinc-500">Distribution of operating outlays across utility, labor, rent &amp; maintenance</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCSV('Vivacity-Expense-By-Category', ['Category', 'Expense Count', 'Total Amount', 'Paid Amount', 'Due Amount', '% Share'],
                list.map((c: any) => [c.category, c.expenseCount, c.totalExpense, c.paidAmount, c.dueAmount, `${c.percentage}%`])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Expenses by Operational Category', ['Expense Category', 'Bills Count', 'Total Expense', 'Paid Amount', 'Due Amount', '% Share'],
                list.map((c: any) => [c.category, c.expenseCount, `৳${Number(c.totalExpense || 0).toLocaleString()}`, `৳${Number(c.paidAmount || 0).toLocaleString()}`, `৳${Number(c.dueAmount || 0).toLocaleString()}`, `${c.percentage}%`]),
                [{ label: 'Total Operating Expense', value: `৳${list.reduce((sum: number, c: any) => sum + (c.totalExpense || 0), 0).toLocaleString()}` }]
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
                <th className="p-3">Expense Category</th>
                <th className="p-3 text-right">Bills Count</th>
                <th className="p-3 text-right">Total Expense</th>
                <th className="p-3 text-right">Paid Amount</th>
                <th className="p-3 text-right">Due Amount</th>
                <th className="p-3 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-400">No expenses recorded for this period.</td></tr>
              ) : (
                list.map((c: any) => (
                  <tr key={c.category} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">{c.category}</td>
                    <td className="p-3 text-right font-bold">{c.expenseCount}</td>
                    <td className="p-3 text-right font-black text-zinc-900">৳{c.totalExpense.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">৳{c.paidAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-rose-600">৳{c.dueAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-zinc-600">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200">
                        {c.percentage}%
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
  // C. DUE EXPENSES (Actionable Settlement Workflow)
  // ========================================================
  if (reportId === 'due-expenses') {
    const dues = data?.dueExpenses || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Due &amp; Partially Paid Expenses</h2>
            <p className="text-[11px] text-zinc-500">Unsettled operating obligations, overdue alerts &amp; partial settlement history</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Outstanding: </span>
            <span className="text-sm font-black text-rose-600">৳{(data?.totalDueOverall || 0).toLocaleString()}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Bill / Title</th>
                <th className="p-3">Payee / Supplier</th>
                <th className="p-3">Category</th>
                <th className="p-3">Due Date</th>
                <th className="p-3 text-right">Total Bill</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Remaining Due</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {dues.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-zinc-400">All expenses are fully settled. No outstanding dues!</td></tr>
              ) : (
                dues.map((d: any) => (
                  <tr key={d.id} className="hover:bg-zinc-50/70">
                    <td className="p-3">
                      <div className="font-black text-zinc-900">{d.title}</div>
                      <span className="text-[10px] font-mono text-zinc-400">{d.billNumber}</span>
                    </td>
                    <td className="p-3 font-bold text-zinc-800">{d.supplier}</td>
                    <td className="p-3 text-zinc-600">{d.category}</td>
                    <td className="p-3">
                      <div>{d.dueDate}</div>
                      {d.urgency === 'OVERDUE' && (
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">
                          OVERDUE
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-800">৳{d.totalAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">৳{d.paidAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-rose-600">৳{d.remainingDue.toLocaleString()}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setPayModalExpense(d);
                          setPayAmount(String(d.remainingDue));
                        }}
                        className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-[11px] font-bold shadow-xs cursor-pointer"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Record Payment Modal */}
        {payModalExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="font-black text-sm text-zinc-900 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-600" />
                  <span>Record Expense Payment</span>
                </h3>
                <button onClick={() => setPayModalExpense(null)} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-zinc-50 p-3 rounded-2xl space-y-1 text-xs">
                <div className="font-bold text-zinc-900">{payModalExpense.title}</div>
                <div className="text-zinc-500">Payee: {payModalExpense.supplier}</div>
                <div className="text-rose-600 font-black">Remaining Due: ৳{payModalExpense.remainingDue}</div>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Payment Amount (৳)
                  </label>
                  <input
                    type="number"
                    max={payModalExpense.remainingDue}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Payment Method
                  </label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl font-bold"
                  >
                    <option value="CASH">CASH (Physical Drawer)</option>
                    <option value="BANK">Bank Transfer / Online</option>
                    <option value="bKash">bKash Merchant</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                    Reference / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via cash receipt voucher"
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    className="w-full p-2 border border-zinc-200 rounded-xl"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayModalExpense(null)}
                    className="px-4 py-2 border border-zinc-200 text-zinc-600 font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paySubmitting}
                    className="px-5 py-2 bg-brand-500 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {paySubmitting ? 'Recording...' : 'Confirm Settlement'}
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
  // B. EXPENSE BY SUPPLIER / PAYEE
  // ========================================================
  if (reportId === 'exp-by-supplier') {
    const list: any[] = Array.isArray(data) ? data : (data ? [data] : []);
    const grandTotal = list.reduce((s, x) => s + (x.totalAmount || 0), 0);
    const grandPaid = list.reduce((s, x) => s + (x.paidAmount || 0), 0);
    const grandDue = list.reduce((s, x) => s + (x.dueAmount || 0), 0);

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Expense By Supplier & Payee</h2>
            <p className="text-[11px] text-zinc-500">
              Track payee commitments, utility suppliers, vendor expense payments and pending dues
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCSV(
                'Vivacity-Expense-By-Supplier',
                ['Supplier / Payee', 'Expenses Count', 'Total Expenses (BDT)', 'Paid Amount', 'Due Amount', 'Last Payment Date'],
                list.map(s => [s.supplierName, s.expenseCount, s.totalAmount, s.paidAmount, s.dueAmount, s.lastPaymentDate || '—'])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport(
                'Expense By Supplier & Payee',
                ['Supplier / Payee', 'Bills Count', 'Total Expenses', 'Paid Amount', 'Outstanding Due', 'Last Payment'],
                list.map(s => [s.supplierName, s.expenseCount, `৳${Number(s.totalAmount || 0).toLocaleString()}`, `৳${Number(s.paidAmount || 0).toLocaleString()}`, s.dueAmount > 0 ? `৳${Number(s.dueAmount).toLocaleString()}` : '—', s.lastPaymentDate || '—']),
                [
                  { label: 'Total Billed', value: `৳${grandTotal.toLocaleString()}` },
                  { label: 'Total Settled', value: `৳${grandPaid.toLocaleString()}` },
                  { label: 'Outstanding Due', value: `৳${grandDue.toLocaleString()}` }
                ]
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-zinc-500">Total Billed Expenses</span>
            <div className="text-xl font-black text-zinc-900 mt-0.5">৳{grandTotal.toLocaleString()}</div>
            <span className="text-[10px] text-zinc-400">{list.length} distinct payees</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-emerald-700">Settled to Payees</span>
            <div className="text-xl font-black text-emerald-900 mt-0.5">৳{grandPaid.toLocaleString()}</div>
            <span className="text-[10px] text-emerald-600">Disbursed successfully</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs">
            <span className="text-[10px] font-black uppercase text-rose-700">Pending Payee Dues</span>
            <div className="text-xl font-black text-rose-900 mt-0.5">৳{grandDue.toLocaleString()}</div>
            <span className="text-[10px] text-rose-600">{grandDue > 0 ? 'Requires settlement' : 'All clear'}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Supplier / Payee</th>
                <th className="p-3 text-right">Bills Count</th>
                <th className="p-3 text-right">Total Expense</th>
                <th className="p-3 text-right">Paid Amount</th>
                <th className="p-3 text-right">Outstanding Due</th>
                <th className="p-3">Last Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400">
                    No supplier/payee expenses recorded for this period.
                  </td>
                </tr>
              ) : (
                list.map((s, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">{s.supplierName}</td>
                    <td className="p-3 text-right font-bold text-zinc-700">{s.expenseCount}</td>
                    <td className="p-3 text-right font-black text-zinc-900">৳{s.totalAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">৳{s.paidAmount.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-rose-600">
                      {s.dueAmount > 0 ? `৳${s.dueAmount.toLocaleString()}` : '—'}
                    </td>
                    <td className="p-3 text-zinc-500 font-semibold">{s.lastPaymentDate || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
            {list.length > 0 && (
              <tfoot className="bg-zinc-100 font-black text-zinc-900 text-xs border-t-2 border-zinc-300">
                <tr>
                  <td className="p-3">TOTAL</td>
                  <td className="p-3 text-right">{list.reduce((s, x) => s + (x.expenseCount || 0), 0)}</td>
                  <td className="p-3 text-right">৳{grandTotal.toLocaleString()}</td>
                  <td className="p-3 text-right text-emerald-700">৳{grandPaid.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-600">৳{grandDue.toLocaleString()}</td>
                  <td className="p-3">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // D. EXPENSE LIST REGISTER
  // ========================================================
  if (reportId === 'exp-list') {
    const list: any[] = data?.expenses || [];
    const grandTotal = data?.grandTotalAmount ?? list.reduce((s, x) => s + (x.totalAmount || x.amount || 0), 0);
    const grandPaid = data?.grandTotalPaid ?? list.reduce((s, x) => s + (x.paidAmount || x.amount || 0), 0);
    const grandDue = data?.grandTotalDue ?? list.reduce((s, x) => s + (x.dueAmount || 0), 0);

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Expense List Register</h2>
            <p className="text-[11px] text-zinc-500">
              Chronological log of all operating outlays, payment channels, and audit authors ({list.length} entries)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search description, bill #..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs"
              />
            </div>
            <button
              onClick={() => exportCSV(
                'Vivacity-Expense-List',
                ['Bill No', 'Date', 'Category', 'Payee / Supplier', 'Description', 'Total (BDT)', 'Paid', 'Due', 'Payment Method', 'Status', 'Created By'],
                list.map(e => [e.billNumber || e.id, e.date, e.category, e.supplier || 'Direct', e.description || e.notes || '—', e.totalAmount || e.amount, e.paidAmount || e.amount, e.dueAmount || 0, e.paymentMethod || 'CASH', e.paymentStatus || 'PAID', e.createdBy])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Gross Outlay</span>
            <div className="text-lg font-black text-zinc-900 mt-0.5">৳{grandTotal.toLocaleString()}</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">Paid Out</span>
            <div className="text-lg font-black text-emerald-900 mt-0.5">৳{grandPaid.toLocaleString()}</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-bold text-rose-700 uppercase">Outstanding Due</span>
            <div className="text-lg font-black text-rose-900 mt-0.5">৳{grandDue.toLocaleString()}</div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Bill / Ref</th>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Payee / Supplier</th>
                <th className="p-3">Notes / Purpose</th>
                <th className="p-3 text-right">Amount (৳)</th>
                <th className="p-3">Method</th>
                <th className="p-3">Status</th>
                <th className="p-3">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    No operating expenses recorded for this filter range.
                  </td>
                </tr>
              ) : (
                list.map((e, idx) => (
                  <tr key={e.id || idx} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono font-bold text-zinc-800">{e.billNumber || e.id.slice(0, 12)}</td>
                    <td className="p-3 font-semibold text-zinc-600">{e.date}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 text-[10px] font-black uppercase">
                        {e.category}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-zinc-900">{e.supplier || e.payee || 'Direct'}</td>
                    <td className="p-3 text-zinc-600 max-w-xs truncate">{e.description || e.notes || '—'}</td>
                    <td className="p-3 text-right font-black text-zinc-900">৳{(e.totalAmount || e.amount || 0).toLocaleString()}</td>
                    <td className="p-3 font-semibold text-zinc-700">{e.paymentMethod || 'CASH'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        (e.paymentStatus || 'PAID') === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : (e.paymentStatus === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800')
                      }`}>
                        {e.paymentStatus || 'PAID'}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-500 text-[11px]">{e.createdBy || 'Admin'}</td>
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
  // E. EXPENSE SUMMARY & ANALYTICS
  // ========================================================
  if (reportId === 'exp-summary') {
    const totalExp = data?.totalExpenses || 0;
    const totalPaid = data?.totalPaid || 0;
    const totalDue = data?.totalDue || 0;
    const count = data?.expenseCount || 0;
    const avg = data?.averageExpense || 0;
    const dailyTrend: any[] = data?.dailyTrend || [];

    return (
      <div className="space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Total Expenses</span>
            <div className="text-xl font-black text-zinc-900">৳{totalExp.toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500">{count} voucher entries</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Paid Out</span>
            <div className="text-xl font-black text-emerald-600">৳{totalPaid.toLocaleString()}</div>
            <p className="text-[10px] text-emerald-600">Settled commitments</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Pending Payables</span>
            <div className="text-xl font-black text-rose-600">৳{totalDue.toLocaleString()}</div>
            <p className="text-[10px] text-rose-500">{totalDue > 0 ? 'Due for settlement' : 'Zero dues'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Avg Cost / Voucher</span>
            <div className="text-xl font-black text-blue-600">৳{avg.toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500">Per recorded voucher</p>
          </div>
        </div>

        {/* Daily Trend Table */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900">Daily Operating Burn Trend</h2>
              <p className="text-[11px] text-zinc-500">Day-by-day expense timeline for Asia/Dhaka business calendar</p>
            </div>
            <button
              onClick={() => exportCSV(
                'Vivacity-Expense-Daily-Trend',
                ['Date', 'Expense Amount (BDT)'],
                dailyTrend.map(d => [d.date, d.amount])
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
                  <th className="p-3">Expense Date</th>
                  <th className="p-3 text-right">Daily Spend</th>
                  <th className="p-3">Visual Distribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dailyTrend.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-zinc-400">No daily expense trend data in this period.</td>
                  </tr>
                ) : (
                  dailyTrend.map(d => {
                    const maxVal = Math.max(...dailyTrend.map(x => x.amount), 1);
                    const pct = Math.min(100, Math.round((d.amount / maxVal) * 100));
                    return (
                      <tr key={d.date} className="hover:bg-zinc-50/70">
                        <td className="p-3 font-semibold text-zinc-800">{d.date}</td>
                        <td className="p-3 text-right font-black text-zinc-900">৳{d.amount.toLocaleString()}</td>
                        <td className="p-3 w-1/2">
                          <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
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
