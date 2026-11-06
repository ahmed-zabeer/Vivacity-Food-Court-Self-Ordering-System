import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Order } from '../../types';
import { useTableSession } from '../../context/TableSessionContext';
import { useLocation } from 'wouter';
import { Receipt, Clock, ChevronRight, ShoppingBag } from 'lucide-react';
import { ReceiptModal } from '../../components/common/ReceiptModal';

export const MyOrdersPage: React.FC = () => {
  const { tableId } = useTableSession();
  const [, setLocation] = useLocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrders()
      .then(res => {
        const storedOrderIds: string[] = (() => {
          try {
            return JSON.parse(localStorage.getItem('vivacity_customer_orders') || '[]');
          } catch {
            return [];
          }
        })();

        if (storedOrderIds.length > 0) {
          const matched = res.filter(o => storedOrderIds.includes(o.id) || (tableId && o.tableId === tableId));
          setOrders(matched.length > 0 ? matched : (tableId ? res.filter(o => o.tableId === tableId) : res));
        } else if (tableId) {
          setOrders(res.filter(o => o.tableId === tableId));
        } else {
          setOrders(res);
        }
      })
      .finally(() => setLoading(false));
  }, [tableId]);

  return (
    <div className="max-w-full md:max-w-2xl mx-auto w-full p-4 sm:p-6 pb-4 sm:pb-6 space-y-4 overflow-x-hidden">
      <div>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">
          Session Order History
        </h1>
        <p className="text-xs text-zinc-500">
          All orders submitted during your dining visit at Table {tableId || 'T17'}
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-zinc-400">Loading order history...</div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200 space-y-2">
          <p className="text-sm font-bold text-zinc-700">No Orders Placed Yet</p>
          <p className="text-xs text-zinc-400">Your completed dishes and receipts will show here.</p>
          <button
            onClick={() => setLocation('/')}
            className="mt-3 px-4 py-2 bg-brand-500 text-white rounded-full text-xs font-bold"
          >
            Start Ordering
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-3xl p-4 border border-zinc-200/90 shadow-2xs space-y-3 hover:border-brand-500/40 transition-all"
            >
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-zinc-900">
                    Token #{o.token}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 uppercase">
                    {o.tableId ? `Table ${o.tableId}` : 'Takeaway'}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    o.serviceType === 'TABLE_SERVICE'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  }`}>
                    Service Type: {o.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                  </span>
                </div>

                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  o.status === 'DELIVERED' || o.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : o.status === 'PREPARING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-zinc-100 text-zinc-700'
                }`}>
                  {o.status}
                </span>
              </div>

              {/* Items Summary */}
              <div className="text-xs text-zinc-600 space-y-1">
                {o.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="text-zinc-400">৳{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Total & Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                <div>
                  <span className="text-zinc-400 text-[11px]">Total: </span>
                  <strong className="text-sm font-black text-brand-600">৳ {o.grandTotal}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReceiptOrder(o)}
                    className="p-1.5 px-3 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>

                  <button
                    onClick={() => setLocation(`/orders/${o.id}`)}
                    className="p-1.5 px-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <span>Track</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedReceiptOrder && (
        <ReceiptModal
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
};
