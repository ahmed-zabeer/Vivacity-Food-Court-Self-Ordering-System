import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import { Order, Stall } from '../../types';
import { KOTPrintView } from '../../components/common/KOTPrintView';
import { ChefHat, Clock, CheckCircle, Printer, Filter, AlertCircle, Flame } from 'lucide-react';

export const KitchenDisplay: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [activeStallFilter, setActiveStallFilter] = useState<string>('ALL');
  const [printKOTOrder, setPrintKOTOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKDS = async () => {
    try {
      const [ordersRes, stallsRes] = await Promise.all([
        api.getOrders(),
        api.getStalls()
      ]);
      setOrders(ordersRes);
      setStalls(stallsRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKDS();

    const unsubKOT = realtime.on('kot_generated', (kotOrder: Order) => {
      sound.playKitchenBell();
      fetchKDS();
    });

    const unsubUpdated = realtime.on('order_updated', () => {
      fetchKDS();
    });

    return () => {
      unsubKOT();
      unsubUpdated();
    };
  }, []);

  const handleUpdateStatus = async (orderId: string, stallId: string, status: string) => {
    try {
      await api.updateStallStatus(orderId, stallId, status);
      if (status === 'READY') sound.playKitchenBell();
      fetchKDS();
    } catch (e) {
      alert('Failed to update kitchen status');
    }
  };

  const handleStartPrep = async (orderId: string, stallId: string) => {
    try {
      await api.startPreparingStall(orderId, stallId, 'KDS Chef');
      fetchKDS();
    } catch (e) {
      alert('Failed to start preparing');
    }
  };

  const handleMarkReady = async (orderId: string, stallId: string) => {
    try {
      await api.markStallReady(orderId, stallId, 'KDS Chef');
      sound.playKitchenBell();
      fetchKDS();
    } catch (e) {
      alert('Failed to mark station ready');
    }
  };

  const handleNotifyGuest = async (orderId: string, stallId: string) => {
    try {
      await api.notifyGuestStall(orderId, stallId, 'Kitchen Staff');
      sound.playKitchenBell();
      fetchKDS();
    } catch (e: any) {
      alert(e.message || 'Failed to notify guest');
    }
  };

  // Only show orders that are PREPARING or READY (released to kitchen)
  const kitchenOrders = orders.filter(o => 
    ['PREPARING', 'READY'].includes(o.status)
  );

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-6">
      {/* KDS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-brand-600" />
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Kitchen Display System (KDS)
            </h1>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Real-time kitchen order line • High-contrast touch workflow
          </p>
        </div>

        {/* Station Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setActiveStallFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
              activeStallFilter === 'ALL'
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-600 border border-zinc-200'
            }`}
          >
            All 6 Kitchens
          </button>
          {stalls.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveStallFilter(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                activeStallFilter === s.id
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-zinc-600 border border-zinc-200'
              }`}
            >
              {s.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-zinc-200 text-zinc-400 space-y-2">
          <ChefHat className="w-12 h-12 mx-auto text-zinc-300" />
          <h3 className="text-sm font-bold text-zinc-600">All Kitchen Tickets Cleared</h3>
          <p className="text-xs">No active orders currently waiting in the cooking queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {kitchenOrders.map((order) => {
            const relevantStalls = activeStallFilter === 'ALL'
              ? order.stalls
              : order.stalls.filter(s => s.stallId === activeStallFilter);

            if (relevantStalls.length === 0) return null;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl overflow-hidden border-2 border-zinc-900 shadow-md flex flex-col justify-between"
              >
                {/* Header Ticket Bar */}
                <div className="p-4 bg-zinc-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-xl font-black tracking-tight block">
                      TOKEN #{order.token}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        {order.tableId ? `TABLE ${order.tableId}` : 'PARCEL TAKEAWAY'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        order.serviceType === 'TABLE_SERVICE'
                          ? 'bg-amber-400 text-zinc-950'
                          : 'bg-emerald-500 text-white'
                      }`}>
                        Service Type: {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                      </span>
                    </div>
                    {(order.customerName || order.customerPhone) && (
                      <div className="text-[11px] font-bold text-zinc-300 mt-1">
                        Guest: <span className="text-white font-extrabold">{order.customerName || 'Guest'}</span>
                        {order.customerPhone && <span className="text-zinc-400 font-normal ml-1">({order.customerPhone})</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPrintKOTOrder(order)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      title="Print KOT Ticket"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Sub-Orders Body */}
                <div className="p-4 space-y-4 divide-y divide-zinc-100 flex-1">
                  {relevantStalls.map((stall) => (
                    <div key={stall.stallId} className="pt-3 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                          {stall.stallName}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          stall.status === 'READY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {stall.status}
                        </span>
                      </div>

                      {/* Line Items */}
                      <div className="space-y-1.5">
                        {stall.items.map((it, idx) => (
                          <div key={idx} className="text-sm font-bold text-zinc-900 flex items-start gap-2">
                            <span className="text-base font-black text-brand-600 min-w-[24px]">
                              {it.quantity}×
                            </span>
                            <div>
                              <span>{it.name}</span>
                              {it.notes && (
                                <p className="text-[11px] font-normal text-red-600 italic">
                                  * {it.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Stall Action Buttons */}
                      <div className="pt-2 flex flex-col gap-2">
                        {stall.status === 'NEW' && (
                          <button
                            onClick={() => handleStartPrep(order.id, stall.stallId)}
                            className="w-full py-2.5 px-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Flame className="w-4 h-4" />
                            <span>Start Preparing Dish</span>
                          </button>
                        )}

                        {stall.status === 'PREPARING' && (
                          <button
                            onClick={() => handleMarkReady(order.id, stall.stallId)}
                            className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>MARK READY</span>
                          </button>
                        )}

                        {stall.status === 'READY' && (
                          <div className="w-full space-y-2">
                            <button
                              onClick={() => handleNotifyGuest(order.id, stall.stallId)}
                              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-[#e06d24] hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer animate-pulse"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>NOTIFY GUEST (FOOD READY)</span>
                            </button>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-500 font-semibold">
                                Ready: {stall.readyAt ? new Date(stall.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                              </span>
                              <button
                                onClick={() => handleUpdateStatus(order.id, stall.stallId, 'PREPARING')}
                                className="py-0.5 px-2 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                              >
                                Back to Cooking
                              </button>
                            </div>
                          </div>
                        )}

                        {stall.status === 'NOTIFIED' && (
                          <div className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-black text-emerald-800 flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Customer Notified for Pickup ✓</span>
                          </div>
                        )}

                        {stall.status === 'COLLECTED' && (
                          <div className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs font-black text-blue-800 flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span>Order Collected by Diner ✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer notes */}
                {order.customerNotes && (
                  <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-600 italic">
                    Note: "{order.customerNotes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* KOT Printable View */}
      {printKOTOrder && (
        <KOTPrintView
          order={printKOTOrder}
          stallFilter={activeStallFilter === 'ALL' ? null : activeStallFilter}
          onClose={() => setPrintKOTOrder(null)}
        />
      )}
    </div>
  );
};
