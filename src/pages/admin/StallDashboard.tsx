import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import { Order, Stall, MenuItem } from '../../types';
import { useRoute, useLocation } from 'wouter';
import { Store, Clock, CheckCircle2, XCircle, ChefHat, Filter, Flame, Bell, Printer } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { KOTPrintView } from '../../components/common/KOTPrintView';

export const StallDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [, params] = useRoute<{ slug: string }>('/stall/:slug/dashboard');
  const [, setLocation] = useLocation();

  // If user is a STALL MANAGER with an assigned stall, strictly lock them to their stall
  const isStallManager = currentUser?.role === 'STALL MANAGER';
  const assignedStallId = isStallManager && currentUser?.stallId ? currentUser.stallId : null;
  const requestedSlug = params ? params.slug : (assignedStallId || 'fusion-cafe');
  const effectiveSlug = assignedStallId || requestedSlug;

  // Enforce frontend route lock: if a stall manager navigates to another stall slug, bounce them back immediately
  useEffect(() => {
    if (assignedStallId && params?.slug && params.slug !== assignedStallId) {
      setLocation(`/stall/${assignedStallId}/dashboard`, { replace: true });
    }
  }, [assignedStallId, params?.slug, setLocation]);

  const [stall, setStall] = useState<Stall | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stallItems, setStallItems] = useState<MenuItem[]>([]);
  const [filterTab, setFilterTab] = useState<string>('PREPARING');
  const [loading, setLoading] = useState(true);
  const [kotOrder, setKOTOrder] = useState<Order | null>(null);

  const fetchStallData = async () => {
    try {
      const [stallRes, ordersRes, menuRes] = await Promise.all([
        api.getStall(effectiveSlug),
        api.getOrders({ stallId: effectiveSlug, role: currentUser?.role, userStallId: currentUser?.stallId }),
        api.getMenuItems({ stallId: effectiveSlug })
      ]);
      setStall(stallRes);
      setOrders(ordersRes);
      setStallItems(menuRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStallData();

    const unsub = realtime.on('order_updated', () => {
      fetchStallData();
    });

    const unsubMenu = realtime.on('menu_item_updated', (updatedItem: MenuItem) => {
      setStallItems(prev => prev.map(m => m.id === updatedItem.id ? updatedItem : m));
    });

    return () => {
      unsub();
      unsubMenu();
    };
  }, [effectiveSlug]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (!stall) return;
    try {
      await api.updateStallStatus(orderId, stall.id, status, undefined, currentUser?.role, currentUser?.stallId);
      if (status === 'READY') sound.playKitchenBell();
      fetchStallData();
    } catch (e: any) {
      alert(e.message || 'Failed to update stall status');
    }
  };

  const handleStartPrep = async (orderId: string) => {
    if (!stall) return;
    try {
      await api.startPreparingStall(orderId, stall.id, `${stall.name} Kitchen`, currentUser?.role, currentUser?.stallId);
      fetchStallData();
    } catch (e: any) {
      alert(e.message || 'Failed to start preparing');
    }
  };

  const handleMarkReady = async (orderId: string) => {
    if (!stall) return;
    try {
      await api.markStallReady(orderId, stall.id, `${stall.name} Kitchen`, currentUser?.role, currentUser?.stallId);
      sound.playKitchenBell();
      fetchStallData();
    } catch (e: any) {
      alert(e.message || 'Failed to mark ready');
    }
  };

  const handleNotifyGuest = async (orderId: string) => {
    if (!stall) return;
    try {
      const staffName = currentUser?.name || `${stall.name} Manager`;
      await api.notifyGuestStall(orderId, stall.id, staffName, currentUser?.role, currentUser?.stallId || stall.id);
      sound.playKitchenBell();
      fetchStallData();
    } catch (e: any) {
      alert(e.message || 'Failed to notify guest');
    }
  };

  const handleMarkCollected = async (orderId: string) => {
    if (!stall) return;
    try {
      const staffName = currentUser?.name || `${stall.name} Staff`;
      await api.markStallCollected(orderId, stall.id, staffName, currentUser?.role, currentUser?.stallId);
      sound.playSuccessChime();
      fetchStallData();
    } catch (e: any) {
      alert(e.message || 'Failed to mark food collected');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-zinc-400">Loading Stall Dashboard...</div>;
  }

  if (!stall) {
    return (
      <div className="p-8 text-center">
        <h2>Stall not found</h2>
        <button onClick={() => setLocation('/')} className="mt-3 px-4 py-2 bg-brand-500 text-white rounded-full text-xs">
          Return Home
        </button>
      </div>
    );
  }

  // Extract only this stall's sub-orders
  const stallOrders = orders
    .map(order => {
      const sub = order.stalls.find(s => s.stallId === stall.id);
      return sub ? { ...order, stallSubOrder: sub } : null;
    })
    .filter(Boolean) as (Order & { stallSubOrder: any })[];

  // Dedicated Ready & Uncollected Orders for this stall
  const readyOrders = stallOrders.filter(o => o.stallSubOrder.status === 'READY' || o.stallSubOrder.status === 'NOTIFIED');

  const filtered = stallOrders.filter(o => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'READY') return o.stallSubOrder.status === 'READY' || o.stallSubOrder.status === 'NOTIFIED';
    return o.stallSubOrder.status === filterTab;
  });

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      {/* Stall Station Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black text-sm">
            <Store className="w-6 h-6 text-brand-500" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 block">
              Dedicated Merchant Dashboard
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              {stall.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xs text-zinc-400">
                Station {stall.badge} • Strict isolated items queue
              </span>
              {stallItems.length > 0 && (
                stallItems.filter(i => !i.isAvailable).length === 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                    All Dishes In Stock ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 animate-pulse">
                    {stallItems.filter(i => !i.isAvailable).length} Dishes Sold Out (Central Counter)
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        {/* Quick Switch to Other Stalls - Only visible to Central Admin / Super Admin / Cashier / Central Staff */}
        {!isStallManager && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'fusion-cafe', label: 'Coffee Buzz' },
              { id: 'top-town', label: 'Top Town' },
              { id: 'momo-buzz', label: 'Momo Buzz' },
              { id: 'waffle-city', label: 'Waffle City' },
              { id: 'live-station', label: 'Live Station' },
              { id: 'burger-bar', label: 'Burger Bar' },
              { id: 'drinks-beverage', label: 'Drinks & Beverage' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setLocation(`/stall/${s.id}/dashboard`)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                  s.id === stall.id ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Direct Guest Notification Queue for Ready Food */}
      {readyOrders.length > 0 && (
        <section className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white rounded-3xl p-5 border-2 border-amber-400/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/60">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-[#e06d24] text-white flex items-center justify-center shadow-md animate-bounce">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-zinc-900 uppercase tracking-tight">
                  Ready Food — Direct Guest Notification Queue
                </h2>
                <p className="text-[11px] text-zinc-600 font-medium">
                  Food is prepared and ready at {stall.name}. Trigger customer's repeating alarm directly from this dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-200">
                {readyOrders.filter(o => o.stallSubOrder.status === 'READY').length} Awaiting Notification
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black border border-emerald-200">
                {readyOrders.filter(o => o.stallSubOrder.status === 'NOTIFIED').length} Notified (Awaiting Pickup)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {readyOrders.map((order) => {
              const sub = order.stallSubOrder;
              const isNotified = sub.status === 'NOTIFIED';

              return (
                <div
                  key={`ready-section-${order.id}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                    !isNotified
                      ? 'bg-white border-amber-400 ring-2 ring-amber-300/60'
                      : 'bg-emerald-50/70 border-emerald-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-zinc-900">
                            TOKEN #{order.token}
                          </span>
                          <button
                            type="button"
                            onClick={() => setKOTOrder(order)}
                            className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-black text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            title="Print Kitchen Order Ticket"
                          >
                            <Printer className="w-3.5 h-3.5 text-amber-400" />
                            <span>PRINT KOT</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-black uppercase">
                            {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            (order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL')
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}>
                            {order.orderTypeDescription || ((order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL') ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining')}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            order.serviceType === 'TABLE_SERVICE'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          !isNotified
                            ? 'bg-amber-200 text-amber-900 animate-pulse'
                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {!isNotified ? 'Ready for Guest' : `Notified (#${sub.notificationCount || 1})`}
                      </span>
                    </div>

                    {(order.customerName || order.customerPhone) && (
                      <div className="text-[11px] font-bold text-zinc-700 bg-white/90 border border-zinc-200/80 rounded-xl px-2.5 py-1.5 my-1">
                        <div>
                          Guest: <span className="text-zinc-900 font-extrabold">{order.customerName || 'Guest'}</span>
                        </div>
                        {order.customerPhone && (
                          <div className="text-[10px] font-mono text-zinc-600 font-bold mt-0.5">
                            Phone: {order.customerPhone}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Isolated items for this stall */}
                    <div className="text-xs text-zinc-800 space-y-1 bg-white/80 p-2.5 rounded-xl border border-zinc-100">
                      {sub.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-start font-bold">
                          <div className="flex-1 min-w-0 pr-2">
                            <span className="truncate block">
                              <span className="text-brand-600 font-black mr-1">[{item.quantity}×]</span>
                              {item.name}
                            </span>
                            {item.variantName && (
                              <span className="text-[10px] text-zinc-500 font-medium block">
                                Portion: {item.variantName}
                              </span>
                            )}
                            {((item.addOnNames && item.addOnNames.length > 0) || (item.customizations && item.customizations.length > 0)) && (
                              <span className="text-[10px] text-brand-700 font-semibold block">
                                + {(item.addOnNames || item.customizations?.map((c: any) => c.name))?.join(', ')}
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-400 text-[11px] shrink-0">৳{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    {/* Last reminder info */}
                    <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-1">
                      <span>
                        {sub.lastNotifiedAt
                          ? `Last reminder: ${new Date(sub.lastNotifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : sub.readyAt
                          ? `Ready at ${new Date(sub.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Ready'}
                      </span>
                      {isNotified && (
                        <span className="font-extrabold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                          Uncollected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direct Notification & Collection Controls */}
                  <div className="pt-2 border-t border-zinc-200/60 space-y-2">
                    {!isNotified ? (
                      <button
                        onClick={() => handleNotifyGuest(order.id)}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#e06d24] hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer animate-pulse"
                        title="Ring diner's phone with animated food-ready reminder and repeating alarm"
                      >
                        <Bell className="w-4 h-4 text-white animate-bounce" />
                        <span>NOTIFY GUEST (FOOD READY)</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => handleNotifyGuest(order.id)}
                          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#e06d24] hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                          title="Guest has not collected food. Trigger repeating alarm again on their device."
                        >
                          <Bell className="w-4 h-4 text-white animate-bounce" />
                          <span>NOTIFY AGAIN / CALL GUEST AGAIN</span>
                        </button>

                        <button
                          onClick={() => handleMarkCollected(order.id)}
                          className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          title="Diner has arrived and received this food tray"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Food Collected ✓</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['READY', 'PREPARING', 'NEW', 'COLLECTED', 'ALL'].map((tab) => {
          let count = 0;
          if (tab === 'READY') count = readyOrders.length;
          else if (tab === 'ALL') count = stallOrders.length;
          else count = stallOrders.filter(o => o.stallSubOrder.status === tab).length;

          return (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === tab
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {tab === 'READY' && <Bell className="w-3.5 h-3.5 text-amber-500 animate-bounce" />}
              <span>{tab === 'READY' ? 'READY & NOTIFIED' : tab}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterTab === tab ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders Grid */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-400 space-y-2">
          <ChefHat className="w-12 h-12 mx-auto text-zinc-300" />
          <h3 className="text-sm font-bold text-zinc-600">No Orders in "{filterTab}" Queue</h3>
          <p className="text-xs">Incoming kitchen tickets assigned to {stall.name} will render here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((order) => {
            const sub = order.stallSubOrder;
            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between pb-3 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-black text-zinc-900 block">
                          TOKEN #{order.token}
                        </span>
                        <button
                          type="button"
                          onClick={() => setKOTOrder(order)}
                          className="px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-black text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                          title="Print Kitchen Order Ticket"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>PRINT KOT</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-xs font-bold text-brand-600 uppercase">
                          {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          (order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL')
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}>
                          {order.orderTypeDescription || ((order.customerOrderType === 'TAKEAWAY' || order.type === 'PARCEL') ? 'Takeaway → Carryout parcel box' : 'Dine-in → Hall / Table dining')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          order.serviceType === 'TABLE_SERVICE'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}>
                          Service Type: {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                        </span>
                      </div>
                      {(order.customerName || order.customerPhone) && (
                        <div className="text-[11px] font-bold text-zinc-700 mt-1">
                          Guest: <span className="text-zinc-900 font-extrabold">{order.customerName || 'Guest'}</span>
                          {order.customerPhone && <span className="text-zinc-500 font-normal ml-1">({order.customerPhone})</span>}
                        </div>
                      )}
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      sub.status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'PREPARING'
                        ? 'bg-amber-100 text-amber-800 animate-pulse'
                        : 'bg-zinc-100 text-zinc-700'
                    }`}>
                      {sub.status}
                    </span>
                  </div>

                  {/* Isolated Items List (ONLY THIS STALL'S ITEMS) */}
                  <div className="space-y-2 py-3 text-xs">
                    {sub.items.map((item: any, idx: number) => {
                      const matchedItem = stallItems.find(m => m.name.toLowerCase() === item.name.toLowerCase() || m.id === item.menuItemId);
                      const isOutOfStock = matchedItem ? matchedItem.isAvailable === false : false;
                      return (
                        <div key={idx} className="flex justify-between items-start font-bold">
                          <div>
                            <span className="text-sm font-black text-brand-600 mr-2">[{item.quantity}x]</span>
                            <span className={isOutOfStock ? 'text-red-700' : 'text-zinc-900'}>{item.name}</span>
                            {isOutOfStock && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px] uppercase font-black">
                                Stock Out
                              </span>
                            )}
                            {item.variantName && (
                              <span className="text-[11px] text-zinc-500 font-semibold block">
                                Portion: {item.variantName}
                              </span>
                            )}
                            {((item.addOnNames && item.addOnNames.length > 0) || (item.customizations && item.customizations.length > 0)) && (
                              <span className="text-[11px] text-brand-700 font-bold block">
                                + Add-ons: {(item.addOnNames || item.customizations?.map((c: any) => c.name))?.join(', ')}
                              </span>
                            )}
                            {item.notes && <p className="text-[11px] text-amber-700 font-normal italic">* {item.notes}</p>}
                          </div>
                          <span className="text-zinc-400">৳{item.price * item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-zinc-100 flex flex-col gap-2">
                  {sub.status === 'NEW' && (
                    <button
                      onClick={() => handleStartPrep(order.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Start Preparing Dish</span>
                    </button>
                  )}

                  {sub.status === 'PREPARING' && (
                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>MARK READY</span>
                    </button>
                  )}

                  {sub.status === 'READY' && (
                    <div className="w-full space-y-2">
                      <button
                        onClick={() => handleNotifyGuest(order.id)}
                        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-[#e06d24] hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer animate-pulse"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>NOTIFY GUEST (FOOD READY)</span>
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-500 font-semibold">
                          Ready at {sub.readyAt ? new Date(sub.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'counter'}
                        </span>
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className="py-1 px-2.5 rounded-lg border border-zinc-200 text-zinc-600 text-[10px] font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
                        >
                          Return to Cooking
                        </button>
                      </div>
                    </div>
                  )}

                  {sub.status === 'NOTIFIED' && (
                    <div className="w-full space-y-2">
                      <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Guest Notified ✓</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                          Attempt #{sub.notificationCount || 1}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 font-semibold">
                        <span>
                          {sub.lastNotifiedAt ? `Last called: ${new Date(sub.lastNotifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Called'}
                        </span>
                        <span className="text-amber-600">Awaiting Pickup</span>
                      </div>

                      {/* Repeat Notification Action & Mark Collected */}
                      <button
                        onClick={() => handleNotifyGuest(order.id)}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#e06d24] hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        title="Diner has not collected food yet. Send repeat notification and ring alarm again."
                      >
                        <Bell className="w-3.5 h-3.5 animate-bounce" />
                        <span>NOTIFY AGAIN / CALL GUEST AGAIN</span>
                      </button>

                      <button
                        onClick={() => handleMarkCollected(order.id)}
                        className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="Diner has arrived and received this food tray"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Food Collected ✓</span>
                      </button>
                    </div>
                  )}

                  {sub.status === 'COLLECTED' && (
                    <div className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs font-black text-blue-800 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Food Collected by Diner ✓</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KOT Printable View Modal */}
      {kotOrder && (
        <KOTPrintView
          order={kotOrder}
          stallFilter={stall?.id}
          onClose={() => setKOTOrder(null)}
        />
      )}
    </div>
  );
};
