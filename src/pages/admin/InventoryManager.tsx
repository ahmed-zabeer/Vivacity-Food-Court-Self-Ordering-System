import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'wouter';
import { InventoryMenuItem, Stall } from '../../types';
import {
  Package,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Clock,
  Store,
  Layers,
  ChefHat,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ShieldAlert
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  const isStallManager = currentUser.role === 'STALL MANAGER';
  const assignedStallId = currentUser.stallId || null;

  const [items, setItems] = useState<InventoryMenuItem[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStall, setSelectedStall] = useState<string>(
    isStallManager && assignedStallId ? assignedStallId : 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW' | 'STOCK_OUT'>('ALL');

  // Inline editing state: { [itemId]: string (input value) }
  const [editingStock, setEditingStock] = useState<{ [id: string]: string }>({});
  const [savingItem, setSavingItem] = useState<{ [id: string]: boolean }>({});
  const [feedback, setFeedback] = useState<{ [id: string]: string }>({});

  const userContext = useMemo(
    () => ({
      name: currentUser.name,
      role: currentUser.role,
      stallId: currentUser.stallId || null
    }),
    [currentUser.name, currentUser.role, currentUser.stallId]
  );

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const stallFilter = selectedStall !== 'ALL' ? selectedStall : undefined;
      const [invData, stallData] = await Promise.all([
        api.getInventory(stallFilter),
        api.getStalls()
      ]);
      setItems(invData);
      setStalls(stallData);
    } catch (e) {
      console.error('Error fetching inventory:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedStall]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Real-time listener for stock/menu changes
  useEffect(() => {
    const unsubInv = realtime.on('inventory_updated', () => {
      fetchInventory();
    });
    const unsubMenu = realtime.on('menu_item_updated', () => {
      fetchInventory();
    });
    return () => {
      unsubInv();
      unsubMenu();
    };
  }, [fetchInventory]);

  // Check if current user can edit this item
  const canEditItem = (item: InventoryMenuItem) => {
    if (['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'].includes(currentUser.role)) {
      return true;
    }
    if (currentUser.role === 'STALL MANAGER' || currentUser.role === 'KITCHEN STAFF') {
      return !assignedStallId || item.stallId === assignedStallId;
    }
    return false;
  };

  const handleStockSave = async (item: InventoryMenuItem) => {
    const rawVal = editingStock[item.id];
    if (rawVal === undefined || rawVal === '') return;
    const qty = parseInt(rawVal, 10);
    if (isNaN(qty) || qty < 0) {
      setFeedback({ ...feedback, [item.id]: 'Invalid number' });
      return;
    }
    setSavingItem({ ...savingItem, [item.id]: true });
    try {
      await api.setItemStock(item.id, qty, userContext);
      setFeedback({ ...feedback, [item.id]: `Saved (${qty})` });
      setTimeout(() => {
        setFeedback(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }, 2000);
      await fetchInventory();
    } catch (err: any) {
      setFeedback({ ...feedback, [item.id]: err.message || 'Error' });
    } finally {
      setSavingItem({ ...savingItem, [item.id]: false });
    }
  };

  const handleToggleAvailability = async (item: InventoryMenuItem) => {
    const nextAvail = item.inv?.manuallyDisabled; // if currently disabled, next is available (true)
    try {
      await api.setItemManualAvailability(item.id, !!nextAvail, userContext);
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to update availability');
    }
  };

  const handleResetStock = async (item: InventoryMenuItem) => {
    if (!window.confirm(`Reset prepared stock tracking for "${item.name}"?`)) return;
    try {
      await api.resetItemStock(item.id, userContext);
      await fetchInventory();
    } catch (err: any) {
      alert(err.message || 'Failed to reset stock');
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (selectedStall !== 'ALL' && item.stallId !== selectedStall) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesStall = item.stallName.toLowerCase().includes(q);
        const matchesCategory = item.category.toLowerCase().includes(q);
        if (!matchesName && !matchesStall && !matchesCategory) return false;
      }
      if (statusFilter === 'STOCK_OUT') {
        if (!item.inv?.stockOut && item.isAvailable !== false) return false;
      } else if (statusFilter === 'LOW') {
        if (
          item.inv?.available === null ||
          item.inv?.available <= 0 ||
          item.inv?.available > 5
        ) {
          return false;
        }
      } else if (statusFilter === 'IN_STOCK') {
        if (item.inv?.stockOut || item.isAvailable === false) return false;
      }
      return true;
    });
  }, [items, selectedStall, searchQuery, statusFilter]);

  // Inventory Totals
  const stats = useMemo(() => {
    let totalItems = items.length;
    let stockOutCount = 0;
    let lowStockCount = 0;
    let totalSold = 0;
    let totalPrepared = 0;

    for (const item of items) {
      if (item.inv?.stockOut || item.isAvailable === false) {
        stockOutCount++;
      } else if (item.inv?.available !== null && item.inv?.available <= 5) {
        lowStockCount++;
      }
      if (item.inv?.soldQty) totalSold += item.inv.soldQty;
      if (item.inv?.preparedQty) totalPrepared += item.inv.preparedQty;
    }
    return { totalItems, stockOutCount, lowStockCount, totalSold, totalPrepared };
  }, [items]);

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
                Central Food Inventory
              </span>
              <span className="text-[10px] font-bold text-zinc-400">All {stalls.length > 0 ? stalls.length : 7} Stalls Tracked</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-brand-600" />
              <span>Real-Time Kitchen Stock & Portion Manager</span>
            </h1>
          </div>
        </div>

        <button
          onClick={fetchInventory}
          className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-xl flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Stock Status</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Total Menu Items
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 mt-0.5">
            {stats.totalItems}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1">Across {stalls.length > 0 ? stalls.length : 7} Partner Stalls</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-rose-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
            Stock Out (Sold Out)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-rose-600 mt-0.5">
            {stats.stockOutCount}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1">Currently unavailable to guests</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
            Low Stock Alerts
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5">
            {stats.lowStockCount}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1">≤ 5 portions remaining</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-emerald-100 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
            Portions Sold Today
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5">
            {stats.totalSold}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-1">Committed kitchen orders</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Stall Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          <button
            onClick={() => setSelectedStall('ALL')}
            disabled={isStallManager && !!assignedStallId}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all ${
              selectedStall === 'ALL'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            All Stalls
          </button>
          {stalls.map(s => {
            const isAssigned = !isStallManager || !assignedStallId || assignedStallId === s.id;
            if (!isAssigned) return null;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStall(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all ${
                  selectedStall === s.id
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Search & Stock Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search dish or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-xl text-xs focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="py-2 px-3 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW">Low Stock (≤5)</option>
            <option value="STOCK_OUT">Stock Out (0)</option>
          </select>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Showing {filteredItems.length} dishes</span>
          <span className="text-[11px] font-semibold">
            Portions deduct automatically upon kitchen release; reservations held upon order placement.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-600 font-black uppercase text-[10px] border-b border-zinc-200">
              <tr>
                <th className="py-3 px-3">Stall</th>
                <th className="py-3 px-3">Food Item Name</th>
                <th className="py-3 px-3 text-center">Prepared</th>
                <th className="py-3 px-3 text-center">Sold</th>
                <th className="py-3 px-3 text-center">Reserved</th>
                <th className="py-3 px-3 text-center">Available Portions</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3">Last Updated</th>
                <th className="py-3 px-3 text-right">Chef Stock Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.map(item => {
                const inv = item.inv || {
                  preparedQty: null,
                  soldQty: 0,
                  reservedQty: 0,
                  available: null,
                  stockOut: false,
                  manuallyDisabled: false,
                  lastUpdatedAt: null,
                  updatedBy: null
                };

                const isOut = inv.stockOut || item.isAvailable === false;
                const isLow =
                  !isOut && inv.available !== null && inv.available <= 5 && inv.available > 0;
                const canEdit = canEditItem(item);

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-zinc-50/50 transition-colors ${
                      isOut ? 'bg-red-50/20' : ''
                    }`}
                  >
                    {/* Stall */}
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-zinc-800 text-[11px] block">
                        {item.stallName}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {item.category}
                      </span>
                    </td>

                    {/* Food Name */}
                    <td className="py-3 px-3">
                      <div className="font-black text-zinc-900 text-xs">{item.name}</div>
                      <div className="text-[10px] text-brand-600 font-bold">
                        ৳{item.price.toLocaleString()}
                      </div>
                    </td>

                    {/* Prepared */}
                    <td className="py-3 px-3 text-center font-bold text-zinc-700">
                      {inv.preparedQty !== null ? inv.preparedQty : '∞'}
                    </td>

                    {/* Sold */}
                    <td className="py-3 px-3 text-center font-semibold text-zinc-600">
                      {inv.soldQty || 0}
                    </td>

                    {/* Reserved */}
                    <td className="py-3 px-3 text-center font-semibold text-amber-600">
                      {inv.reservedQty || 0}
                    </td>

                    {/* Remaining Available */}
                    <td className="py-3 px-3 text-center">
                      {inv.available !== null ? (
                        <span
                          className={`font-black text-sm ${
                            inv.available === 0
                              ? 'text-red-600'
                              : inv.available <= 5
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {inv.available}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-bold">Unlimited</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center">
                      {inv.manuallyDisabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-200 text-zinc-800">
                          Disabled
                        </span>
                      ) : isOut ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-300 animate-pulse">
                          Stock Out
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                          Low: {inv.available} left
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                          Available
                        </span>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 px-3 text-[10px] text-zinc-500">
                      {inv.lastUpdatedAt ? (
                        <div>
                          <div>
                            {new Date(inv.lastUpdatedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-zinc-400">by {inv.updatedBy || 'Chef'}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* Chef Controls */}
                    <td className="py-3 px-3 text-right">
                      {canEdit ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stock Quantity Input */}
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              placeholder={inv.preparedQty !== null ? `${inv.preparedQty}` : 'Set'}
                              value={
                                editingStock[item.id] !== undefined
                                  ? editingStock[item.id]
                                  : inv.preparedQty !== null
                                  ? inv.preparedQty
                                  : ''
                              }
                              onChange={e =>
                                setEditingStock({ ...editingStock, [item.id]: e.target.value })
                              }
                              className="w-16 p-1.5 border border-zinc-200 rounded-l-lg text-center font-bold text-xs focus:ring-1 focus:ring-brand-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleStockSave(item)}
                              disabled={savingItem[item.id]}
                              className="px-2 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-r-lg font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                              title="Save Stock Count"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Manual Availability Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(item)}
                            className={`p-1.5 rounded-lg border text-[10px] font-bold transition-colors cursor-pointer ${
                              item.isAvailable === false
                                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                            }`}
                            title={
                              item.isAvailable === false
                                ? 'Click to make Available'
                                : 'Click to make Unavailable'
                            }
                          >
                            {item.isAvailable === false ? 'Enable' : 'Disable'}
                          </button>

                          {/* Reset */}
                          {inv.preparedQty !== null && (
                            <button
                              type="button"
                              onClick={() => handleResetStock(item)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
                              title="Reset Stock to Unlimited"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">View Only</span>
                      )}
                      {feedback[item.id] && (
                        <div className="text-[9px] text-emerald-600 font-bold mt-1 text-right">
                          {feedback[item.id]}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-zinc-400">
                    No menu items matched your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
