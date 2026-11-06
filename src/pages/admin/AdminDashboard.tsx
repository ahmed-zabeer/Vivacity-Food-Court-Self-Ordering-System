import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import {
  Order,
  Table,
  RevenueSummary,
  CounterReadyItem,
  Expense,
  DailyFinancialSummary,
  Stall,
  InventoryMenuItem
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'wouter';
import {
  ShoppingBag,
  DollarSign,
  Grid,
  Clock,
  ChefHat,
  CheckCircle,
  Package,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Store,
  Users,
  RotateCcw,
  Calendar,
  CalendarDays,
  ShieldCheck,
  Check,
  Sparkles,
  QrCode,
  Bell,
  Printer,
  Plus,
  Trash2,
  Edit2,
  History,
  BarChart3,
  FileText,
  Receipt,
  BookOpen,
  Power,
  Play,
  Pause,
  Sliders,
  Search,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { KOTPrintView } from '../../components/common/KOTPrintView';

export const AdminDashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [analytics, setAnalytics] = useState<any>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [readyItems, setReadyItems] = useState<CounterReadyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [printKOTOrder, setPrintKOTOrder] = useState<Order | null>(null);

  // Track seen order IDs in state and persistent storage
  const [seenOrderIds, setSeenOrderIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('vivacity_seen_pending_orders');
        return new Set(raw ? JSON.parse(raw) : []);
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const markOrderAsSeen = (orderId: string) => {
    setSeenOrderIds(prev => {
      if (prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.add(orderId);
      try {
        localStorage.setItem('vivacity_seen_pending_orders', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Restart / Reset Modal State
  type ResetScope = 'DAILY' | 'MONTHLY' | 'YEARLY' | 'TABLES' | 'ALL' | 'DELETE_ORDERS';
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState<ResetScope>('DELETE_ORDERS');
  const [resetting, setResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Authorized roles check: Chief Administrator (SUPER ADMIN), Food Court Owner, Food Court Manager, Counter Cashier
  const isAuthorizedToReset = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'].includes(currentUser.role);
  const isAuthorizedForExpenses = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'].includes(currentUser.role);

  // ================= Stall Pause & Central Food Inventory State =================
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [dashInventory, setDashInventory] = useState<InventoryMenuItem[]>([]);
  const [dashInvSearch, setDashInvSearch] = useState('');
  const [dashInvStall, setDashInvStall] = useState('ALL');
  const [pauseModalStall, setPauseModalStall] = useState<Stall | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseDuration, setPauseDuration] = useState<string>('30');
  const [pauseSubmitting, setPauseSubmitting] = useState(false);
  const [editingDashStock, setEditingDashStock] = useState<{ [id: string]: string }>({});
  const [savingDashStock, setSavingDashStock] = useState<{ [id: string]: boolean }>({});

  // ================= Financial Overview & Expenses State =================
  const getTodayDhakaDate = () => {
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

  const getDhakaDateOffset = (daysAgo: number) => {
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

  type DateRangePreset = '7d' | '1m' | '2m' | '3m' | 'custom';
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>(() => getDhakaDateOffset(6));
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayDhakaDate);

  const [selectedFinancialDate, setSelectedFinancialDate] = useState<string>(getTodayDhakaDate);
  const [financialSummary, setFinancialSummary] = useState<DailyFinancialSummary | null>(null);
  const [financialGraph, setFinancialGraph] = useState<DailyFinancialSummary[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [loadingFinancial, setLoadingFinancial] = useState<boolean>(false);

  // Expense entry modal state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expAmount, setExpAmount] = useState<string>('');
  const [expDate, setExpDate] = useState<string>(getTodayDhakaDate);
  const [expCategory, setExpCategory] = useState<Expense['category']>('Food Cost');
  const [expNotes, setExpNotes] = useState<string>('');
  const [expSubmitting, setExpSubmitting] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);

  // Correction history review modal
  const [historyModalExpense, setHistoryModalExpense] = useState<Expense | null>(null);

  const selectedDateRef = React.useRef(selectedFinancialDate);
  selectedDateRef.current = selectedFinancialDate;

  const rangePresetRef = React.useRef(rangePreset);
  rangePresetRef.current = rangePreset;

  const customStartRef = React.useRef(customStartDate);
  customStartRef.current = customStartDate;

  const customEndRef = React.useRef(customEndDate);
  customEndRef.current = customEndDate;

  const getRangeQueryParams = (preset: DateRangePreset, start: string, end: string) => {
    if (preset === '7d') return { days: 7 };
    if (preset === '1m') return { days: 30 };
    if (preset === '2m') return { days: 60 };
    if (preset === '3m') return { days: 90 };
    return { dateFrom: start || getDhakaDateOffset(6), dateTo: end || getTodayDhakaDate() };
  };

  const getRangeLabel = (preset: DateRangePreset, start: string, end: string) => {
    if (preset === '7d') return 'Last 7 Days';
    if (preset === '1m') return 'Last 1 Month (30 Days)';
    if (preset === '2m') return 'Last 2 Months (60 Days)';
    if (preset === '3m') return 'Last 3 Months (90 Days)';
    return `Custom Range (${start} to ${end})`;
  };

  // Aggregated period totals calculated directly from the graph array
  const periodTotals = React.useMemo(() => {
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalOrders = 0;
    let totalExpenseCount = 0;

    for (const item of financialGraph) {
      totalRevenue += item.revenue || 0;
      totalExpenses += item.expenses || 0;
      totalOrders += item.revenueOrders || 0;
      totalExpenseCount += item.expenseCount || 0;
    }

    const netProfit = totalRevenue - totalExpenses;
    return {
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: netProfit,
      orders: totalOrders,
      expenseCount: totalExpenseCount,
      days: financialGraph.length
    };
  }, [financialGraph]);

  const fetchFinancialData = React.useCallback(async (
    targetDate?: string,
    presetOverride?: DateRangePreset,
    startOverride?: string,
    endOverride?: string
  ) => {
    const dateStr = targetDate || selectedDateRef.current;
    const preset = presetOverride || rangePresetRef.current;
    const start = startOverride || customStartRef.current;
    const end = endOverride || customEndRef.current;

    try {
      setLoadingFinancial(true);
      const rangeParams = getRangeQueryParams(preset, start, end);
      const [sumRes, graphRes, expRes] = await Promise.all([
        api.getDailyFinancialSummary(dateStr).catch(() => null),
        api.getFinancialGraph(rangeParams).catch(() => []),
        api.getExpenses({ date: dateStr }).catch(() => [])
      ]);
      if (sumRes) setFinancialSummary(sumRes);
      if (graphRes) setFinancialGraph(graphRes);
      if (expRes) setExpensesList(expRes);
    } catch (e) {
      console.error('Error fetching financial data:', e);
    } finally {
      setLoadingFinancial(false);
    }
  }, []);

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setExpAmount('');
    setExpDate(selectedFinancialDate);
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
    if (!expDate) {
      setExpError('Please choose a valid date.');
      return;
    }

    setExpSubmitting(true);
    try {
      const userPayload = { name: currentUser.name, role: currentUser.role };
      if (editingExpense) {
        await api.updateExpense(editingExpense.id, {
          amount: numAmount,
          date: expDate,
          category: expCategory,
          notes: expNotes
        }, userPayload);
      } else {
        await api.addExpense({
          amount: numAmount,
          date: expDate,
          category: expCategory,
          notes: expNotes
        }, userPayload);
      }
      setExpenseModalOpen(false);
      await fetchFinancialData(selectedFinancialDate);
    } catch (err: any) {
      setExpError(err.message || 'Failed to save expense');
    } finally {
      setExpSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!window.confirm(`Delete expense of ৳${expense.amount} (${expense.category})?`)) return;
    try {
      await api.deleteExpense(expense.id, { name: currentUser.name, role: currentUser.role });
      await fetchFinancialData(selectedFinancialDate);
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, revenueRes, ordersRes, tablesRes, readyRes, stallsRes, invRes] = await Promise.all([
        api.getAnalytics(),
        api.getRevenueSummary(),
        api.getOrders(),
        api.getTables(),
        api.getCounterReadyConfirmations().catch(() => []),
        api.getStalls().catch(() => []),
        api.getInventory().catch(() => [])
      ]);
      setAnalytics(analyticsRes);
      setRevenue(revenueRes);
      setRecentOrders(ordersRes.slice(0, 8));
      setTables(tablesRes);
      setReadyItems(readyRes || []);
      setStalls(stallsRes || []);
      setDashInventory(invRes || []);

      // Check for unalerted pending orders and play alert sound
      ordersRes.forEach((o: Order) => {
        if (o.status === 'NEW' || o.status === 'UNDER REVIEW' || o.paymentStatus === 'PAYMENT DUE') {
          sound.playPendingOrderAlert(o.id);
        }
      });
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintKOTForItem = async (item: CounterReadyItem) => {
    const existing = recentOrders.find(o => o.id === item.orderId);
    if (existing) {
      setPrintKOTOrder(existing);
      return;
    }
    try {
      const fullOrder = await api.getOrder(item.orderId);
      if (fullOrder) {
        setPrintKOTOrder(fullOrder);
        return;
      }
    } catch {}
    setPrintKOTOrder({
      id: item.orderId,
      token: item.token,
      tableId: item.tableId,
      type: item.orderType,
      status: item.status as any,
      paymentStatus: 'PAID',
      paymentMethod: 'CASH',
      customerName: item.customerName || undefined,
      customerPhone: item.customerPhone || undefined,
      serviceType: item.serviceType,
      createdAt: item.createdAt,
      items: item.items.map((it, idx) => ({
        id: it.id || `item-${idx}`,
        menuItemId: it.id,
        name: it.name,
        price: it.price,
        basePrice: it.price,
        quantity: it.quantity,
        notes: it.notes,
        stallId: item.stallId,
        stallName: item.stallName,
        isUnavailable: false
      })),
      stalls: [{
        stallId: item.stallId,
        stallName: item.stallName,
        status: item.status,
        items: item.items
      }],
      subtotal: item.items.reduce((s, it) => s + it.price * it.quantity, 0),
      discount: 0,
      tax: 0,
      serviceCharge: 0,
      grandTotal: item.items.reduce((s, it) => s + it.price * it.quantity, 0),
      kotGenerated: true,
      history: []
    });
  };

  useEffect(() => {
    fetchDashboardData();
    fetchFinancialData();

    // Real-time SSE listeners
    const unsubOrderCreated = realtime.on('order_created', (newOrder: Order) => {
      if (newOrder && (newOrder.status === 'NEW' || newOrder.status === 'UNDER REVIEW' || newOrder.paymentStatus === 'PAYMENT DUE')) {
        sound.playPendingOrderAlert(newOrder.id);
      } else {
        sound.playNewOrderChime();
      }
      fetchDashboardData();
      fetchFinancialData();
    });

    const unsubOrderUpdated = () => {
      fetchDashboardData();
      fetchFinancialData();
    };
    const unsubOrderUpdatedRealtime = realtime.on('order_updated', unsubOrderUpdated);

    const unsubRevenueUpdated = realtime.on('revenue_updated', (updatedSummary: RevenueSummary) => {
      setRevenue(updatedSummary);
      fetchFinancialData();
    });

    const unsubFinancialUpdated = realtime.on('financial_updated', () => {
      fetchFinancialData();
    });

    const unsubAnalyticsUpdated = realtime.on('analytics_updated', (updatedAnalytics: any) => {
      setAnalytics(updatedAnalytics);
    });

    const unsubKitchenReady = realtime.on('stall_kitchen_ready', () => {
      sound.playKitchenBell();
      api.getCounterReadyConfirmations().then(items => setReadyItems(items || [])).catch(() => {});
    });

    const unsubReadyConfirmed = realtime.on('stall_ready_confirmed', () => {
      api.getCounterReadyConfirmations().then(items => setReadyItems(items || [])).catch(() => {});
    });

    const unsubStallUpdated = realtime.on('stall_updated', () => {
      api.getStalls().then(s => setStalls(s || [])).catch(() => {});
    });

    const unsubInventoryUpdated = realtime.on('inventory_updated', () => {
      api.getInventory().then(inv => setDashInventory(inv || [])).catch(() => {});
    });

    return () => {
      unsubOrderCreated();
      unsubOrderUpdatedRealtime();
      unsubRevenueUpdated();
      unsubFinancialUpdated();
      unsubAnalyticsUpdated();
      unsubKitchenReady();
      unsubReadyConfirmed();
      unsubStallUpdated();
      unsubInventoryUpdated();
    };
  }, [fetchFinancialData]);

  // Synchronize financial data when inspected date or range selection changes
  useEffect(() => {
    fetchFinancialData(selectedFinancialDate, rangePreset, customStartDate, customEndDate);
  }, [selectedFinancialDate, rangePreset, customStartDate, customEndDate, fetchFinancialData]);

  const handleConfirmAndNotify = async (orderId: string, stallId: string) => {
    try {
      await api.confirmAndNotifyCustomer(orderId, stallId, currentUser.name);
      const updated = await api.getCounterReadyConfirmations().catch(() => []);
      setReadyItems(updated || []);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to confirm customer notification');
    }
  };

  const handleMarkCollected = async (orderId: string, stallId: string) => {
    try {
      await api.markStallCollected(orderId, stallId, currentUser.name);
      const updated = await api.getCounterReadyConfirmations().catch(() => []);
      setReadyItems(updated || []);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark food collected');
    }
  };

  // Stall Pause / Resume Handlers
  const handleOpenPauseModal = (stall: Stall) => {
    setPauseModalStall(stall);
    setPauseReason(stall.pauseReason || '');
    setPauseDuration('30');
  };

  const handleConfirmPauseStall = async () => {
    if (!pauseModalStall) return;
    setPauseSubmitting(true);
    try {
      const dur = pauseDuration === 'manual' ? null : parseInt(pauseDuration, 10);
      await api.pauseStall(
        pauseModalStall.id,
        pauseReason.trim(),
        dur,
        { name: currentUser.name, role: currentUser.role }
      );
      setPauseModalStall(null);
      const updatedStalls = await api.getStalls().catch(() => []);
      setStalls(updatedStalls);
    } catch (err: any) {
      alert(err.message || 'Failed to pause stall');
    } finally {
      setPauseSubmitting(false);
    }
  };

  const handleResumeStall = async (stall: Stall) => {
    if (!window.confirm(`Resume operations for "${stall.name}"? Customers will immediately be able to order again.`)) return;
    try {
      await api.resumeStall(stall.id, { name: currentUser.name, role: currentUser.role });
      const updatedStalls = await api.getStalls().catch(() => []);
      setStalls(updatedStalls);
    } catch (err: any) {
      alert(err.message || 'Failed to resume stall');
    }
  };

  // Dashboard quick stock update
  const handleSaveDashStock = async (item: InventoryMenuItem) => {
    const rawVal = editingDashStock[item.id];
    if (rawVal === undefined || rawVal === '') return;
    const qty = parseInt(rawVal, 10);
    if (isNaN(qty) || qty < 0) return;
    setSavingDashStock(prev => ({ ...prev, [item.id]: true }));
    try {
      await api.setItemStock(item.id, qty, {
        name: currentUser.name,
        role: currentUser.role,
        stallId: currentUser.stallId || null
      });
      const updated = await api.getInventory().catch(() => []);
      setDashInventory(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    } finally {
      setSavingDashStock(prev => ({ ...prev, [item.id]: false }));
    }
  };

  const handleToggleDashAvailability = async (item: InventoryMenuItem) => {
    const nextAvail = item.inv?.manuallyDisabled;
    try {
      await api.setItemManualAvailability(item.id, !!nextAvail, {
        name: currentUser.name,
        role: currentUser.role
      });
      const updated = await api.getInventory().catch(() => []);
      setDashInventory(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update availability');
    }
  };

  const openResetModal = (scope: ResetScope = 'DELETE_ORDERS') => {
    if (!isAuthorizedToReset) return;
    setResetScope(scope);
    setResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!isAuthorizedToReset) return;
    setResetting(true);
    try {
      const userPayload = { name: currentUser.name, role: currentUser.role };
      let msg = '';

      if (resetScope === 'DELETE_ORDERS') {
        const res = await api.resetEverything(userPayload);
        if (res.summary) setRevenue(res.summary);
        msg = `All orders deleted successfully. All revenue metrics defaulted to ৳0, and 55 tables reset to AVAILABLE.`;
      } else if (resetScope === 'DAILY') {
        const res = await api.resetDailyRevenue(userPayload);
        if (res.summary) setRevenue(res.summary);
        msg = "Today's daily revenue summary has been reset to ৳0.";
      } else if (resetScope === 'MONTHLY') {
        const res = await api.resetMonthlyRevenue(userPayload);
        if (res.summary) setRevenue(res.summary);
        msg = "Current month's revenue summary has been reset to ৳0.";
      } else if (resetScope === 'YEARLY') {
        const res = await api.resetYearlyRevenue(userPayload);
        if (res.summary) setRevenue(res.summary);
        msg = "Current year's revenue summary has been reset to ৳0.";
      } else if (resetScope === 'TABLES') {
        await api.resetTables(userPayload);
        msg = "All 55 tables have been cleared and reset to AVAILABLE.";
      } else if (resetScope === 'ALL') {
        const res = await api.resetAllMetrics(userPayload);
        if (res.summary) setRevenue(res.summary);
        msg = "All metrics (Daily, Monthly, Yearly revenue & Tables) have been reset to default ৳0.";
      }

      setResetModalOpen(false);
      setResetFeedback(msg);
      setTimeout(() => setResetFeedback(null), 6000);
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete reset');
    } finally {
      setResetting(false);
    }
  };

  // Helper to format currency in Bangladeshi Taka
  const formatTaka = (amount: number) => {
    return `৳ ${(amount || 0).toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 text-center text-zinc-500 font-bold">
        Loading Central Control Center...
      </div>
    );
  }

  // General operations KPIs
  const opsKpis = [
    { label: "Active Tables", val: `${analytics?.activeTables || 0} / 55`, icon: Grid, color: "text-purple-600 bg-purple-50" },
    { label: "Payment Due", val: analytics?.paymentDueCount || 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "In Kitchen", val: analytics?.preparingCount || 0, icon: ChefHat, color: "text-orange-600 bg-orange-50" },
    { label: "Ready for Delivery", val: analytics?.readyCount || 0, icon: CheckCircle, color: "text-teal-600 bg-teal-50" },
    { label: "Parcel Takeaways", val: analytics?.parcelCount || 0, icon: Package, color: "text-indigo-600 bg-indigo-50" }
  ];

  const isPendingOrder = (o: Order) => o.status === 'NEW' || o.status === 'UNDER REVIEW' || o.paymentStatus === 'PAYMENT DUE';
  const pendingOrdersList = recentOrders.filter(isPendingOrder);
  const unseenPendingCount = recentOrders.filter(o => isPendingOrder(o) && !seenOrderIds.has(o.id)).length;

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-brand-600">
              Live Operations Control Center
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
            Vivacity Food Court
          </h1>
          <p className="text-xs text-zinc-500">
            55 Tables • 6 Culinary Kitchens • Single Master Order Hub • Asia/Dhaka (UTC+6)
          </p>
        </div>

        {/* Quick Hub Navigation Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Accounting Page Button */}
          <button
            onClick={() => setLocation('/admin/accounting')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ring-2 ring-emerald-500/20"
            title="Open Dedicated Accounting & Financial Statements"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Accounting</span>
          </button>

          {/* Central Food Inventory Button */}
          <button
            onClick={() => setLocation('/admin/inventory')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 ring-2 ring-blue-500/20"
            title="Open Central Food Inventory for All Stalls"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Food Inventory</span>
          </button>

          <button
            onClick={() => setLocation('/admin/orders')}
            className="relative px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Orders Review ({pendingOrdersList.length})</span>
            {unseenPendingCount > 0 && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => setLocation('/admin/tables')}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            55 Table Map
          </button>
          <button
            onClick={() => setLocation('/kitchen')}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Kitchen KDS
          </button>
          <button
            onClick={() => setLocation('/admin/qr-codes')}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            QR Codes Hub
          </button>
          {isAuthorizedToReset && (
            <button
              onClick={() => openResetModal('DELETE_ORDERS')}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Delete all orders & reset revenue to ৳0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>⚡ One-Click Reset All &amp; Delete Orders</span>
            </button>
          )}
          {/* Sound Test Button — plays ready chime + vibration without affecting orders */}
          <button
            onClick={() => {
              sound.playReadyChime(); // no eventId = no deduplication, always plays
              sound.triggerVibration([200, 100, 200, 100, 100]);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Test the food-ready chime sound and device vibration"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>🔔 Test Sound</span>
          </button>
        </div>

      </div>

      {/* Reset Success Feedback Banner */}
      {resetFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{resetFeedback}</span>
          </div>
          <button onClick={() => setResetFeedback(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. THREE REVENUE CARDS: Daily Revenue | Monthly Revenue | Yearly Revenue */}
      {/* ========================================================================= */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-zinc-700">
              Hospitality Revenue Engine • Bangladesh Time (Asia/Dhaka)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Master Restart / Reset Control */}
            {isAuthorizedToReset && (
              <button
                onClick={() => openResetModal('ALL')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-red-700 bg-white hover:bg-red-50 border border-zinc-200 hover:border-red-300 shadow-2xs transition-all cursor-pointer"
                title="Restart and clear metrics"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
                <span>Restart & Reset Controls</span>
              </button>
            )}
            <span className="text-[11px] text-zinc-400 font-medium hidden md:inline">
              Auto-resets at midnight • Independent periods
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── CARD 1: DAILY REVENUE ── */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                      Today's Revenue
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-semibold block">
                      {revenue?.daily.period || "Today"}
                    </span>
                  </div>
                </div>

                {isAuthorizedToReset && (
                  <button
                    onClick={() => openResetModal('DAILY')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold text-zinc-500 hover:text-red-700 bg-zinc-50 hover:bg-red-50 border border-zinc-200/80 hover:border-red-200 active:scale-95 transition-all cursor-pointer"
                    title="Reset Today's Revenue Summary"
                  >
                    <RotateCcw className="w-3 h-3 text-zinc-400 group-hover:text-red-500" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Main Amount */}
              <div className="my-2">
                <div className="text-3xl font-black text-zinc-900 tracking-tight">
                  {formatTaka(revenue?.daily.revenue || 0)}
                </div>
                <div className="text-xs font-bold text-zinc-500 mt-0.5">
                  <strong className="text-zinc-900 font-extrabold">{revenue?.daily.orders || 0}</strong> Paid Orders
                </div>
              </div>
            </div>

            {/* Comparison / Reset Status Strip */}
            <div className="pt-3 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
              {revenue?.daily.resetAt ? (
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 truncate">
                  Reset at {new Date(revenue.daily.resetAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' })} • Starts ৳0
                </span>
              ) : revenue?.daily.comparison?.prevOrders ? (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span className={`font-bold ${
                    (revenue.daily.comparison.percentageChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {(revenue.daily.comparison.percentageChange ?? 0) >= 0 ? '+' : ''}
                    {revenue.daily.comparison.percentageChange ?? 0}%
                  </span>
                  <span>vs yesterday ({formatTaka(revenue.daily.comparison.prevRevenue)})</span>
                </div>
              ) : (
                <span className="text-zinc-400">Default ৳0 • Updates on payment</span>
              )}
            </div>
          </div>

          {/* ── CARD 2: MONTHLY REVENUE ── */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                      Monthly Revenue
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-semibold block">
                      {revenue?.monthly.period ? `Calendar Month (${revenue.monthly.period})` : "Current Month"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isAuthorizedToReset && (
                    <button
                      onClick={() => openResetModal('MONTHLY')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                      title="Reset Monthly Revenue Summary"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase">
                    MTD
                  </span>
                </div>
              </div>

              {/* Main Amount */}
              <div className="my-2">
                <div className="text-3xl font-black text-zinc-900 tracking-tight">
                  {formatTaka(revenue?.monthly.revenue || 0)}
                </div>
                <div className="text-xs font-bold text-zinc-500 mt-0.5">
                  <strong className="text-zinc-900 font-extrabold">{revenue?.monthly.orders || 0}</strong> Paid Orders
                </div>
              </div>
            </div>

            {/* Comparison Strip */}
            <div className="pt-3 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
              {revenue?.monthly.resetAt ? (
                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 truncate">
                  Monthly summary reset • Counting from ৳0
                </span>
              ) : revenue?.monthly.comparison?.prevOrders ? (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span className={`font-bold ${
                    (revenue.monthly.comparison.percentageChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {(revenue.monthly.comparison.percentageChange ?? 0) >= 0 ? '+' : ''}
                    {revenue.monthly.comparison.percentageChange ?? 0}%
                  </span>
                  <span>vs last month ({formatTaka(revenue.monthly.comparison.prevRevenue)})</span>
                </div>
              ) : (
                <span className="text-zinc-400">1st of month to date</span>
              )}
            </div>
          </div>

          {/* ── CARD 3: YEARLY REVENUE ── */}
          <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-xs hover:border-zinc-300 transition-all flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">
                      Yearly Revenue
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-semibold block">
                      {revenue?.yearly.period ? `Calendar Year (${revenue.yearly.period})` : "Current Year"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isAuthorizedToReset && (
                    <button
                      onClick={() => openResetModal('YEARLY')}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                      title="Reset Yearly Revenue Summary"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">
                    YTD
                  </span>
                </div>
              </div>

              {/* Main Amount */}
              <div className="my-2">
                <div className="text-3xl font-black text-zinc-900 tracking-tight">
                  {formatTaka(revenue?.yearly.revenue || 0)}
                </div>
                <div className="text-xs font-bold text-zinc-500 mt-0.5">
                  <strong className="text-zinc-900 font-extrabold">{revenue?.yearly.orders || 0}</strong> Paid Orders
                </div>
              </div>
            </div>

            {/* Comparison Strip */}
            <div className="pt-3 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px]">
              {revenue?.yearly.resetAt ? (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 truncate">
                  Yearly summary reset • Counting from ৳0
                </span>
              ) : revenue?.yearly.comparison?.prevOrders ? (
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span className={`font-bold ${
                    (revenue.yearly.comparison.percentageChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {(revenue.yearly.comparison.percentageChange ?? 0) >= 0 ? '+' : ''}
                    {revenue.yearly.comparison.percentageChange ?? 0}%
                  </span>
                  <span>vs last year ({formatTaka(revenue.yearly.comparison.prevRevenue)})</span>
                </div>
              ) : (
                <span className="text-zinc-400">Jan 1 to date • Complete fiscal year</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. STALL CONTROLS & TEMPORARY AVAILABILITY                                */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-zinc-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-zinc-900 tracking-tight">
                  Stall Control &amp; Temporary Availability
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold">
                  {stalls.length > 0 ? `${stalls.length} Stalls` : '7 Stalls'}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Pause any stall during peak rush or prep. Paused stalls display &ldquo;Temporarily Unavailable&rdquo; and reject new orders while other stalls remain open.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stalls.map((s) => {
            const isPaused = !!s.isPaused;
            return (
              <div
                key={s.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isPaused
                    ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200'
                    : 'bg-zinc-50/60 border-zinc-200/80 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase">{s.id}</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaused
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPaused ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        {isPaused ? 'Paused' : 'Active'}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-zinc-900 mt-1">{s.name}</h3>
                  </div>
                  {isAuthorizedToReset && (
                    isPaused ? (
                      <button
                        type="button"
                        onClick={() => handleResumeStall(s)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Resume stall operations"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Resume</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPauseModal(s)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Temporarily pause stall"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pause</span>
                      </button>
                    )
                  )}
                </div>

                {isPaused ? (
                  <div className="bg-amber-100/70 rounded-xl p-2.5 text-xs text-amber-900 space-y-1">
                    <p className="font-semibold text-[11px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{s.pauseReason || 'Temporarily Unavailable'}</span>
                    </p>
                    {s.pauseUntil && (
                      <p className="text-[10px] text-amber-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Auto-resumes: {new Date(s.pauseUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Accepting orders &amp; cooking normally</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CENTRAL COUNTER FOOD INVENTORY & QUICK PORTION CONTROLS               */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-zinc-200/90 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-black">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-zinc-900 tracking-tight">
                  Central Counter Food Inventory
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  Portion Guard Active
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Chefs set prepared portions. System reserves stock atomically and automatically marks items &ldquo;Stock Out&rdquo; when exhausted.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLocation('/admin/inventory')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Package className="w-4 h-4" />
              <span>Full Inventory Manager →</span>
            </button>
            <button
              onClick={() => setLocation('/admin/accounting')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Accounting Suite →</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search menu items by name..."
              value={dashInvSearch}
              onChange={(e) => setDashInvSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={dashInvStall}
              onChange={(e) => setDashInvStall(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="ALL">All Stalls ({stalls.length})</option>
              {stalls.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Items Table / Grid */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase font-black text-zinc-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Item &amp; Stall</th>
                <th className="py-3 px-3 text-center">Prepared</th>
                <th className="py-3 px-3 text-center">Sold</th>
                <th className="py-3 px-3 text-center">Reserved</th>
                <th className="py-3 px-3 text-center">Available</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Quick Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium">
              {dashInventory
                .filter((item) => {
                  if (dashInvStall !== 'ALL' && item.stallId !== dashInvStall) return false;
                  if (dashInvSearch && !item.name.toLowerCase().includes(dashInvSearch.toLowerCase())) return false;
                  return true;
                })
                .slice(0, 10)
                .map((item) => {
                  const inv: any = item.inv || {};
                  const isStockOut = inv.stockOut || inv.available === 0 || inv.manuallyDisabled;
                  const isLowStock = !isStockOut && inv.available !== null && inv.available <= 10;
                  const currentEdit = editingDashStock[item.id] !== undefined
                    ? editingDashStock[item.id]
                    : (inv.preparedQty !== null && inv.preparedQty !== undefined ? String(inv.preparedQty) : '');

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{item.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          {item.stallName || item.stallId} • ৳{item.price}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-zinc-700">
                        {inv.preparedQty !== null && inv.preparedQty !== undefined ? inv.preparedQty : '∞'}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-600">
                        {inv.soldQty || 0}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-600">
                        {inv.reservedQty || 0}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-black text-sm ${
                            isStockOut
                              ? 'text-red-600'
                              : isLowStock
                              ? 'text-amber-600'
                              : 'text-zinc-900'
                          }`}
                        >
                          {inv.available !== null && inv.available !== undefined ? inv.available : '∞'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {inv.manuallyDisabled ? (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-bold">
                            Disabled
                          </span>
                        ) : isStockOut ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                            Stock Out
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={currentEdit}
                            onChange={(e) =>
                              setEditingDashStock((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-zinc-200 text-center font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveDashStock(item)}
                            disabled={savingDashStock[item.id]}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            Set
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleDashAvailability(item)}
                            className={`p-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              item.inv?.manuallyDisabled
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                            }`}
                            title={item.inv?.manuallyDisabled ? 'Enable item' : 'Disable item'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
          <span>Showing items from Central Inventory.</span>
          <button
            onClick={() => setLocation('/admin/inventory')}
            className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>View All ({dashInventory.length}) Items</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>


      {/* Operational KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {opsKpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-4 border border-zinc-200/90 shadow-2xs space-y-2 flex flex-col justify-between"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  {kpi.label}
                </span>
                <span className="text-lg font-black text-zinc-900 tracking-tight">
                  {kpi.val}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. READY FOOD — LIVE STALL-MANAGED NOTIFICATION MONITOR                   */}
      {/* ========================================================================= */}
      {readyItems.length > 0 && (
        <section className="bg-white rounded-3xl p-5 border-2 border-emerald-400/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                  Ready Food — Live Stall-Managed Monitor
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Guest notifications are managed directly by each Stall Manager. Counter monitors ready state and confirms pickup.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black">
                {readyItems.filter(i => i.status === 'READY').length} Awaiting Stall Notification
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                {readyItems.filter(i => i.status === 'NOTIFIED').length} Ready for Pickup
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {readyItems.map((item, idx) => (
              <div
                key={`${item.orderId}-${item.stallId}-${idx}`}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  item.status === 'READY'
                    ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/60'
                    : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-zinc-900">
                          Token #{item.token}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-black uppercase">
                          {item.tableId ? `Table ${item.tableId}` : 'Takeaway'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePrintKOTForItem(item)}
                          className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          title="Print Kitchen Order Ticket"
                        >
                          <Printer className="w-3 h-3 text-amber-400" />
                          <span>PRINT KOT</span>
                        </button>
                      </div>
                      {(item.customerName || item.customerPhone) && (
                        <div className="text-[11px] font-bold text-zinc-700 mt-1">
                          <span>Guest: <strong className="text-zinc-950 font-black">{item.customerName || 'Guest'}</strong></span>
                          {item.customerPhone && (
                            <span className="block text-[10px] font-mono text-zinc-600 font-bold mt-0.5">📞 {item.customerPhone}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.status === 'READY'
                            ? 'bg-amber-200 text-amber-900 animate-pulse'
                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {item.status === 'READY' ? 'Stall Cooking Finished' : `Notified (#${item.notificationCount || 1})`}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        (item.orderType === 'PARCEL')
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}>
                        {item.orderType === 'PARCEL' ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        item.serviceType === 'TABLE_SERVICE'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}>
                        Service Type: {item.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                      </span>
                    </div>
                  </div>

                  {/* Stall */}
                  <div className="flex items-center gap-1.5 text-xs font-black text-brand-600">
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.stallName}</span>
                  </div>

                  {/* Items */}
                  <div className="text-xs text-zinc-700 space-y-1">
                    {item.items.map((it, i) => (
                      <div key={i} className="flex justify-between font-semibold">
                        <div>
                          <span>
                            <strong className="text-brand-600">{it.quantity}×</strong> {it.name}
                          </span>
                          {it.variantName && (
                            <span className="text-[10px] text-zinc-400 block">({it.variantName})</span>
                          )}
                          {it.addOnNames && it.addOnNames.length > 0 && (
                            <span className="text-[10px] text-brand-600 block">+ {it.addOnNames.join(', ')}</span>
                          )}
                        </div>
                        <span className="text-zinc-500">৳{it.price * it.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Wait Time Info */}
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Ready for ~{item.waitMinutes} min</span>
                    </div>
                    {item.notifiedAt && (
                      <span className="text-[10px] text-emerald-600 font-bold">
                        Notified at {new Date(item.notifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Counter Actions */}
                <div className="pt-2 border-t border-zinc-200/60">
                  {item.status === 'READY' ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1.5 rounded-xl w-full text-center">
                        Awaiting Stall Manager Notification
                      </span>
                      <button
                        onClick={() => handleConfirmAndNotify(item.orderId, item.stallId)}
                        className="py-1.5 px-3 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs shrink-0 cursor-pointer"
                        title="Optional cashier assist"
                      >
                        Notify Now
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmAndNotify(item.orderId, item.stallId)}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#e06d24] hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                        title="Diner has not collected yet. Call guest again."
                      >
                        <Bell className="w-3.5 h-3.5 animate-bounce" />
                        <span>Call Again</span>
                      </button>
                      <button
                        onClick={() => handleMarkCollected(item.orderId, item.stallId)}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title={item.serviceType === 'TABLE_SERVICE' ? 'Confirm order handed to runner / delivered' : 'Guest collected food from pickup counter'}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{item.serviceType === 'TABLE_SERVICE' ? 'Mark Delivered' : 'Mark Collected'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Grid: Live Orders Feed & Stall Sales Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Order Stream */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                Live Order Pipeline Feed
              </h2>
              <p className="text-[11px] text-zinc-400">Incoming master orders requiring review or payment</p>
            </div>
            <button
              onClick={() => setLocation('/admin/orders')}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs font-semibold">
                No orders placed yet. Orders will appear here live when placed from tables.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => {
                    markOrderAsSeen(order.id);
                    setLocation('/admin/orders');
                  }}
                  className="p-4 rounded-2xl border border-zinc-200/80 hover:border-brand-500/50 hover:bg-zinc-50/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                        #{order.token}
                      </div>
                      {isPendingOrder(order) && !seenOrderIds.has(order.id) && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" title="New Unseen Pending Order" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-zinc-900">
                          {order.tableId ? `Table ${order.tableId}` : 'Takeaway / Parcel'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          (order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL')
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.orderTypeDescription || ((order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL') ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          order.status === 'NEW'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'PAYMENT DUE'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'PREPARING'
                            ? 'bg-orange-100 text-orange-800'
                            : order.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}>
                          {order.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markOrderAsSeen(order.id);
                            setPrintKOTOrder(order);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          title="Print Kitchen Order Ticket"
                        >
                          <Printer className="w-3 h-3 text-amber-400" />
                          <span>PRINT KOT</span>
                        </button>
                      </div>

                      <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(' • ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                    <div className="text-right">
                      <div className="text-xs font-black text-brand-600">{formatTaka(order.grandTotal)}</div>
                      <div className="text-[10px] text-zinc-400">{order.paymentMethod}</div>
                    </div>
                    <span className="text-xs bg-zinc-100 text-zinc-700 px-3 py-1 rounded-full font-bold">
                      Review →
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Stall Performance & Commission Settlements */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
              Stall Sales Performance
            </h2>
            <p className="text-[11px] text-zinc-400">15% Food Court Commission Split</p>
          </div>

          <div className="space-y-3">
            {analytics?.stallPerformance?.map((stall: any) => (
              <div
                key={stall.stallId}
                onClick={() => setLocation(`/stall/${stall.stallId}/dashboard`)}
                className="p-3 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-900 truncate max-w-[150px]">
                    {stall.name}
                  </span>
                  <span className="text-xs font-black text-brand-600">
                    {formatTaka(stall.grossSales)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{stall.orders} Orders</span>
                  <span>Net Payout: <strong className="text-zinc-800">{formatTaka(stall.netSettlement)}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setLocation('/admin/reports')}
            className="w-full py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
          >
            View Detailed Settlement Reports
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. CLEAR / RESTART MANAGEMENT MODAL (Daily, Monthly, Yearly, Tables, All) */}
      {/* ========================================================================= */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  {resetScope === 'DELETE_ORDERS' && "⚡ Reset Everything & Delete All Orders?"}
                  {resetScope === 'DAILY' && "Reset Today's Revenue?"}
                  {resetScope === 'MONTHLY' && "Reset Monthly Revenue?"}
                  {resetScope === 'YEARLY' && "Reset Yearly Revenue?"}
                  {resetScope === 'TABLES' && "Reset All 55 Tables & Sessions?"}
                  {resetScope === 'ALL' && "Restart All Dashboard Metrics (৳0)?"}
                </h3>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mt-0.5">
                  Authorized Staff Action • {currentUser.role}
                </span>
              </div>
            </div>

            {/* Scope Selection Tabs */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                Select Scope to Reset:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-1 bg-zinc-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setResetScope('DELETE_ORDERS')}
                  className={`col-span-2 sm:col-span-3 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    resetScope === 'DELETE_ORDERS'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  ⚡ One-Button Refresh: Delete Orders &amp; Reset All to ৳0
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('DAILY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resetScope === 'DAILY'
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Today's Daily
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('MONTHLY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resetScope === 'MONTHLY'
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Monthly (MTD)
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('YEARLY')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resetScope === 'YEARLY'
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Yearly (YTD)
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('TABLES')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resetScope === 'TABLES'
                      ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Tables Map
                </button>
                <button
                  type="button"
                  onClick={() => setResetScope('ALL')}
                  className={`col-span-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    resetScope === 'ALL'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-700 hover:bg-zinc-200'
                  }`}
                >
                  Clear Revenue Metrics (৳0)
                </button>
              </div>
            </div>

            {/* Explanatory Message */}
            <div className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-2">
              {resetScope === 'DELETE_ORDERS' && (
                <div className="space-y-1">
                  <p className="font-bold text-red-600">
                    This will delete all orders from the active database, clear runner tasks, free all 55 tables, and reset Daily, Monthly, and Yearly revenue summaries to default ৳0.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Ideal for Counter Cashiers, Food Court Managers, and Chief Administrators starting a fresh test or clean business cycle.
                  </p>
                </div>
              )}
              {resetScope === 'DAILY' && (
                <p>
                  This will reset the Daily Revenue dashboard summary for today. Previously recorded sales and payment transactions will remain preserved in the database and reports.
                </p>
              )}
              {resetScope === 'MONTHLY' && (
                <p>
                  This will reset the Monthly Revenue dashboard summary for the current month to ৳0. Previously recorded sales remain preserved in audit logs.
                </p>
              )}
              {resetScope === 'YEARLY' && (
                <p>
                  This will reset the Yearly Revenue dashboard summary for the current calendar year to ৳0. Historical transactions remain preserved.
                </p>
              )}
              {resetScope === 'TABLES' && (
                <p>
                  This will reset all 55 tables back to AVAILABLE and close any active diner sessions.
                </p>
              )}
              {resetScope === 'ALL' && (
                <p>
                  This will reset Daily, Monthly, and Yearly revenue summaries to default ৳0, and set all 55 tables back to AVAILABLE without deleting order logs.
                </p>
              )}

              <div className="pt-2 border-t border-zinc-200/80 text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Authorized for Counter Cashier, Food Court Manager, and Chief Administrator.</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                disabled={resetting}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={resetting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOT Printable View Modal */}
      {printKOTOrder && (
        <KOTPrintView
          order={printKOTOrder}
          onClose={() => setPrintKOTOrder(null)}
        />
      )}

      {/* ================= STALL PAUSE MODAL ================= */}
      {pauseModalStall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Pause className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Pause Stall: {pauseModalStall.name}
                  </h3>
                  <span className="text-[10px] text-zinc-400">
                    ID: {pauseModalStall.id} • Temporarily halt customer ordering
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPauseModalStall(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-zinc-600 leading-relaxed">
                When paused, customers will see <strong>&ldquo;Temporarily Unavailable&rdquo;</strong> for <strong>{pauseModalStall.name}</strong> and cannot place new orders for this stall. Other food court stalls remain unaffected.
              </p>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  Pause Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '15 Minutes', val: '15' },
                    { label: '30 Minutes', val: '30' },
                    { label: '1 Hour', val: '60' },
                    { label: 'Until Resumed', val: 'manual' }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setPauseDuration(opt.val)}
                      className={`p-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                        pauseDuration === opt.val
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Reason for Pause (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen deep clean, Peak order prep, Chef break..."
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setPauseModalStall(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPauseStall}
                  disabled={pauseSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {pauseSubmitting ? 'Pausing...' : 'Confirm Pause'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXPENSE ADD / EDIT MODAL ================= */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    {editingExpense ? 'Correct Expense Record' : 'Record Operating Expense'}
                  </h3>
                  <span className="text-[10px] text-zinc-400">
                    {editingExpense ? 'Updates entry while preserving audit history' : 'Adds to daily cost calculation'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4 text-xs">
              {expError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{expError}</span>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Expense Amount (BDT ৳) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">৳</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 3500"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Expense Date (Asia/Dhaka) <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Cost Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                >
                  <option value="Food Cost">Food Cost (Raw Ingredients &amp; Supplies)</option>
                  <option value="Labor">Labor &amp; Staff Wages</option>
                  <option value="Utilities">Utilities (Gas, Electric, Water)</option>
                  <option value="Rent">Rent &amp; Facility Lease</option>
                  <option value="Maintenance">Maintenance &amp; Equipment Repairs</option>
                  <option value="Miscellaneous">Miscellaneous / General</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Weekly chicken bulk delivery, kitchen exhaust servicing..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 text-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={expSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {expSubmitting ? 'Saving...' : editingExpense ? 'Save Correction' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EXPENSE CORRECTION HISTORY MODAL ================= */}
      {historyModalExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-zinc-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Expense Revision Audit History
                  </h3>
                  <span className="text-[10px] text-zinc-400">
                    ID: {historyModalExpense.id} • Current: ৳{historyModalExpense.amount} ({historyModalExpense.category})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalExpense(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              <p className="text-[11px] text-zinc-500">
                Full immutable audit trail of every entry and correction recorded by authorized managers:
              </p>

              <div className="space-y-2.5">
                {(historyModalExpense.history || [
                  {
                    amount: historyModalExpense.amount,
                    date: historyModalExpense.date,
                    category: historyModalExpense.category,
                    notes: historyModalExpense.notes,
                    modifiedBy: historyModalExpense.createdBy,
                    modifiedAt: historyModalExpense.createdAt,
                    action: 'CREATED'
                  }
                ]).map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          rev.action === 'CREATED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {rev.action === 'CREATED' ? 'Initial Record' : `Correction #${idx}`}
                        </span>
                        <span className="font-black text-zinc-900">
                          ৳ {rev.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-zinc-400">•</span>
                        <span className="font-bold text-zinc-700">{rev.category}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Date: {rev.date}
                      </span>
                    </div>

                    {rev.notes && (
                      <p className="text-[11px] text-zinc-600 bg-white p-2 rounded-xl border border-zinc-100">
                        "{rev.notes}"
                      </p>
                    )}

                    <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
                      <span>Logged by: <strong>{rev.modifiedBy}</strong></span>
                      <span>{new Date(rev.modifiedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalExpense(null)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
