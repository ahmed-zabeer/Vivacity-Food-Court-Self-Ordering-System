import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DailyClosingReportData } from '../../types';
import { X, Calendar, DollarSign, Wallet, CheckCircle, AlertTriangle, Printer, Lock, RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyClosingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  });

  const [report, setReport] = useState<DailyClosingReportData | null>(null);
  const [loading, setLoading] = useState(false);

  // Cash count form state
  const [countedCashInput, setCountedCashInput] = useState('');
  const [depositsInput, setDepositsInput] = useState('0');
  const [withdrawalsInput, setWithdrawalsInput] = useState('0');
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchDailyClosing = async (date: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await api.getDailyClosing(date, { name: currentUser.name, role: currentUser.role });
      setReport(data);
      if (data?.cashManagement?.countedCash !== null && data?.cashManagement?.countedCash !== undefined) {
        setCountedCashInput(String(data.cashManagement.countedCash));
      } else {
        setCountedCashInput('');
      }
      setDepositsInput(String(data?.cashManagement?.cashDeposits || 0));
      setWithdrawalsInput(String(data?.cashManagement?.cashWithdrawals || 0));
      setNotesInput(data?.cashManagement?.notes || '');
    } catch (e: any) {
      console.error('Error fetching daily closing report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDailyClosing(reportDate);
    }
  }, [isOpen, reportDate]);

  if (!isOpen) return null;

  const handleSaveReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCashInput || isNaN(Number(countedCashInput))) {
      alert('Please enter a valid numeric physical cash count.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await api.recordCashReconciliation({
        date: reportDate,
        openingCash: report?.cashManagement?.openingCash || 5000,
        countedCash: Number(countedCashInput),
        cashDeposits: Number(depositsInput) || 0,
        cashWithdrawals: Number(withdrawalsInput) || 0,
        adjustments: 0,
        notes: notesInput,
        closedBy: currentUser.name
      }, { name: currentUser.name, role: currentUser.role });
      setReport(updated);
      setFeedback('Daily cash drawer reconciliation recorded successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to record cash reconciliation');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-zinc-900 text-white flex items-center justify-between gap-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-400">Vivacity Food Court</span>
                <span className="text-[10px] text-zinc-400">• Business Date (Asia/Dhaka)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">Daily Restaurant Financial Closing Report</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handlePrint}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl cursor-pointer"
              title="Print Daily Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-zinc-900 text-xs">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
              <p className="font-bold text-zinc-500">Compiling daily transactions and closing figures...</p>
            </div>
          ) : !report ? (
            <div className="py-20 text-center text-zinc-500">No records available for selected date.</div>
          ) : (
            <>
              {/* Status Header */}
              <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                <div className="flex items-center gap-2">
                  {report.isClosed ? (
                    <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold bg-emerald-100 px-3 py-1 rounded-xl">
                      <Lock className="w-3.5 h-3.5" /> Day Closed &amp; Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-amber-700 font-extrabold bg-amber-100 px-3 py-1 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5" /> Day Register Open
                    </span>
                  )}
                  {report.closedBy && (
                    <span className="text-[11px] text-zinc-500">by {report.closedBy}</span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Net Day Profit: </span>
                  <span className={`text-sm font-black ${report.profitability.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ৳{report.profitability.netProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 5 Core Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. SALES */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="font-black text-zinc-800 uppercase text-[11px]">1. Order Sales</span>
                    <span className="text-brand-600 font-bold">{report.sales.totalOrders} orders</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Gross Sales:</span>
                      <span className="font-bold">৳{report.sales.grossSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Discounts:</span>
                      <span className="font-bold">-৳{report.sales.discounts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600">
                      <span>Refunds:</span>
                      <span className="font-bold">-৳{report.sales.refunds.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-100 font-extrabold text-zinc-900">
                      <span>Net Sales:</span>
                      <span className="text-emerald-600">৳{report.sales.netSales.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 2. EXPENSES */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="font-black text-zinc-800 uppercase text-[11px]">2. Expenses</span>
                    <span className="text-amber-600 font-bold">Operating</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Cash Expenses:</span>
                      <span className="font-bold">৳{report.expenses.cashExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Bank / MFS:</span>
                      <span className="font-bold">৳{report.expenses.bankMobileExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-amber-600">
                      <span>Due Expenses:</span>
                      <span className="font-bold">৳{report.expenses.dueExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-100 font-extrabold text-zinc-900">
                      <span>Total Costs:</span>
                      <span className="text-amber-600">৳{report.expenses.totalExpenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 3. PURCHASES */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="font-black text-zinc-800 uppercase text-[11px]">3. Purchases</span>
                    <span className="text-blue-600 font-bold">Inventory</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Invoices:</span>
                      <span className="font-bold">৳{report.purchases.totalPurchases.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Goods Received:</span>
                      <span className="font-bold">৳{report.purchases.goodsReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Supplier Paid:</span>
                      <span className="font-bold">৳{report.purchases.supplierPayments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-100 font-extrabold text-rose-600">
                      <span>Supplier Due:</span>
                      <span>৳{report.purchases.supplierOutstanding.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 4. PROFITABILITY */}
                <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="font-black text-zinc-800 uppercase text-[11px]">4. Profitability</span>
                    <span className="text-emerald-600 font-bold">{report.profitability.profitMargin}% Margin</span>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Net Sales:</span>
                      <span className="font-bold">৳{report.profitability.netSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Food COGS:</span>
                      <span className="font-bold">-৳{report.profitability.cogs.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Operating Exp:</span>
                      <span className="font-bold">-৳{report.profitability.operatingExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-zinc-100 font-black">
                      <span>Net Profit:</span>
                      <span className={report.profitability.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        ৳{report.profitability.netProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PART 11: CASH MANAGEMENT & DRAWER RECONCILIATION */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-brand-600" />
                      <span>Physical Cash Drawer Count &amp; Reconciliation</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Physical currency in register. Non-cash payments (bKash/Nagad/Card) are tracked separately.
                    </p>
                  </div>
                </div>

                {/* Formula breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200">
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">Opening Cash Float</span>
                    <strong className="text-zinc-900 font-black">৳{report.cashManagement.openingCash}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-emerald-700">
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">+ Cash Sales</span>
                    <strong className="font-black">+৳{report.cashManagement.cashSalesReceived}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-rose-600">
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">- Cash Refunds</span>
                    <strong className="font-black">-৳{report.cashManagement.cashRefunds}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-rose-600">
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">- Cash Expenses</span>
                    <strong className="font-black">-৳{report.cashManagement.cashExpenses}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-zinc-200 text-rose-600">
                    <span className="text-zinc-400 block text-[9px] uppercase font-bold">- Cash Purchases</span>
                    <strong className="font-black">-৳{report.cashManagement.cashPurchasesPaid}</strong>
                  </div>
                  <div className="bg-brand-50 p-2.5 rounded-xl border border-brand-200 text-brand-900">
                    <span className="text-brand-600 block text-[9px] uppercase font-bold">= Expected Cash</span>
                    <strong className="font-black">৳{report.cashManagement.expectedClosingCash.toLocaleString()}</strong>
                  </div>
                </div>

                {/* Counted vs Expected Comparison */}
                {report.cashManagement.countedCash !== null && (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    report.cashManagement.cashDiscrepancy === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <div className="flex items-center gap-3">
                      {report.cashManagement.cashDiscrepancy === 0 ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <div>
                        <strong className="font-black">
                          {report.cashManagement.cashDiscrepancy === 0 ? 'Drawer Exactly Reconciled' : 'Cash Discrepancy Detected'}
                        </strong>
                        <p className="text-[11px]">
                          Counted: ৳{report.cashManagement.countedCash.toLocaleString()} vs Expected: ৳{report.cashManagement.expectedClosingCash.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold">Difference:</span>
                      <div className="text-base font-black">
                        {report.cashManagement.cashDiscrepancy! > 0 ? `+৳${report.cashManagement.cashDiscrepancy} (Surplus)` : report.cashManagement.cashDiscrepancy! < 0 ? `-৳${Math.abs(report.cashManagement.cashDiscrepancy!)} (Shortage)` : '৳0 (Balanced)'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Physical Cash Count Form */}
                <form onSubmit={handleSaveReconciliation} className="bg-white p-4 rounded-2xl border border-zinc-200 space-y-3">
                  <h4 className="font-bold text-zinc-800 text-xs uppercase tracking-wider">Record End-of-Day Physical Cash Count</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                        Physical Cash Counted (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 5240"
                        value={countedCashInput}
                        onChange={e => setCountedCashInput(e.target.value)}
                        className="w-full p-2 border border-zinc-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                        Bank Cash Deposits (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={depositsInput}
                        onChange={e => setDepositsInput(e.target.value)}
                        className="w-full p-2 border border-zinc-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                        Cash Withdrawals / Owner Draws (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={withdrawalsInput}
                        onChange={e => setWithdrawalsInput(e.target.value)}
                        className="w-full p-2 border border-zinc-200 rounded-xl text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                      Closing Notes &amp; Variance Explanations
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cash drawer counted by Evening Shift Lead. No discrepancies."
                      value={notesInput}
                      onChange={e => setNotesInput(e.target.value)}
                      className="w-full p-2 border border-zinc-200 rounded-xl text-xs font-medium"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {feedback ? (
                      <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {feedback}
                      </span>
                    ) : <span />}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Recording...' : 'Lock & Reconcile Cash Closing'}
                    </button>
                  </div>
                </form>

                {/* Non-Cash Collections Overview */}
                <div className="pt-2 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                  <span className="font-bold text-zinc-500">Non-Cash Merchant Settlement (Direct to Bank/MFS):</span>
                  <div className="flex items-center gap-3">
                    <span>bKash: <strong>৳{report.nonCashCollections.bKash}</strong></span>
                    <span>Nagad: <strong>৳{report.nonCashCollections.Nagad}</strong></span>
                    <span>Card / POS: <strong>৳{report.nonCashCollections.onlineCard}</strong></span>
                    <span>NFC: <strong>৳{report.nonCashCollections.nfcContactless}</strong></span>
                    <span className="text-brand-600 font-black bg-brand-50 px-2 py-0.5 rounded-lg border border-brand-200">
                      Total Non-Cash: ৳{report.nonCashCollections.totalNonCash}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
