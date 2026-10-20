import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import { Order, StallReadyConfirmedEvent } from '../../types';
import { useRoute, useLocation } from 'wouter';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { FoodPreparationAnimation } from '../../components/customer/FoodPreparationAnimation';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Receipt,
  Store,
  PlusCircle,
  AlertTriangle,
  Bell,
  Package,
  Bike,
  CircleCheck,
} from 'lucide-react';

// --- Stall Card Component ---
interface StallCardProps {
  stall: Order['stalls'][0];
  isReadyToCollect: boolean;
  serviceType?: Order['serviceType'];
}

const StallCard: React.FC<StallCardProps> = ({ stall, isReadyToCollect, serviceType }) => {
  const isTableService = serviceType === 'TABLE_SERVICE';

  const statusLabel = () => {
    switch (stall.status) {
      case 'NEW': return 'Waiting for Kitchen';
      case 'PREPARING': return 'Preparing';
      case 'READY': return 'Kitchen Ready';
      case 'NOTIFIED': return isTableService ? 'Ready for Table Delivery!' : 'Ready to Collect!';
      case 'COLLECTED': return isTableService ? 'Delivered ✓' : 'Collected ✓';
      default: return stall.status;
    }
  };

  const statusColors = () => {
    switch (stall.status) {
      case 'NOTIFIED': return 'bg-emerald-100 text-emerald-800 border border-emerald-400 font-black animate-pulse';
      case 'READY': return 'bg-amber-100 text-amber-800 border border-amber-400 font-black';
      case 'PREPARING': return 'bg-brand-100 text-brand-800 border border-brand-300 font-black';
      case 'COLLECTED': return 'bg-blue-100 text-blue-800 border border-blue-300';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const cardBg = () => {
    switch (stall.status) {
      case 'NOTIFIED': return 'bg-emerald-50/60 border-emerald-200';
      case 'READY': return 'bg-amber-50/60 border-amber-200';
      case 'PREPARING': return 'bg-brand-50/60 border-brand-200';
      case 'COLLECTED': return 'bg-blue-50/30 border-blue-100';
      default: return 'bg-zinc-50 border-zinc-200';
    }
  };

  return (
    <div className={`rounded-2xl border p-4 space-y-3 transition-all ${cardBg()}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-brand-600 shrink-0" />
          <span className="text-xs font-black text-zinc-900">{stall.stallName}</span>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase ${statusColors()}`}>
          {statusLabel()}
        </span>
      </div>

      {/* Items list */}
      <div className="text-[11px] text-zinc-700 space-y-1">
        {stall.items.map((it, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="font-semibold">
              <span className="text-brand-600 font-black">{it.quantity}×</span> {it.name}
            </span>
            <span className="text-zinc-500">৳{(it.price * it.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Animation + Prep Time Row */}
      <div className="flex items-center gap-3">
        <FoodPreparationAnimation status={(stall.status as any) || 'NEW'} size="sm" />

        <div className="flex-1 text-xs text-zinc-600 space-y-0.5">
          {stall.status === 'PREPARING' && (
            <p className="text-brand-700 font-bold">
              Preparing your food in kitchen
            </p>
          )}

          {stall.status === 'NEW' && (
            <p className="text-zinc-500">Waiting for kitchen to start</p>
          )}

          {stall.status === 'READY' && (
            <p className="text-amber-700 font-bold">
              Your food is ready! Waiting for counter confirmation…
            </p>
          )}

          {stall.status === 'NOTIFIED' && (
            <div className="space-y-0.5">
              <p className="text-emerald-700 font-black">
                {isTableService ? '✓ Food is ready! Service staff will bring it to your table' : '✓ Please collect from the pickup counter'}
              </p>
              {stall.notifiedAt && (
                <p className="text-[10px] text-zinc-400">
                  Confirmed at {new Date(stall.notifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          )}

          {stall.status === 'COLLECTED' && (
            <p className="text-blue-700 font-bold">
              {isTableService ? 'Food delivered to table. Enjoy your meal!' : 'Food collected. Enjoy your meal!'}
            </p>
          )}
        </div>
      </div>

      {/* Ready-to-collect highlight banner */}
      {stall.status === 'NOTIFIED' && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-600 rounded-xl text-white text-[11px] font-black">
          <Bell className="w-4 h-4 shrink-0 animate-bounce" />
          <span>
            {isTableService
              ? 'Your food is ready! Service staff is delivering it to your table.'
              : 'Head to the pickup counter to collect your order!'}
          </span>
        </div>
      )}
    </div>
  );
};

// --- Main Order Tracking Page ---
export const OrderTrackingPage: React.FC = () => {
  const [, params] = useRoute<{ id: string }>('/orders/:id');
  const [, setLocation] = useLocation();
  const orderId = params ? params.id : undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);



  useEffect(() => {
    if (!orderId) return;

    api.getOrder(orderId)
      .then(res => setOrder(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

    // Real-time: order status updates
    const unsubOrder = realtime.on('order_updated', (updated: Order) => {
      if (updated.id === orderId || updated.token === orderId) {
        setOrder(updated);
      }
    });

    return () => {
      unsubOrder();
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto w-full p-6 py-12 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Fetching Order Status…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto w-full p-6 pb-4 text-center space-y-3">
        <h2 className="text-base font-bold text-zinc-900">Order Not Found</h2>
        <button
          onClick={() => setLocation('/')}
          className="px-4 py-2 bg-brand-500 text-white rounded-full text-xs font-bold"
        >
          Return to Food Court
        </button>
      </div>
    );
  }

  // Segment stalls by readiness
  const readyStalls = order.stalls.filter(s => s.status === 'NOTIFIED');
  const awaitingCounterStalls = order.stalls.filter(s => s.status === 'READY');
  const preparingStalls = order.stalls.filter(s => s.status === 'PREPARING');
  const pendingStalls = order.stalls.filter(s => s.status === 'NEW');
  const collectedStalls = order.stalls.filter(s => s.status === 'COLLECTED');

  const hasAnyReady = readyStalls.length > 0 || awaitingCounterStalls.length > 0;

  // Workflow progress stages
  const steps = [
    {
      key: 'RECEIVED',
      label: 'Order Placed',
      done: true,
      active: order.status === 'NEW' || order.status === 'UNDER REVIEW'
    },
    {
      key: 'ACCEPTED',
      label: 'Counter Accepted',
      done: !['NEW', 'UNDER REVIEW', 'ACTION REQUIRED'].includes(order.status),
      active: order.status === 'ACCEPTED'
    },
    {
      key: 'PAYMENT',
      label: 'Paid & Released',
      done: order.paymentStatus === 'PAID',
      active: order.paymentStatus === 'PAYMENT DUE'
    },
    {
      key: 'KITCHEN',
      label: 'Kitchen Cooking',
      done: ['READY', 'OUT FOR DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status),
      active: order.status === 'PREPARING'
    },
    {
      key: 'DELIVERY',
      label: 'Ready to Collect',
      done: ['DELIVERED', 'COMPLETED'].includes(order.status),
      active: hasAnyReady || order.status === 'READY' || order.status === 'OUT FOR DELIVERY'
    },
    {
      key: 'COMPLETED',
      label: 'Delivered',
      done: ['DELIVERED', 'COMPLETED'].includes(order.status),
      active: order.status === 'DELIVERED' || order.status === 'COMPLETED'
    }
  ];

  // Overall animated message / state
  const getMasterMessage = () => {
    if (['DELIVERED', 'COMPLETED'].includes(order.status)) {
      return { icon: CircleCheck, text: 'Order complete! Enjoy your meal.', color: 'text-emerald-600' };
    }
    if (readyStalls.length > 0) {
      return { icon: Bell, text: 'Some food is ready to collect from the counter!', color: 'text-emerald-600' };
    }
    if (awaitingCounterStalls.length > 0) {
      return { icon: ChefHat, text: 'Food ready at kitchen — waiting for counter confirmation.', color: 'text-amber-700' };
    }
    if (preparingStalls.length > 0) {
      return { icon: ChefHat, text: 'Our chefs are preparing your food with care!', color: 'text-brand-600' };
    }
    if (order.status === 'PREPARING') {
      return { icon: ChefHat, text: 'Your order has been released to the kitchens.', color: 'text-brand-600' };
    }
    if (order.paymentStatus === 'PAYMENT DUE') {
      return { icon: Clock, text: 'Waiting for cash payment confirmation at the counter.', color: 'text-amber-700' };
    }
    return { icon: Clock, text: 'Waiting for order confirmation…', color: 'text-zinc-500' };
  };

  const masterMsg = getMasterMessage();
  const MasterIcon = masterMsg.icon;

  return (
    <div className="max-w-full md:max-w-2xl mx-auto w-full p-4 sm:p-6 pb-4 sm:pb-6 space-y-4 overflow-x-hidden">

      {/* === 1. Header Banner === */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-600">
              Live Dining Tracker
            </span>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              Token #{order.token}
            </h1>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <span className="px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-500/20 text-xs font-black uppercase">
                {order.tableId ? `Table ${order.tableId}` : 'Takeaway'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                order.serviceType === 'TABLE_SERVICE'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}>
                Service Type: {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
              </span>
            </div>
            {order.customerName && (
              <div className="text-[11px] font-bold text-zinc-700">
                {order.customerName} {order.customerPhone && <span className="text-zinc-400 font-normal">• {order.customerPhone}</span>}
              </div>
            )}
            <div className="text-[10px] text-zinc-400">
              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Master Status Message */}
        <div className={`flex items-center gap-2.5 text-sm font-bold ${masterMsg.color}`}>
          <MasterIcon className="w-4 h-4 shrink-0" />
          <span>{masterMsg.text}</span>
        </div>

        {/* Unavailable Item Alert Banner */}
        {order.status === 'ACTION REQUIRED' && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-2 text-xs text-red-800">
            <div className="flex items-center gap-2 font-black">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Action Required: Some items are currently unavailable</span>
            </div>
            {order.items.filter(i => i.isUnavailable).map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-red-100">
                <div>
                  <span className="font-bold text-zinc-900">{item.name}</span>
                  <p className="text-[10px] text-red-600">{item.unavailableReason || 'Sold out in kitchen'}</p>
                </div>
                <button
                  onClick={async () => {
                    const updated = await api.customerRemoveUnavailableItem(order.id, item.id);
                    setOrder(updated);
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Remove & Proceed
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cash payment instruction reminder */}
        {order.paymentStatus === 'PAYMENT DUE' && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
            <div className="font-black flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Cash Payment Required</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Please present Token <strong>#{order.token}</strong> to the central cashier counter to complete your cash payment of <strong>৳{order.grandTotal.toLocaleString()}</strong>. Once confirmed, your KOT is generated.
            </p>
          </div>
        )}
      </div>

      {/* === 2. Order Pipeline Steps === */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">Order Pipeline Status</h3>
        <div className="space-y-3.5">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : step.active
                      ? 'bg-brand-500 text-white animate-pulse'
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-0.5 h-6 my-1 ${step.done ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
                )}
              </div>
              <div className="pt-0.5">
                <div className={`text-xs font-bold ${step.active ? 'text-brand-600 font-black' : step.done ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {step.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === 3. Stall-by-Stall Food Preparation Status === */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Your Food Preparation Status
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">Live updates from each stall's kitchen</p>
          </div>
          <ChefHat className="w-5 h-5 text-brand-600" />
        </div>

        {/* Ready to Collect Section */}
        {readyStalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>{order.serviceType === 'TABLE_SERVICE' ? 'Ready for Table Delivery' : 'Ready to Collect'}</span>
            </div>
            {readyStalls.map(stall => (
              <StallCard key={stall.stallId} stall={stall} isReadyToCollect serviceType={order.serviceType} />
            ))}
          </div>
        )}

        {/* Kitchen Ready — Awaiting Counter */}
        {awaitingCounterStalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-700">
              <Clock className="w-4 h-4" />
              <span>Kitchen Ready — Awaiting Counter</span>
            </div>
            {awaitingCounterStalls.map(stall => (
              <StallCard key={stall.stallId} stall={stall} isReadyToCollect={false} serviceType={order.serviceType} />
            ))}
          </div>
        )}

        {/* Currently Preparing */}
        {preparingStalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-brand-700">
              <ChefHat className="w-4 h-4" />
              <span>Currently Preparing</span>
            </div>
            {preparingStalls.map(stall => (
              <StallCard key={stall.stallId} stall={stall} isReadyToCollect={false} serviceType={order.serviceType} />
            ))}
          </div>
        )}

        {/* Pending / Queued */}
        {pendingStalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-zinc-500">
              <Package className="w-4 h-4" />
              <span>Waiting for Kitchen</span>
            </div>
            {pendingStalls.map(stall => (
              <StallCard key={stall.stallId} stall={stall} isReadyToCollect={false} serviceType={order.serviceType} />
            ))}
          </div>
        )}

        {/* Collected */}
        {collectedStalls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>{order.serviceType === 'TABLE_SERVICE' ? 'Delivered to Table' : 'Food Collected'}</span>
            </div>
            {collectedStalls.map(stall => (
              <StallCard key={stall.stallId} stall={stall} isReadyToCollect={false} serviceType={order.serviceType} />
            ))}
          </div>
        )}

        {/* Order Delivered/Completed Banner */}
        {['DELIVERED', 'COMPLETED'].includes(order.status) && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
            <CircleCheck className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-sm font-black text-emerald-700">All food delivered! Enjoy your meal! 🎉</p>
          </div>
        )}
      </div>



      {/* === 5. Action Buttons === */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => setShowReceipt(true)}
          className="py-3 px-4 rounded-2xl bg-zinc-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
        >
          <Receipt className="w-4 h-4" />
          <span>View Receipt</span>
        </button>
        <button
          onClick={() => setLocation('/')}
          className="py-3 px-4 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-brand-500/25 shadow-md"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Order More Dishes</span>
        </button>
      </div>

      {/* === Receipt Modal === */}
      {showReceipt && <ReceiptModal order={order} onClose={() => setShowReceipt(false)} />}
    </div>
  );
};
