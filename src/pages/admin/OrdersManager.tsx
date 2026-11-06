import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import { Order, OrderStatus, MenuItem } from '../../types';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { KOTPrintView } from '../../components/common/KOTPrintView';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Banknote,
  Printer,
  Receipt,
  Clock,
  Plus,
  Search,
  Filter,
  Store,
  ChefHat,
  Bell,
  RotateCcw,
  Power,
  Check,
  X
} from 'lucide-react';

export const OrdersManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const selectedOrderIdRef = useRef<string | null>(null);

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

  // Status update state
  const [statusToUpdate, setStatusToUpdate] = useState<string>('NEW');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [showKOT, setShowKOT] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Kitchen capacity reached');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Keep ref in sync with selected order
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrder?.id || null;
    if (selectedOrder) {
      setStatusToUpdate(selectedOrder.status);
    }
  }, [selectedOrder?.id, selectedOrder?.status]);

  // One-Button Reset & Delete Orders state
  const isAuthorizedToReset = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'].includes(currentUser?.role || '');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  // Central Counter (Hasan) Menu Items Stock Control
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [menuItemsMap, setMenuItemsMap] = useState<Record<string, MenuItem>>({});
  const [showStockControl, setShowStockControl] = useState<boolean>(false);
  const [stockSearch, setStockSearch] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [stockUpdatingId, setStockUpdatingId] = useState<string | null>(null);

  // Manual Order Creation Modal
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualTable, setManualTable] = useState<string>('T17');
  const [manualType, setManualType] = useState<'DINE_IN' | 'PARCEL'>('DINE_IN');
  const [manualPayment, setManualPayment] = useState<string>('CASH');

  const fetchMenuItems = async () => {
    try {
      const list = await api.getMenuItems();
      setAllMenuItems(list);
      const map: Record<string, MenuItem> = {};
      list.forEach(m => { map[m.id] = m; });
      setMenuItemsMap(map);
    } catch (e) {
      console.error('Failed to load menu items in Central Counter', e);
    }
  };

  const handleToggleGlobalStock = async (menuItemId: string, newAvailability: boolean, itemName?: string) => {
    setStockUpdatingId(menuItemId);
    try {
      // Optimistic update
      setMenuItemsMap(prev => {
        const existing = prev[menuItemId];
        if (!existing) return prev;
        return { ...prev, [menuItemId]: { ...existing, isAvailable: newAvailability } };
      });
      setAllMenuItems(prev => prev.map(m => m.id === menuItemId ? { ...m, isAvailable: newAvailability } : m));

      await api.updateItemAvailability(menuItemId, newAvailability);
      setStatusFeedback(`Stock for "${itemName || 'Item'}" set to ${newAvailability ? 'AVAILABLE (ON)' : 'OUT OF STOCK (OFF)'} ✓`);
      setTimeout(() => setStatusFeedback(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Failed to update stock status');
      fetchMenuItems();
    } finally {
      setStockUpdatingId(null);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.getOrders();
      setOrders(res);

      // Check for unalerted pending orders and alert once
      res.forEach(o => {
        if (o.status === 'NEW' || o.status === 'UNDER REVIEW' || o.paymentStatus === 'PAYMENT DUE') {
          sound.playPendingOrderAlert(o.id);
        }
      });

      const targetId = selectedOrderIdRef.current;
      if (targetId) {
        const refreshed = res.find(o => o.id === targetId);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();

    const unsubCreated = realtime.on('order_created', (newOrder: Order) => {
      if (newOrder && (newOrder.status === 'NEW' || newOrder.status === 'UNDER REVIEW' || newOrder.paymentStatus === 'PAYMENT DUE')) {
        sound.playPendingOrderAlert(newOrder.id);
      } else {
        sound.playNewOrderChime();
      }
      fetchOrders();
    });

    const unsubUpdated = realtime.on('order_updated', () => {
      fetchOrders();
    });

    const unsubMenu = realtime.on('menu_item_updated', (updatedItem: MenuItem) => {
      setAllMenuItems(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
      setMenuItemsMap(prev => ({ ...prev, [updatedItem.id]: updatedItem }));
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubMenu();
    };
  }, []);

  const handleMarkStallCollected = async (orderId: string, stallId: string) => {
    try {
      const res = await api.markStallCollected(orderId, stallId, currentUser?.name || 'Central Counter Manager');
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === res.order.id ? res.order : o));
    } catch (e: any) {
      alert(e.message || 'Failed to mark stall collected');
    }
  };

  const handleCounterConfirm = async (orderId: string, stallId: string) => {
    try {
      const res = await api.confirmAndNotifyCustomer(orderId, stallId, currentUser?.name || 'Central Counter Manager');
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === res.order.id ? res.order : o));
    } catch (e: any) {
      alert(e.message || 'Failed to confirm customer notification');
    }
  };

  // Direct Status Update via OK / Confirm (keeps user on page without navigating or resetting)
  const handleConfirmStatusUpdate = async () => {
    if (!selectedOrder) return;
    setStatusUpdating(true);
    setStatusFeedback(null);
    try {
      const staffName = currentUser?.name || 'Manager';
      const updated = await api.updateOrderStatus(selectedOrder.id, statusToUpdate, '', staffName);
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setStatusFeedback(`Order #${updated.token} status updated to ${updated.status} ✓`);
      setTimeout(() => setStatusFeedback(null), 4000);
    } catch (e: any) {
      alert(e.message || 'Failed to update order status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // Actions
  const handleAccept = async (orderId: string) => {
    try {
      const updated = await api.acceptOrder(orderId, 'Central Counter Manager');
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (e) {
      alert('Failed to accept order');
    }
  };

  const handleReject = async (orderId: string) => {
    try {
      const updated = await api.rejectOrder(orderId, rejectReason);
      setSelectedOrder(updated);
      setShowRejectModal(false);
      fetchOrders();
    } catch (e) {
      alert('Failed to reject order');
    }
  };

  const handleMarkUnavailable = async (orderId: string, itemId: string) => {
    try {
      const updated = await api.markItemUnavailable(orderId, itemId, 'Ingredient depleted');
      setSelectedOrder(updated);
      fetchOrders();
    } catch (e) {
      alert('Failed to mark item unavailable');
    }
  };

  const handleConfirmCash = async (orderId: string) => {
    try {
      const updated = await api.processPayment(orderId, {
        paymentMethod: 'CASH',
        cashierName: 'Central Cashier (Hasan)'
      });
      sound.playPaymentSuccess();
      setSelectedOrder(updated);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    } catch (e) {
      alert('Failed to confirm cash');
    }
  };

  const handleCreateManualOrder = async () => {
    try {
      const newOrder = await api.createOrder({
        tableId: manualType === 'DINE_IN' ? manualTable : null,
        type: manualType,
        rawItems: [
          { menuItemId: 'cb-stk-1', quantity: 1, notes: 'Counter walk-in' },
          { menuItemId: 'mb-mom-1', quantity: 2, notes: 'Spicy dip' }
        ],
        customerName: 'Counter Walk-in',
        customerPhone: '01700000000',
        serviceType: 'SELF_SERVICE',
        customerNotes: 'Staff manual entry at counter',
        paymentMethod: manualPayment
      });
      setShowManualModal(false);
      fetchOrders();
      setSelectedOrder(newOrder);
    } catch (e: any) {
      alert(e.message || 'Failed to create manual order');
    }
  };

  const handleResetEverything = async () => {
    if (!isAuthorizedToReset) return;
    setResetting(true);
    try {
      const userPayload = { name: currentUser?.name || 'Cashier', role: currentUser?.role || 'CASHIER' };
      const res = await api.resetEverything(userPayload);
      setSelectedOrder(null);
      setResetFeedback(res.message || 'All orders deleted & revenue defaulted to ৳0.');
      setShowResetConfirm(false);
      setTimeout(() => setResetFeedback(null), 6000);
      fetchOrders();
    } catch (e: any) {
      alert(e.message || 'Failed to delete orders and reset metrics');
    } finally {
      setResetting(false);
    }
  };

  const isPendingOrder = (o: Order) => o.status === 'NEW' || o.status === 'UNDER REVIEW' || o.paymentStatus === 'PAYMENT DUE';
  const pendingOrders = orders.filter(isPendingOrder);
  const unseenPendingCount = orders.filter(o => isPendingOrder(o) && !seenOrderIds.has(o.id)).length;

  const filteredOrders = orders.filter(o => {
    // 1. Status Filter
    if (filterStatus === 'PENDING' && !isPendingOrder(o)) return false;
    if (filterStatus === 'NEW' && !(o.status === 'NEW' || o.status === 'UNDER REVIEW')) return false;
    if (filterStatus === 'PAYMENT DUE' && o.paymentStatus !== 'PAYMENT DUE') return false;
    if (filterStatus === 'PREPARING' && o.status !== 'PREPARING') return false;
    if (filterStatus === 'READY' && o.status !== 'READY') return false;
    if (filterStatus === 'COMPLETED' && !(o.status === 'DELIVERED' || o.status === 'COMPLETED')) return false;

    // 2. Search Filter (token, customer name, phone, table)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchToken = o.token && o.token.toLowerCase().includes(q);
      const matchName = o.customerName && o.customerName.toLowerCase().includes(q);
      const matchPhone = o.customerPhone && o.customerPhone.includes(q);
      const matchTable = o.tableId && o.tableId.toLowerCase().includes(q);
      return matchToken || matchName || matchPhone || matchTable;
    }

    return true;
  });

  const outOfStockDishes = allMenuItems.filter(m => m.isAvailable === false);

  const filteredStockDishes = allMenuItems.filter(m => {
    if (stockFilter === 'OUT_OF_STOCK' && m.isAvailable !== false) return false;
    if (stockFilter === 'IN_STOCK' && m.isAvailable === false) return false;
    if (stockSearch.trim()) {
      const q = stockSearch.toLowerCase().trim();
      return m.name.toLowerCase().includes(q) || (m.category && m.category.toLowerCase().includes(q)) || (m.stallId && m.stallId.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      {/* Top Header: CENTRAL PAYMENT & ORDER RELEASE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight uppercase">
            Central Payment &amp; Order Release
          </h1>
          <p className="text-xs text-zinc-500">
            Accept master orders, confirm central payment, release food to kitchen stalls, and track stall preparation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Central Counter Stock Control Toggle Button */}
          <button
            type="button"
            onClick={() => setShowStockControl(prev => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              showStockControl
                ? 'bg-zinc-900 text-white ring-2 ring-zinc-700'
                : outOfStockDishes.length > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                : 'bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800'
            }`}
            title="Manage all menu dish availability and stock"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Stock Control ({outOfStockDishes.length} Out)</span>
          </button>

          {isAuthorizedToReset && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Delete all orders & reset revenue to ৳0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>⚡ One-Click Reset All &amp; Delete Orders</span>
            </button>
          )}

          <button
            onClick={() => setShowManualModal(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 self-start cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Counter Order</span>
          </button>
        </div>
      </div>

      {/* Central Counter Stock Availability Control Drawer / Panel */}
      {showStockControl && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-brand-600" />
                <span>Central Counter Food Stock Control (Hasan)</span>
              </h2>
              <p className="text-xs text-zinc-500">
                Switch dishes ON (Available) or OFF (Stock Out). Updates sync live to customer menus and stall dashboards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                outOfStockDishes.length > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {outOfStockDishes.length} Dishes Out of Stock
              </span>
              <button
                type="button"
                onClick={() => setShowStockControl(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search food item (e.g. Steak, Burger, Momo)..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockFilter === 'ALL' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All ({allMenuItems.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('OUT_OF_STOCK')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockFilter === 'OUT_OF_STOCK' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                Out of Stock ({outOfStockDishes.length})
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stockFilter === 'IN_STOCK' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Available ({allMenuItems.length - outOfStockDishes.length})
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 pr-1">
            {filteredStockDishes.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-6">No matching dishes found.</p>
            ) : (
              filteredStockDishes.map((m) => {
                const isAvail = m.isAvailable !== false;
                return (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-black text-zinc-900 truncate">{m.name}</strong>
                        <span className="text-[10px] text-zinc-400 uppercase font-semibold">({m.category})</span>
                      </div>
                      <span className="text-[11px] font-bold text-brand-600">৳{m.price}</span>
                    </div>

                    <button
                      type="button"
                      disabled={stockUpdatingId === m.id}
                      onClick={() => handleToggleGlobalStock(m.id, !isAvail, m.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        isAvail
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                          : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                      }`}
                      title={`Click to switch ${isAvail ? 'OFF (Stock Out)' : 'ON (Available)'}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-500 animate-pulse' : 'bg-white'}`} />
                      <span>{isAvail ? 'Available (ON)' : 'Stock Out (OFF)'}</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Status Feedback Notification */}
      {statusFeedback && (
        <div className="p-3.5 rounded-2xl bg-zinc-900 text-white text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in">
          <span>{statusFeedback}</span>
          <button onClick={() => setStatusFeedback(null)} className="text-zinc-400 hover:text-white font-black cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Reset Feedback Notification */}
      {resetFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{resetFeedback}</span>
          <button onClick={() => setResetFeedback(null)} className="text-emerald-700 hover:text-emerald-950 font-black cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Search Bar & Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token, guest, table..."
            className="w-full pl-9 pr-7 py-2 bg-white border border-zinc-200 rounded-2xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'PENDING', label: `Pending (${pendingOrders.length})`, hasDot: unseenPendingCount > 0 },
            { key: 'ALL', label: `All (${orders.length})` },
            { key: 'NEW', label: `New Review (${orders.filter(o => o.status === 'NEW').length})` },
            { key: 'PAYMENT DUE', label: `Cash Due (${orders.filter(o => o.paymentStatus === 'PAYMENT DUE').length})` },
            { key: 'PREPARING', label: `Kitchen (${orders.filter(o => o.status === 'PREPARING').length})` },
            { key: 'READY', label: `Ready (${orders.filter(o => o.status === 'READY').length})` },
            { key: 'COMPLETED', label: `Completed` }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === tab.key
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.hasDot && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Split View: Orders List on Left, Selected Order Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orders Column */}
        <div className="lg:col-span-5 space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 text-xs text-zinc-400">
              No orders found in this status queue.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => {
                    setSelectedOrder(order);
                    markOrderAsSeen(order.id);
                  }}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-brand-50/40 border-brand-500 shadow-sm ring-1 ring-brand-500'
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="w-8 h-8 rounded-xl bg-zinc-900 text-white font-black text-xs flex items-center justify-center">
                          #{order.token}
                        </span>
                        {isPendingOrder(order) && !seenOrderIds.has(order.id) && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" title="New Unseen Pending Order" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-zinc-900">
                            {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markOrderAsSeen(order.id);
                              setSelectedOrder(order);
                              setShowKOT(true);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-black text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Print Kitchen Order Ticket"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>PRINT KOT</span>
                          </button>
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        order.status === 'NEW'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : order.paymentStatus === 'PAYMENT DUE'
                          ? 'bg-amber-100 text-amber-800'
                          : order.status === 'PREPARING'
                          ? 'bg-orange-100 text-orange-800'
                          : order.status === 'READY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}>
                        {order.status === 'NEW' ? 'NEW ORDER' : order.status}
                      </span>
                      <div className="text-xs font-black text-brand-600 mt-1">
                        ৳ {order.grandTotal}
                      </div>
                      <div className="flex flex-col items-end gap-1 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          (order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL')
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}>
                          {order.orderTypeDescription || ((order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL') ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                          order.serviceType === 'TABLE_SERVICE'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          Service: {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stalls Pill */}
                  <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] text-zinc-500 pt-1">
                    <Store className="w-3 h-3 text-brand-500 shrink-0" />
                    <span className="truncate">
                      {order.stalls.map(s => s.stallName).join(', ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Order Detailed Review Inspector */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm space-y-5 sticky top-20">
              {/* Top Banner */}
              <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-zinc-900">
                      Token #{selectedOrder.token}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-bold uppercase">
                      {selectedOrder.tableId ? `Table ${selectedOrder.tableId}` : 'Parcel'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    Order ID: {selectedOrder.id}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isPendingOrder(selectedOrder) && !seenOrderIds.has(selectedOrder.id) && (
                    <button
                      onClick={() => markOrderAsSeen(selectedOrder.id)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span>Acknowledge</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      markOrderAsSeen(selectedOrder.id);
                      setShowKOT(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    title="Print Kitchen Order Ticket"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>PRINT KOT</span>
                  </button>
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="Print Receipt"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>

              {/* Status & Payment Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-zinc-50 rounded-2xl text-xs">
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Order Status</span>
                  <strong className="text-zinc-900 font-black">{selectedOrder.status}</strong>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Payment Status</span>
                  <strong className={`font-black ${
                    selectedOrder.paymentStatus === 'PAID' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Order &amp; Service</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block border ${
                      (selectedOrder.customerOrderType === 'TAKEAWAY' || selectedOrder.type === 'PARCEL')
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300'
                    }`}>
                      {selectedOrder.orderTypeDescription || ((selectedOrder.customerOrderType === 'TAKEAWAY' || selectedOrder.type === 'PARCEL') ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block border ${
                      selectedOrder.serviceType === 'TABLE_SERVICE'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}>
                      Service: {selectedOrder.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10px] uppercase font-bold block">Customer</span>
                  <strong className="text-zinc-900 font-bold block truncate">
                    {selectedOrder.customerName || 'Walk-in Guest'}
                  </strong>
                  {selectedOrder.customerPhone && (
                    <span className="text-zinc-500 text-[10px] block">{selectedOrder.customerPhone}</span>
                  )}
                </div>
              </div>

              {/* Items List with Availability Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                    Order Items Breakdown &amp; Stock Status
                  </h3>
                  <span className="text-[10px] text-zinc-400">
                    Hasan Stock Control: Toggle Available / Stock Out
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedOrder.items.map((item) => {
                    const menuItem = menuItemsMap[item.menuItemId];
                    const isGlobalAvailable = menuItem ? menuItem.isAvailable !== false : true;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors ${
                          item.isUnavailable || !isGlobalAvailable
                            ? 'bg-red-50/70 border-red-200 text-red-900'
                            : 'bg-white border-zinc-200 text-zinc-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-brand-600">[{item.quantity}x]</span>
                            <span className="truncate">{item.name}</span>
                            {!isGlobalAvailable && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs">
                                Stock Out (Global)
                              </span>
                            )}
                            {item.isUnavailable && isGlobalAvailable && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-600 text-white">
                                Order Unavailable
                              </span>
                            )}
                          </div>
                          {item.variantName && (
                            <p className="text-[11px] text-zinc-500 font-medium">
                              Portion: <strong className="text-zinc-700">{item.variantName}</strong>
                            </p>
                          )}
                          {((item.addOnNames && item.addOnNames.length > 0) || (item.customizations && item.customizations.length > 0)) && (
                            <p className="text-[11px] text-brand-700 font-semibold mt-0.5">
                              Add-ons: {(item.addOnNames || item.customizations?.map((c: any) => c.name))?.join(', ')}
                            </p>
                          )}
                          {item.notes && <p className="text-[11px] text-zinc-500 italic mt-0.5">"{item.notes}"</p>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span className="font-black text-xs sm:text-sm">৳ {item.price * item.quantity}</span>
                          
                          {/* Central Counter Stock Availability Toggle */}
                          <button
                            type="button"
                            disabled={stockUpdatingId === item.menuItemId}
                            onClick={() => handleToggleGlobalStock(item.menuItemId, !isGlobalAvailable, item.name)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                              isGlobalAvailable
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                            }`}
                            title={`Click to switch ${isGlobalAvailable ? 'OFF (Mark Stock Out)' : 'ON (Mark Available)'}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isGlobalAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-white'}`} />
                            <span>{isGlobalAvailable ? 'Stock: Available (ON)' : 'Stock: Stock Out (OFF)'}</span>
                          </button>

                          {/* Existing Per-Order Mark Unavailable */}
                          {!item.isUnavailable && (
                            <button
                              onClick={() => handleMarkUnavailable(selectedOrder.id, item.id)}
                              className="px-2 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-[10px] font-bold cursor-pointer"
                              title="Mark out of stock for this specific order"
                            >
                              Per-Order Note
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grand Total */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
                <span className="text-xs font-bold text-zinc-500">Order Grand Total:</span>
                <span className="text-xl font-black text-brand-600">৳ {selectedOrder.grandTotal}</span>
              </div>

              {/* Multi-Stall Kitchen & Counter Confirmation Panel */}
              {selectedOrder.stalls && selectedOrder.stalls.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-zinc-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-brand-600" />
                      <span>Stall Kitchens &amp; Counter Status</span>
                    </h3>
                    <span className="text-[10px] text-zinc-400">
                      {selectedOrder.stalls.length} Stalls
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedOrder.stalls.map((stall) => (
                      <div
                        key={stall.stallId}
                        className={`p-3 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
                          stall.status === 'READY'
                            ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
                            : stall.status === 'NOTIFIED'
                            ? 'bg-emerald-50/80 border-emerald-300'
                            : stall.status === 'COLLECTED'
                            ? 'bg-blue-50/50 border-blue-200 text-zinc-600'
                            : stall.status === 'PREPARING'
                            ? 'bg-orange-50/50 border-orange-200'
                            : 'bg-zinc-50 border-zinc-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-zinc-900">{stall.stallName}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                stall.status === 'READY'
                                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                                  : stall.status === 'NOTIFIED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : stall.status === 'COLLECTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : stall.status === 'PREPARING'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {stall.status === 'READY' ? 'Kitchen Ready (Awaiting Counter)' : stall.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {stall.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                          </p>
                        </div>

                        {/* Action buttons per stall */}
                        <div className="flex items-center gap-2 shrink-0">
                          {stall.status === 'READY' && (
                            <button
                              onClick={() => handleCounterConfirm(selectedOrder.id, stall.stallId)}
                              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Counter rings bell and notifies customer that this stall's food is ready"
                            >
                              <Bell className="w-3.5 h-3.5 animate-bounce" />
                              <span>NOTIFY GUEST</span>
                            </button>
                          )}

                          {stall.status === 'NOTIFIED' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-lg">
                                Attempt #{stall.notificationCount || 1}
                              </span>
                              <button
                                onClick={() => handleCounterConfirm(selectedOrder.id, stall.stallId)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Send repeat reminder and ring alarm again"
                              >
                                <Bell className="w-3.5 h-3.5 animate-bounce" />
                                <span>CALL AGAIN</span>
                              </button>
                              <button
                                onClick={() => handleMarkStallCollected(selectedOrder.id, stall.stallId)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                                title="Customer has picked up food from pickup counter"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Mark Collected</span>
                              </button>
                            </div>
                          )}

                          {stall.status === 'COLLECTED' && (
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                              Collected ✓
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pipeline Decision Buttons */}
              <div className="space-y-2 pt-2">
                {/* Cashier: Confirm Cash Received */}
                {selectedOrder.paymentStatus === 'PAYMENT DUE' && (
                  <button
                    onClick={() => handleConfirmCash(selectedOrder.id)}
                    className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Banknote className="w-4 h-4" />
                    <span>CONFIRM CASH RECEIVED &amp; RELEASE TO KITCHEN</span>
                  </button>
                )}

                {/* Manager: Accept or Reject Order */}
                {(selectedOrder.status === 'NEW' || selectedOrder.status === 'UNDER REVIEW') && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleAccept(selectedOrder.id)}
                      className="py-3 px-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Accept Order</span>
                    </button>

                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="py-3 px-4 rounded-2xl bg-zinc-100 hover:bg-red-50 text-red-600 border border-zinc-200 hover:border-red-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Order</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Manager: Direct Status Override (stays on page, no navigation/reset) */}
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Override Order Status</h4>
                <div className="flex items-center gap-2">
                  <select
                    value={statusToUpdate}
                    onChange={(e) => setStatusToUpdate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white cursor-pointer"
                  >
                    {['NEW','ACCEPTED','PAYMENT DUE','PREPARING','READY','OUT FOR DELIVERY','DELIVERED','COMPLETED','CANCELLED'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleConfirmStatusUpdate}
                    disabled={statusUpdating}
                    className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{statusUpdating ? 'Updating…' : 'OK / Confirm'}</span>
                  </button>
                </div>
                {statusFeedback && (
                  <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">{statusFeedback}</p>
                )}
              </div>
            </div>

          ) : (
            <div className="bg-white rounded-3xl p-12 border border-zinc-200 text-center text-zinc-400 space-y-2">
              <ChefHat className="w-10 h-10 mx-auto text-zinc-300" />
              <h3 className="text-sm font-bold text-zinc-600">Select an Order</h3>
              <p className="text-xs">Select any order from the left feed to inspect, accept, or confirm cash payment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-black text-zinc-900">Reject Order #{selectedOrder.token}?</h3>
            <p className="text-xs text-zinc-500">Provide a reason to notify the customer:</p>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl text-xs text-zinc-800"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedOrder.id)}
                className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Order Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <h3 className="text-sm font-black text-zinc-900 uppercase">Create Manual Counter Order</h3>
              <button onClick={() => setShowManualModal(false)} className="text-zinc-400 text-sm">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualType('DINE_IN')}
                    className={`py-2 rounded-xl font-bold border ${manualType === 'DINE_IN' ? 'bg-brand-500 text-white border-brand-500' : 'border-zinc-200'}`}
                  >
                    Dine-in (Table)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualType('PARCEL')}
                    className={`py-2 rounded-xl font-bold border ${manualType === 'PARCEL' ? 'bg-brand-500 text-white border-brand-500' : 'border-zinc-200'}`}
                  >
                    Takeaway / Parcel
                  </button>
                </div>
              </div>

              {manualType === 'DINE_IN' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Select Table (T01 - T55)</label>
                  <input
                    type="text"
                    value={manualTable}
                    onChange={(e) => setManualTable(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-xl font-black"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">Payment Method</label>
                <select
                  value={manualPayment}
                  onChange={(e) => setManualPayment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                >
                  <option value="CASH">Cash at Counter</option>
                  <option value="bKash">bKash</option>
                  <option value="Online Card">Card POS</option>
                </select>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl text-zinc-600">
                Sample items (T Bone Steak 1x + Chicken Momo 2x) will be pre-added for immediate verification.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManualOrder}
                className="px-5 py-2 bg-brand-500 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Click Reset All & Delete Orders Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">
                  Delete All Orders &amp; Reset to ৳0?
                </h3>
                <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Authorized Role: {currentUser?.role || 'Staff'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-50 rounded-2xl text-xs text-zinc-600 space-y-2 border border-zinc-100">
              <p className="font-bold text-red-600">
                This will delete ALL orders from the database, clear runner tasks, free all 55 tables to AVAILABLE, and reset all Daily, Monthly, and Yearly revenue cards to ৳0.
              </p>
              <p className="text-[11px] text-zinc-500">
                This action is available for Counter Cashier, Food Court Manager, and Chief Administrator.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                disabled={resetting}
                className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetEverything}
                disabled={resetting}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Yes, Delete & Default ৳0'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KOT and Receipt Modals */}
      {showReceipt && selectedOrder && (
        <ReceiptModal order={selectedOrder} onClose={() => setShowReceipt(false)} />
      )}
      {showKOT && selectedOrder && (
        <KOTPrintView order={selectedOrder} onClose={() => setShowKOT(false)} />
      )}
    </div>
  );
};
