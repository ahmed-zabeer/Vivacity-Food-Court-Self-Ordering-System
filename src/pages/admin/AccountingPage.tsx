import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'wouter';
import {
  Expense,
  DailyFinancialSummary,
  LedgerEntry,
  IncomeStatement,
  TrialBalance,
  BalanceSheet,
  DueReceivable,
  Purchase
} from '../../types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BookOpen,
  FileText,
  BarChart3,
  Scale,
  Receipt,
  ShoppingCart,
  Plus,
  Edit2,
  Trash2,
  History,
  Search,
  X,
  Check,
  AlertCircle,
  Clock,
  ArrowLeft,
  Calendar,
  RefreshCw,
  PieChart,
  ShieldAlert,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  HelpCircle
} from 'lucide-react';

type TabKey =
  | 'overview'
  | 'ledger'
  | 'dues'
  | 'due-purchases'
  | 'trial-balance'
  | 'balance-sheet'
  | 'income-statement'
  | 'expenses';

type DatePreset = 'today' | '7d' | '30d' | '60d' | '90d' | 'year' | 'custom';

export const AccountingPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const isAuthorized = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'].includes(
    currentUser.role
  );

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Date filters
  const getTodayDhaka = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const getDhakaOffset = (daysAgo: number) => {
    try {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(d);
    } catch {
      const d = new Date(Date.now() - daysAgo * 86400000);
      return d.toISOString().slice(0, 10);
    }
  };

  const [datePreset, setDatePreset] = useState<DatePreset>('7d');
  const [dateFrom, setDateFrom] = useState<string>(() => getDhakaOffset(6));
  const [dateTo, setDateTo] = useState<string>(getTodayDhaka);

  const applyPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = getTodayDhaka();
    if (preset === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === '7d') {
      setDateFrom(getDhakaOffset(6));
      setDateTo(today);
    } else if (preset === '30d') {
      setDateFrom(getDhakaOffset(29));
      setDateTo(today);
    } else if (preset === '60d') {
      setDateFrom(getDhakaOffset(59));
      setDateTo(today);
    } else if (preset === '90d') {
      setDateFrom(getDhakaOffset(89));
      setDateTo(today);
    } else if (preset === 'year') {
      const yearStart = `${today.slice(0, 4)}-01-01`;
      setDateFrom(yearStart);
      setDateTo(today);
    }
  };

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [financialGraph, setFinancialGraph] = useState<DailyFinancialSummary[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>('');
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [dueReceivables, setDueReceivables] = useState<DueReceivable[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Expense modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(getTodayDhaka);
  const [expCategory, setExpCategory] = useState<Expense['category']>('Food Cost');
  const [expNotes, setExpNotes] = useState('');
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [historyModalExpense, setHistoryModalExpense] = useState<Expense | null>(null);

  // Purchase modal
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [purSupplier, setPurSupplier] = useState('');
  const [purDescription, setPurDescription] = useState('');
  const [purCategory, setPurCategory] = useState('Raw Ingredients & Meat');
  const [purAmount, setPurAmount] = useState('');
  const [purDate, setPurDate] = useState(getTodayDhaka);
  const [purStatus, setPurStatus] = useState<'PAID' | 'UNPAID'>('UNPAID');
  const [purSubmitting, setPurSubmitting] = useState(false);
  const [purError, setPurError] = useState<string | null>(null);

  const userContext = useMemo(
    () => ({ name: currentUser.name, role: currentUser.role }),
    [currentUser.name, currentUser.role]
  );

  const fetchAllData = useCallback(async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const graphParams = { dateFrom, dateTo };
      const [
        graphRes,
        ledgerRes,
        incRes,
        tbRes,
        bsRes,
        duesRes,
        purRes,
        expRes
      ] = await Promise.all([
        api.getFinancialGraph(graphParams).catch(() => []),
        api.getAccountingLedger({ dateFrom, dateTo }, userContext).catch(() => []),
        api.getIncomeStatement({ dateFrom, dateTo }, userContext).catch(() => null),
        api.getTrialBalance({ dateFrom, dateTo }, userContext).catch(() => null),
        api.getBalanceSheet(userContext).catch(() => null),
        api.getDueReceivables(userContext).catch(() => []),
        api.getPurchases({ dateFrom, dateTo }, userContext).catch(() => []),
        api.getExpenses({ dateFrom, dateTo }).catch(() => [])
      ]);

      setFinancialGraph(graphRes);
      setLedgerEntries(ledgerRes);
      setIncomeStatement(incRes);
      setTrialBalance(tbRes);
      setBalanceSheet(bsRes);
      setDueReceivables(duesRes);
      setPurchases(purRes);
      setExpenses(expRes);
    } catch (e) {
      console.error('Error fetching accounting data:', e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isAuthorized, userContext]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time listener for financial updates
  useEffect(() => {
    const unsub = realtime.on('financial_updated', () => {
      fetchAllData();
    });
    const unsubRev = realtime.on('revenue_updated', () => {
      fetchAllData();
    });
    return () => {
      unsub();
      unsubRev();
    };
  }, [fetchAllData]);

  // Aggregated overview figures
  const overviewTotals = useMemo(() => {
    let rev = 0;
    let exp = 0;
    for (const item of financialGraph) {
      rev += item.revenue || 0;
      exp += item.expenses || 0;
    }
    const pur = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const net = rev - exp - pur;
    return {
      revenue: rev,
      expenses: exp,
      purchases: pur,
      netProfit: net
    };
  }, [financialGraph, purchases]);

  // Expense Handlers
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpAmount('');
    setExpDate(getTodayDhaka());
    setExpCategory('Food Cost');
    setExpNotes('');
    setExpError(null);
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setExpAmount(expense.amount.toString());
    setExpDate(expense.date);
    setExpCategory(expense.category);
    setExpNotes(expense.notes || '');
    setExpError(null);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError(null);
    const numAmount = Number(expAmount);
    if (!expAmount || isNaN(numAmount) || numAmount <= 0) {
      setExpError('Please enter a valid positive expense amount.');
      return;
    }
    setExpSubmitting(true);
    try {
      if (editingExpense) {
        await api.updateExpense(
          editingExpense.id,
          { amount: numAmount, date: expDate, category: expCategory, notes: expNotes },
          userContext
        );
      } else {
        await api.addExpense(
          { amount: numAmount, date: expDate, category: expCategory, notes: expNotes },
          userContext
        );
      }
      setExpenseModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setExpError(err.message || 'Failed to save expense');
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!window.confirm(`Delete expense of ৳${expense.amount} (${expense.category})?`)) return;
    try {
      await api.deleteExpense(expense.id, userContext);
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  // Purchase Handlers
  const handleOpenAddPurchase = () => {
    setEditingPurchase(null);
    setPurSupplier('');
    setPurDescription('');
    setPurCategory('Raw Ingredients & Meat');
    setPurAmount('');
    setPurDate(getTodayDhaka());
    setPurStatus('UNPAID');
    setPurError(null);
    setPurchaseModalOpen(true);
  };

  const handleOpenEditPurchase = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setPurSupplier(purchase.supplier);
    setPurDescription(purchase.description);
    setPurCategory(purchase.category);
    setPurAmount(purchase.amount.toString());
    setPurDate(purchase.date);
    setPurStatus(purchase.status);
    setPurError(null);
    setPurchaseModalOpen(true);
  };

  const handleSavePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurError(null);
    const num = Number(purAmount);
    if (!purSupplier.trim()) {
      setPurError('Please enter supplier name.');
      return;
    }
    if (!purAmount || isNaN(num) || num <= 0) {
      setPurError('Please enter a valid positive purchase amount.');
      return;
    }
    setPurSubmitting(true);
    try {
      if (editingPurchase) {
        await api.updatePurchase(
          editingPurchase.id,
          {
            supplier: purSupplier.trim(),
            description: purDescription.trim(),
            category: purCategory,
            amount: num,
            date: purDate,
            status: purStatus
          },
          userContext
        );
      } else {
        await api.addPurchase(
          {
            supplier: purSupplier.trim(),
            description: purDescription.trim(),
            category: purCategory,
            amount: num,
            date: purDate,
            status: purStatus
          },
          userContext
        );
      }
      setPurchaseModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setPurError(err.message || 'Failed to save purchase');
    } finally {
      setPurSubmitting(false);
    }
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (!window.confirm(`Delete purchase from "${purchase.supplier}" (৳${purchase.amount})?`))
      return;
    try {
      await api.deletePurchase(purchase.id, userContext);
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete purchase');
    }
  };

  const handleTogglePurchaseStatus = async (purchase: Purchase) => {
    const nextStatus = purchase.status === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      await api.updatePurchase(purchase.id, { status: nextStatus }, userContext);
      await fetchAllData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
        <h2 className="text-xl font-black text-zinc-900">Restricted Access</h2>
        <p className="text-xs text-zinc-600">
          Accounting & Finance reports are only accessible by Chief Administrators, Food Court
          Owners, and General Managers.
        </p>
        <button
          onClick={() => setLocation('/admin')}
          className="px-6 py-2.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-brand-600"
        >
          Back to Admin Dashboard
        </button>
      </div>
    );
  }

  // Filtered ledger
  const filteredLedger = ledgerEntries.filter(e => {
    if (ledgerTypeFilter && e.type !== ledgerTypeFilter) return false;
    if (ledgerSearch) {
      const q = ledgerSearch.toLowerCase();
      return (
        e.description.toLowerCase().includes(q) ||
        e.refNo.toLowerCase().includes(q) ||
        e.date.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/admin')}
            className="p-2.5 rounded-2xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                Vivacity Financial Suite
              </span>
              <span className="text-[10px] font-bold text-zinc-400">Asia/Dhaka UTC+6</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-brand-600" />
              <span>Accounting & Financial Statements</span>
            </h1>
          </div>
        </div>

        {/* Global Date Presets */}
        <div className="flex items-center flex-wrap gap-1.5 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200">
          <button
            onClick={() => applyPreset('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === 'today'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => applyPreset('7d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === '7d'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => applyPreset('30d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === '30d'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            1 Month
          </button>
          <button
            onClick={() => applyPreset('60d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === '60d'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            2 Months
          </button>
          <button
            onClick={() => applyPreset('90d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === '90d'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            3 Months
          </button>
          <button
            onClick={() => applyPreset('year')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === 'year'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Year
          </button>
          <button
            onClick={fetchAllData}
            title="Refresh Financial Data"
            className="p-1.5 rounded-xl text-zinc-500 hover:text-brand-600 hover:bg-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" />
          <span className="font-bold text-zinc-700">Reporting Range:</span>
          <span className="font-extrabold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-lg">
            {dateFrom} to {dateTo}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-semibold">Custom:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value);
              setDatePreset('custom');
            }}
            className="p-1.5 border border-zinc-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500"
          />
          <span className="text-zinc-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => {
              setDateTo(e.target.value);
              setDatePreset('custom');
            }}
            className="p-1.5 border border-zinc-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* 8 Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'overview', label: 'Overview', icon: BarChart3 },
          { key: 'ledger', label: 'General Ledger', icon: BookOpen },
          { key: 'dues', label: 'Due Receivables', icon: Wallet },
          { key: 'due-purchases', label: 'Due Purchases', icon: ShoppingCart },
          { key: 'trial-balance', label: 'Trial Balance', icon: Scale },
          { key: 'balance-sheet', label: 'Balance Sheet', icon: FileText },
          { key: 'income-statement', label: 'Income Statement', icon: PieChart },
          { key: 'expenses', label: 'Manage Expenses', icon: Receipt }
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                active
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/20'
                  : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/80 shadow-2xs'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-2xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Total Revenue
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 mt-0.5">
                ৳{overviewTotals.revenue.toLocaleString()}
              </h2>
              <p className="text-[10px] text-zinc-400 mt-1">Confirmed & Paid Orders</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-2xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <ArrowDownRight className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                Operating Expenses
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 mt-0.5">
                ৳{overviewTotals.expenses.toLocaleString()}
              </h2>
              <p className="text-[10px] text-zinc-400 mt-1">{expenses.length} expense entries</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-2xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                Purchases / COGS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-900 mt-0.5">
                ৳{overviewTotals.purchases.toLocaleString()}
              </h2>
              <p className="text-[10px] text-zinc-400 mt-1">{purchases.length} invoices</p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-blue-100 shadow-2xs relative overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                Net Profit
              </span>
              <h2
                className={`text-xl sm:text-2xl font-black mt-0.5 ${
                  overviewTotals.netProfit >= 0 ? 'text-blue-700' : 'text-rose-600'
                }`}
              >
                ৳{overviewTotals.netProfit.toLocaleString()}
              </h2>
              <p className="text-[10px] text-zinc-400 mt-1">Revenue − (Expenses + Purchases)</p>
            </div>
          </div>

          {/* Daily Bar Comparison Visualizer */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  Daily Comparative Financial Activity
                </h3>
                <p className="text-xs text-zinc-500">
                  Daily breakdown of actual sales revenue vs operating expenses
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500" />
                  <span className="text-zinc-700">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-400" />
                  <span className="text-zinc-700">Expenses</span>
                </div>
              </div>
            </div>

            {financialGraph.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-8">No data for selected period</p>
            ) : (
              <div className="space-y-3 pt-2">
                {financialGraph.map(day => {
                  const maxVal = Math.max(
                    ...financialGraph.map(d => Math.max(d.revenue || 0, d.expenses || 0)),
                    1000
                  );
                  const revWidth = Math.min(100, Math.round(((day.revenue || 0) / maxVal) * 100));
                  const expWidth = Math.min(100, Math.round(((day.expenses || 0) / maxVal) * 100));
                  return (
                    <div key={day.date} className="p-2.5 rounded-2xl bg-zinc-50/80 border border-zinc-100">
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-800 mb-1.5">
                        <span>{day.date}</span>
                        <div className="space-x-3 text-[11px]">
                          <span className="text-emerald-700 font-extrabold">
                            Rev: ৳{(day.revenue || 0).toLocaleString()} ({day.revenueOrders || 0} orders)
                          </span>
                          <span className="text-rose-700 font-extrabold">
                            Exp: ৳{(day.expenses || 0).toLocaleString()}
                          </span>
                          <span
                            className={`font-black ${
                              (day.profit || 0) >= 0 ? 'text-blue-700' : 'text-rose-600'
                            }`}
                          >
                            Profit: ৳{(day.profit || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${revWidth}%` }}
                          />
                        </div>
                        <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden flex">
                          <div
                            className="bg-rose-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${expWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Journal Transactions */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900">Recent Accounting Entries</h3>
                <p className="text-xs text-zinc-500">Latest revenue, expenses, and supplier purchases</p>
              </div>
              <button
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
              >
                View Full Ledger →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 text-zinc-500 font-black uppercase text-[10px] border-b border-zinc-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ref No</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Debit (৳)</th>
                    <th className="py-2.5 px-3 text-right">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ledgerEntries.slice(0, 8).map(entry => (
                    <tr key={entry.id} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 px-3 font-semibold text-zinc-600">{entry.date}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-800">{entry.refNo}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            entry.type === 'Revenue'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.type === 'Expense'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {entry.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-zinc-800">{entry.description}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                        {entry.debit > 0 ? `৳${entry.debit.toLocaleString()}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                        {entry.credit > 0 ? `৳${entry.credit.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                  {ledgerEntries.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-400">
                        No transactions found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GENERAL LEDGER */}
      {/* ======================================================== */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-900">General Ledger (Journal)</h3>
              <p className="text-xs text-zinc-500">
                Complete double-entry record of all revenue, expenses, and supplier purchases
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search ref or description..."
                  value={ledgerSearch}
                  onChange={e => setLedgerSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <select
                value={ledgerTypeFilter}
                onChange={e => setLedgerTypeFilter(e.target.value)}
                className="py-1.5 px-3 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
                <option value="Purchase">Purchase</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Ref No</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Debit (Out)</th>
                  <th className="py-3 px-3 text-right">Credit (In)</th>
                  <th className="py-3 px-3 text-right">Cumulative Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLedger.map(entry => (
                  <tr key={entry.id} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-semibold text-zinc-600">{entry.date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">{entry.refNo}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          entry.type === 'Revenue'
                            ? 'bg-emerald-100 text-emerald-800'
                            : entry.type === 'Expense'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-800">{entry.description}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {entry.debit > 0 ? `৳${entry.debit.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                      {entry.credit > 0 ? `৳${entry.credit.toLocaleString()}` : '—'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-black ${
                        entry.balance >= 0 ? 'text-zinc-900' : 'text-rose-600'
                      }`}
                    >
                      ৳{entry.balance.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredLedger.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No ledger records match the query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: DUE RECEIVABLES */}
      {/* ======================================================== */}
      {activeTab === 'dues' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-zinc-900">
                Customer Due Receivables Management
              </h3>
              <p className="text-xs text-zinc-500">
                Outstanding orders awaiting cashier settlement or table payment
              </p>
            </div>
            <span className="text-xs font-black bg-amber-50 text-amber-800 px-3 py-1 rounded-xl border border-amber-200">
              Total Outstanding: ৳
              {dueReceivables.reduce((s, d) => s + (d.grandTotal || 0), 0).toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3">Order Token</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Payment Method</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3">Payment Status</th>
                  <th className="py-3 px-3 text-right">Amount Due (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dueReceivables.map(d => (
                  <tr key={d.orderId} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-mono font-black text-zinc-900">#{d.token}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-zinc-800">{d.customerName}</div>
                      {d.customerPhone && (
                        <div className="text-[10px] text-zinc-400">{d.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-600">
                      {d.tableId ? `Table ${d.tableId}` : 'Takeaway / Parcel'}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-700">{d.paymentMethod}</td>
                    <td className="py-2.5 px-3 text-zinc-500">
                      {new Date(d.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 animate-pulse">
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600 text-sm">
                      ৳{d.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {dueReceivables.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      ✓ No outstanding customer receivables. All orders are settled!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DUE PURCHASES (SUPPLIER ACCOUNTS PAYABLE) */}
      {/* ======================================================== */}
      {activeTab === 'due-purchases' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-900">
                Supplier Purchases & Accounts Payable
              </h3>
              <p className="text-xs text-zinc-500">
                Track ingredient supplier invoices, pending liabilities, and payments
              </p>
            </div>
            <button
              onClick={handleOpenAddPurchase}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Record Purchase Invoice</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Supplier Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Amount (৳)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-semibold text-zinc-600">{p.date}</td>
                    <td className="py-2.5 px-3 font-black text-zinc-900">{p.supplier}</td>
                    <td className="py-2.5 px-3 font-medium text-zinc-600">{p.category}</td>
                    <td className="py-2.5 px-3 text-zinc-700">{p.description || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-black text-zinc-900">
                      ৳{p.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleTogglePurchaseStatus(p)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer transition-all ${
                          p.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="Click to toggle payment status"
                      >
                        {p.status}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEditPurchase(p)}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePurchase(p)}
                        className="p-1 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 cursor-pointer"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-400">
                      No supplier purchases recorded for this period. Click "Record Purchase Invoice" to add.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: TRIAL BALANCE */}
      {/* ======================================================== */}
      {activeTab === 'trial-balance' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-zinc-900">Trial Balance Statement</h3>
            <p className="text-xs text-zinc-500">
              Account-wise debit and credit verification for period ({dateFrom} to {dateTo})
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3">Account Title</th>
                  <th className="py-3 px-3 text-right">Debit Balance (৳)</th>
                  <th className="py-3 px-3 text-right">Credit Balance (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {trialBalance?.accounts.map((acc, i) => (
                  <tr key={i} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-bold text-zinc-900">{acc.name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800">
                      {acc.debit > 0 ? `৳${acc.debit.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800">
                      {acc.credit > 0 ? `৳${acc.credit.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-zinc-300 font-black bg-zinc-50 text-xs">
                <tr>
                  <td className="py-3 px-3 text-zinc-900 uppercase">Total Sum</td>
                  <td className="py-3 px-3 text-right text-brand-700">
                    ৳{trialBalance?.totalDebits.toLocaleString() || 0}
                  </td>
                  <td className="py-3 px-3 text-right text-brand-700">
                    ৳{trialBalance?.totalCredits.toLocaleString() || 0}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: BALANCE SHEET */}
      {/* ======================================================== */}
      {activeTab === 'balance-sheet' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-base font-black text-zinc-900">Statement of Financial Position</h3>
            <p className="text-xs text-zinc-500">
              Calculated real Assets, Liabilities, and Retained Equity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ASSETS */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <span className="text-xs font-black uppercase text-emerald-800">Assets</span>
                <span className="text-xs font-black text-emerald-700">
                  Total: ৳{balanceSheet?.totalAssets.toLocaleString() || 0}
                </span>
              </div>
              <div className="space-y-2">
                {balanceSheet?.assets.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs"
                  >
                    <span className="font-bold text-zinc-800">{item.name}</span>
                    <span className="font-black text-zinc-900">৳{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-5">
              {/* Liabilities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <span className="text-xs font-black uppercase text-rose-800">Liabilities</span>
                  <span className="text-xs font-black text-rose-700">
                    Total: ৳{balanceSheet?.totalLiabilities.toLocaleString() || 0}
                  </span>
                </div>
                {balanceSheet?.liabilities.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs"
                  >
                    <span className="font-bold text-zinc-800">{item.name}</span>
                    <span className="font-black text-rose-600">৳{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Equity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                  <span className="text-xs font-black uppercase text-blue-800">Equity</span>
                  <span className="text-xs font-black text-blue-700">
                    Total: ৳{balanceSheet?.totalEquity.toLocaleString() || 0}
                  </span>
                </div>
                {balanceSheet?.equity.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-3 rounded-xl bg-zinc-50 border border-zinc-100 text-xs"
                  >
                    <span className="font-bold text-zinc-800">{item.name}</span>
                    <span className="font-black text-blue-700">৳{item.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 7: INCOME STATEMENT */}
      {/* ======================================================== */}
      {activeTab === 'income-statement' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-5">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-base font-black text-zinc-900">Income Statement (Profit & Loss)</h3>
            <p className="text-xs text-zinc-500">
              For period {dateFrom} to {dateTo} (Asia/Dhaka)
            </p>
          </div>

          <div className="space-y-3 text-xs max-w-2xl mx-auto">
            {/* Sales Revenue */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex justify-between items-center">
              <div>
                <div className="font-black text-emerald-900">Gross Sales Revenue</div>
                <div className="text-[10px] text-emerald-700">From paid & confirmed orders</div>
              </div>
              <span className="text-base font-black text-emerald-700">
                +৳{incomeStatement?.revenue.toLocaleString() || 0}
              </span>
            </div>

            {/* Purchases / COGS */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex justify-between items-center">
              <div>
                <div className="font-black text-amber-900">Purchases & Cost of Goods (COGS)</div>
                <div className="text-[10px] text-amber-700">Supplier inventory purchases</div>
              </div>
              <span className="text-base font-black text-amber-700">
                −৳{incomeStatement?.purchasesTotal.toLocaleString() || 0}
              </span>
            </div>

            {/* Operating Expenses */}
            <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex justify-between items-center">
              <div>
                <div className="font-black text-rose-900">Operating Expenses (OPEX)</div>
                <div className="text-[10px] text-rose-700">Labor, Rent, Utilities & Maintenance</div>
              </div>
              <span className="text-base font-black text-rose-700">
                −৳{incomeStatement?.expensesTotal.toLocaleString() || 0}
              </span>
            </div>

            {/* Expense breakdown by category */}
            {incomeStatement?.expenseByCategory &&
              Object.keys(incomeStatement.expenseByCategory).length > 0 && (
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-1.5">
                  <div className="font-black text-[10px] uppercase text-zinc-500 mb-1">
                    Expense Breakdown:
                  </div>
                  {Object.entries(incomeStatement.expenseByCategory).map(([cat, amount]) => (
                    <div key={cat} className="flex justify-between items-center text-zinc-700">
                      <span>• {cat}</span>
                      <span className="font-bold">৳{amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

            {/* Net Profit / Loss */}
            <div className="p-4 rounded-2xl bg-zinc-900 text-white flex justify-between items-center mt-4">
              <div>
                <div className="text-xs uppercase tracking-wider font-black text-zinc-400">
                  Net Operating Profit
                </div>
                <div className="text-[11px] text-zinc-400">
                  Revenue − Total Operating & Purchase Costs
                </div>
              </div>
              <span
                className={`text-xl font-black ${
                  (incomeStatement?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ৳{incomeStatement?.netProfit.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 8: MANAGE EXPENSES */}
      {/* ======================================================== */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-zinc-900">Operating Expenses Management</h3>
              <p className="text-xs text-zinc-500">
                Record, modify, and audit all food court costs with preserved change history
              </p>
            </div>
            <button
              onClick={handleOpenAddExpense}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Expense</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Description / Notes</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-3 text-right">Amount (৳)</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-zinc-50/50">
                    <td className="py-2.5 px-3 font-semibold text-zinc-600">{e.date}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-100 text-zinc-800">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-800">{e.notes || '—'}</td>
                    <td className="py-2.5 px-3 text-zinc-500">
                      {e.createdBy}
                      {e.updatedBy && <span className="text-[10px] text-zinc-400 block">Edited by {e.updatedBy}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-rose-600 text-sm">
                      ৳{e.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      {e.history && e.history.length > 1 && (
                        <button
                          onClick={() => setHistoryModalExpense(e)}
                          className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
                          title="View Revision History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEditExpense(e)}
                        className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 cursor-pointer"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(e)}
                        className="p-1 hover:bg-red-50 rounded-lg text-zinc-400 hover:text-red-600 cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      No operating expenses recorded for this period. Click "Add New Expense" to record one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EXPENSE ENTRY / EDIT MODAL */}
      {/* ======================================================== */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-black text-zinc-900">
                {editingExpense ? 'Edit Operating Expense' : 'Record Operating Expense'}
              </h3>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Expense Amount (৳) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 4500"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Expense Date *</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Category *</label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value as any)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs font-semibold cursor-pointer"
                >
                  <option value="Food Cost">Food Cost</option>
                  <option value="Labor">Labor</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Rent">Rent</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Description / Receipt Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Electricity bill for food hall or monthly kitchen maintenance"
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs resize-none"
                />
              </div>

              {expError && (
                <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
                  {expError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expSubmitting}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {expSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PURCHASE INVOICE MODAL */}
      {/* ======================================================== */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-black text-zinc-900">
                {editingPurchase ? 'Edit Supplier Purchase' : 'Record Supplier Purchase Invoice'}
              </h3>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePurchase} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bengal Meat Supplies Ltd."
                  value={purSupplier}
                  onChange={e => setPurSupplier(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Invoice Amount (৳) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 18500"
                  value={purAmount}
                  onChange={e => setPurAmount(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={purDate}
                    onChange={e => setPurDate(e.target.value)}
                    className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Payment Status *</label>
                  <select
                    value={purStatus}
                    onChange={e => setPurStatus(e.target.value as any)}
                    className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs font-bold cursor-pointer"
                  >
                    <option value="UNPAID">UNPAID (Payable)</option>
                    <option value="PAID">PAID (Settled)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Meat & Poultry, Dairy, Packaging Boxes"
                  value={purCategory}
                  onChange={e => setPurCategory(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Description / Bill Ref</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Weekly beef steak supply for Coffee Buzz Fusion Cafe"
                  value={purDescription}
                  onChange={e => setPurDescription(e.target.value)}
                  className="w-full p-2.5 border border-zinc-200 rounded-xl focus:ring-1 focus:ring-brand-500 text-xs resize-none"
                />
              </div>

              {purError && (
                <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-xl border border-red-200">
                  {purError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="flex-1 py-2.5 border border-zinc-200 rounded-xl font-bold text-zinc-600 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purSubmitting}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {purSubmitting ? 'Saving...' : editingPurchase ? 'Update Invoice' : 'Save Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EXPENSE REVISION HISTORY MODAL */}
      {/* ======================================================== */}
      {historyModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-black text-zinc-900">Expense Revision History</h3>
              </div>
              <button
                onClick={() => setHistoryModalExpense(null)}
                className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-80 overflow-y-auto">
              {historyModalExpense.history?.map((h, i) => (
                <div key={i} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        h.action === 'CREATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {h.action}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(h.modifiedAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black pt-1">
                    <span className="text-zinc-800">{h.category}</span>
                    <span className="text-rose-600">৳{h.amount.toLocaleString()}</span>
                  </div>
                  {h.notes && <p className="text-zinc-600 text-[11px]">Note: "{h.notes}"</p>}
                  <p className="text-[10px] text-zinc-500 font-semibold">Author: {h.modifiedBy}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setHistoryModalExpense(null)}
              className="w-full mt-4 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Close History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
