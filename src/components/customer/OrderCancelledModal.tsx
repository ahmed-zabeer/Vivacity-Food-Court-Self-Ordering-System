import React from 'react';
import { Ban, CheckCircle2, Clock, Hash, ReceiptText, Store, UserRound, Wallet } from 'lucide-react';
import { GuestOrderCancelledEvent } from '../../types';

interface OrderCancelledModalProps {
  notice: GuestOrderCancelledEvent;
  onDismiss: () => void;
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return 'Just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const refundLabel = (notice: GuestOrderCancelledEvent): string | null => {
  if (notice.paymentStatus === 'REFUNDED') {
    return notice.refundAmount && notice.refundAmount > 0
      ? `৳${Number(notice.refundAmount).toLocaleString()} will be returned to you.`
      : 'Your payment has been refunded.';
  }
  if (notice.paymentStatus === 'PARTIALLY_REFUNDED') {
    return notice.refundAmount && notice.refundAmount > 0
      ? `A refund of ৳${Number(notice.refundAmount).toLocaleString()} has been recorded.`
      : 'A partial refund has been recorded.';
  }
  if (notice.paymentStatus === 'PAYMENT DUE' || notice.paymentStatus === 'UNPAID' || notice.paymentStatus === 'CANCELLED') {
    return 'No payment was collected for this order.';
  }
  return null;
};

/**
 * Full-screen guest popup shown ONLY to the phone that owns the cancelled
 * order. It is an in-app modal (not a browser notification), so it works even
 * when notification permission was never granted.
 */
export const OrderCancelledModal: React.FC<OrderCancelledModalProps> = ({ notice, onDismiss }) => {
  const refund = refundLabel(notice);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.86)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Your order has been cancelled"
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
        aria-live="assertive"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-zinc-950 px-6 pt-7 pb-6 text-white text-center overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-44 h-44 rounded-full bg-red-400/25 blur-2xl animate-pulse" />
          </div>

          <div className="relative flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center shadow-xl">
              <Ban className="w-8 h-8 text-white" />
            </div>
          </div>

          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-red-100 mb-0.5">
            VIVACITY FOOD COURT
          </p>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase text-white drop-shadow-md">
            Your Order Has Been Cancelled
          </h1>
          <p className="mt-1.5 text-[11px] font-bold text-red-100">
            Token #{notice.token} is no longer active.
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2.5">
          <div className="p-3.5 bg-red-50 border-2 border-red-200 rounded-2xl text-center">
            <p className="text-xs font-black text-red-800 leading-snug">
              This order was cancelled by the food court. You do not need to collect it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
                <Hash className="w-3 h-3" /> Token
              </p>
              <p className="text-base font-black text-brand-600">#{notice.token}</p>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 text-center">
              <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-center gap-1">
                <Store className="w-3 h-3" /> Table
              </p>
              <p className="text-base font-black text-zinc-900">{notice.tableId || 'Takeaway'}</p>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl divide-y divide-zinc-200 text-xs">
            <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0 pt-0.5">
                <ReceiptText className="w-3.5 h-3.5" /> Order ID
              </span>
              <span className="font-mono font-bold text-zinc-800 text-right break-all">{notice.orderId}</span>
            </div>
            <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0 pt-0.5">
                <Clock className="w-3.5 h-3.5" /> Cancelled At
              </span>
              <span className="font-bold text-zinc-800 text-right">{formatDateTime(notice.cancelledAt)}</span>
            </div>
            {notice.cancelledBy && (
              <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0 pt-0.5">
                  <UserRound className="w-3.5 h-3.5" /> Cancelled By
                </span>
                <span className="font-bold text-zinc-800 text-right">{notice.cancelledBy}</span>
              </div>
            )}
            <div className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 shrink-0 pt-0.5">
                <BronzeIcon /> Reason
              </span>
              <span className="font-bold text-zinc-800 text-right break-words">{notice.reason || 'Cancelled by the food court'}</span>
            </div>
          </div>

          {refund && (
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <Wallet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-emerald-800 leading-snug">{refund}</p>
            </div>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-3 px-4 bg-zinc-900 hover:bg-black text-white text-sm font-black rounded-2xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>OK, Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Small inline icon so the Reason row keeps the same alignment as the others.
const BronzeIcon: React.FC = () => (
  <span className="inline-flex w-3.5 h-3.5 items-center justify-center text-[10px] font-black text-zinc-400">!</span>
);
