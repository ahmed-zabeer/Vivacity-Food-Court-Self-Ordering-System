import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { sound } from '../../services/sound';
import { Order, StallReadyConfirmedEvent, MenuItem, OrderItem, OrderReview } from '../../types';
import { useRoute, useLocation } from 'wouter';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { FoodPreparationAnimation } from '../../components/customer/FoodPreparationAnimation';
import { OrderReviewModal } from '../../components/customer/OrderReviewModal';
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
  Utensils,
  Trash2,
  Search,
  X,
  Star,
  Sparkles
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
  const [existingReview, setExistingReview] = useState<OrderReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [hasAutoPromptedReview, setHasAutoPromptedReview] = useState<boolean>(false);

  // Replacement Food Selection Modal State
  const [replacingItem, setReplacingItem] = useState<OrderItem | null>(null);
  const [availableMenuItems, setAvailableMenuItems] = useState<MenuItem[]>([]);
  const [replaceSearch, setReplaceSearch] = useState<string>('');
  const [replacingLoading, setReplacingLoading] = useState<boolean>(false);

  const openReplaceModal = async (item: OrderItem) => {
    setReplacingItem(item);
    setReplaceSearch('');
    try {
      const list = await api.getMenuItems();
      setAvailableMenuItems(list.filter(m => m.isAvailable !== false));
    } catch (e) {
      console.error('Failed to load menu items for replacement', e);
    }
  };

  const handleSelectReplacement = async (newMenuItem: MenuItem) => {
    if (!order || !replacingItem) return;
    setReplacingLoading(true);
    try {
      const updated = await api.customerReplaceUnavailableItem(
        order.id,
        replacingItem.id,
        newMenuItem.id,
        replacingItem.quantity || 1
      );
      setOrder(updated);
      setReplacingItem(null);
    } catch (e: any) {
      alert(e.message || 'Failed to replace item');
    } finally {
      setReplacingLoading(false);
    }
  };



  useEffect(() => {
    if (!orderId) return;

    // Track this order on this customer's device
    try {
      const stored = JSON.parse(localStorage.getItem('vivacity_customer_orders') || '[]');
      if (Array.isArray(stored) && !stored.includes(orderId)) {
        stored.push(orderId);
        localStorage.setItem('vivacity_customer_orders', JSON.stringify(stored));
      }
    } catch {}

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

  // Check for existing review or trigger review prompt when delivered
  useEffect(() => {
    if (!order || !['DELIVERED', 'COMPLETED'].includes(order.status)) return;

    api.getOrderReview(order.id)
      .then(rev => {
        if (rev) {
          setExistingReview(rev);
        } else if (!hasAutoPromptedReview) {
          setHasAutoPromptedReview(true);
          const timer = setTimeout(() => {
            setShowReviewModal(true);
          }, 1200);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {});
  }, [order?.status, order?.id, hasAutoPromptedReview]);

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
      description: 'Master order submitted to Hasan at Central Counter',
      done: true,
      active: order.status === 'NEW'
    },
    {
      key: 'ACCEPTED',
      label: 'Counter Accepted',
      description: order.status === 'ACTION REQUIRED'
        ? 'Food Check: Unavailable dish — action required'
        : order.status === 'UNDER REVIEW'
        ? 'Counter Food Check: Hasan rechecking items…'
        : order.status === 'NEW'
        ? 'Counter Food Check: Hasan checking dish availability'
        : 'All items confirmed available by Hasan ✓',
      done: !['NEW', 'UNDER REVIEW', 'ACTION REQUIRED'].includes(order.status),
      active: ['NEW', 'UNDER REVIEW', 'ACTION REQUIRED', 'ACCEPTED'].includes(order.status)
    },
    {
      key: 'PAYMENT',
      label: 'Paid & Released',
      description: order.paymentStatus === 'PAID'
        ? 'Payment confirmed & released to kitchens ✓'
        : 'Cash payment pending at Central Counter before release',
      done: order.paymentStatus === 'PAID',
      active: order.paymentStatus === 'PAYMENT DUE' && !['NEW', 'UNDER REVIEW', 'ACTION REQUIRED'].includes(order.status)
    },
    {
      key: 'KITCHEN',
      label: 'Kitchen Cooking',
      description: 'Chefs preparing your food across stall kitchens',
      done: ['READY', 'OUT FOR DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status),
      active: order.status === 'PREPARING'
    },
    {
      key: 'DELIVERY',
      label: 'Ready to Collect',
      description: order.serviceType === 'TABLE_SERVICE'
        ? 'Food ready — service staff delivering to your table'
        : 'Food ready — collect from stall counters',
      done: ['DELIVERED', 'COMPLETED'].includes(order.status),
      active: hasAnyReady || order.status === 'READY' || order.status === 'OUT FOR DELIVERY'
    },
    {
      key: 'COMPLETED',
      label: 'Delivered',
      description: order.serviceType === 'TABLE_SERVICE' ? 'Delivered to table ✓' : 'Collected from counter ✓',
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
      return { icon: ChefHat, text: 'Paid & Released: Your order is cooking across stall kitchens.', color: 'text-brand-600' };
    }
    if (order.status === 'ACTION REQUIRED' || order.items.some(i => i.isUnavailable)) {
      return { icon: AlertTriangle, text: 'This food is not available. Please choose another item.', color: 'text-red-600' };
    }
    if (order.status === 'UNDER REVIEW') {
      return { icon: Clock, text: 'Counter Food Check: Hasan is rechecking your updated order…', color: 'text-brand-600' };
    }
    if (order.paymentStatus === 'PAYMENT DUE') {
      return { icon: Clock, text: 'Counter Accepted: Waiting for cash payment confirmation at the counter.', color: 'text-amber-700' };
    }
    return { icon: Clock, text: 'Order Placed: Waiting for Hasan counter food check…', color: 'text-zinc-500' };
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
        {order.items.some(i => i.isUnavailable) && (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-3xl space-y-3 text-xs text-red-900 shadow-sm animate-pulse">
            <div className="flex items-center gap-2 font-black text-sm text-red-900">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>This food is not available. Please choose another item.</span>
            </div>
            <p className="text-[11px] text-red-700 leading-relaxed font-medium">
              Hasan at Central Counter checked your order and found the following food item(s) are currently out of stock. You can remove the item or choose an available replacement before your order is accepted.
            </p>
            <div className="space-y-2">
              {order.items.filter(i => i.isUnavailable).map(item => (
                <div key={item.id} className="p-3 bg-white rounded-2xl border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-zinc-900 text-xs sm:text-sm">{item.name}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">
                        Not Available
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Quantity: {item.quantity}x • ৳{item.price * item.quantity}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openReplaceModal(item)}
                      className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Utensils className="w-3.5 h-3.5" />
                      <span>Choose Another Food</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const updated = await api.customerRemoveUnavailableItem(order.id, item.id);
                        setOrder(updated);
                      }}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Counter Food Check: Recheck Notice */}
        {order.status === 'UNDER REVIEW' && !order.items.some(i => i.isUnavailable) && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2.5 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-spin" />
            <div className="flex-1">
              <strong className="block font-black">Counter Food Check: Awaiting Acceptance</strong>
              <span className="text-[11px] text-amber-800">
                Your updated order is being rechecked by Hasan at Central Counter. Once all dishes are confirmed available, your order will be accepted.
              </span>
            </div>
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
                {step.description && (
                  <p className={`text-[11px] mt-0.5 leading-snug ${
                    step.active ? 'text-brand-700 font-semibold' : step.done ? 'text-zinc-500 font-normal' : 'text-zinc-400'
                  }`}>
                    {step.description}
                  </p>
                )}
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

        {/* Order Delivered/Completed Banner & Customer Review Section */}
        {['DELIVERED', 'COMPLETED'].includes(order.status) && (
          <div className="space-y-3">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
              <CircleCheck className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-black text-emerald-700">All food delivered! Enjoy your meal! 🎉</p>
            </div>

            {/* Customer Review Card */}
            {existingReview ? (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 text-center space-y-2 shadow-2xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-800">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>You Rated This Order</span>
                </div>
                <div className="flex justify-center items-center gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star
                      key={s}
                      className={`w-5 h-5 ${
                        s <= existingReview.rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-200 fill-zinc-100'
                      }`}
                    />
                  ))}
                </div>
                {existingReview.feedback && (
                  <p className="text-xs text-zinc-600 italic bg-white/70 py-1.5 px-3 rounded-xl border border-amber-100/60 max-w-sm mx-auto">
                    "{existingReview.feedback}"
                  </p>
                )}
                <p className="text-[10px] text-zinc-400">
                  Reviewed on {new Date(existingReview.createdAt).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-amber-300 rounded-2xl p-4 text-center space-y-2 shadow-xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-black text-zinc-900">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Rate Your Order Experience</span>
                </div>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  Help the food court stalls improve their recipes and service.
                </p>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(true)}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-white text-white" />
                  <span>Leave a Review</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && order && (
        <OrderReviewModal
          orderId={order.id}
          token={order.token}
          onClose={() => setShowReviewModal(false)}
          onSkip={() => setShowReviewModal(false)}
          onSuccess={async () => {
            const rev = await api.getOrderReview(order.id);
            if (rev) setExistingReview(rev);
          }}
        />
      )}



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
