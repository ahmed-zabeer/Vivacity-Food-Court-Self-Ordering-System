import React from 'react';
import { Order } from '../../types';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Actions */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Official Digital Receipt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-zinc-800 bg-[#faf9f6]">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-zinc-300 space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase font-sans text-zinc-950">
              VIVACITY FOOD COURT
            </h1>

            {/* Compact Branding Line: Powered by [NEW OFFICIAL KIWEE LOGO] */}
            <div className="inline-flex items-center justify-center gap-1.5 py-0.5 flex-nowrap font-sans">
              <span className="text-[11px] font-normal text-zinc-500 whitespace-nowrap">
                Powered by
              </span>
              <img
                src="/assets/kiwee-logo-transparent.png"
                alt="Kiwee Tech"
                className="h-4 sm:h-4.5 w-auto object-contain brightness-0 opacity-90 shrink-0"
              />
            </div>

            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-sans">
              Premium Multi-Stall Food Court
            </p>
            <div className="mt-2 text-xs font-bold text-zinc-700">
              {order.tableId ? `TABLE ${order.tableId}` : 'PARCEL TAKEAWAY'} • TOKEN #{order.token}
            </div>
            {order.customerName && (
              <div className="text-[11px] font-sans font-semibold text-zinc-800">
                Guest: {order.customerName} {order.customerPhone && `(${order.customerPhone})`}
              </div>
            )}
            <div className="text-[11px] text-zinc-900 font-extrabold uppercase tracking-wider font-sans bg-zinc-100 py-1 px-2 rounded-md inline-block mt-1 border border-zinc-200">
              Service Type: {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
            </div>
            <div className="text-[10px] text-zinc-400">
              {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Items breakdown grouped by stall */}
          <div className="space-y-3 py-2 border-b border-dashed border-zinc-300">
            {order.stalls.map((stall) => (
              <div key={stall.stallId} className="space-y-1">
                <div className="text-[10px] font-bold text-brand-700 uppercase tracking-wider bg-brand-50/50 px-1 py-0.5 rounded">
                  {stall.stallName}
                </div>
                {stall.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs py-0.5">
                    <span className="flex-1">
                      {item.quantity}x {item.name}
                      {item.notes && <span className="block text-[10px] text-zinc-400 italic font-sans">{item.notes}</span>}
                    </span>
                    <span className="font-semibold ml-2">৳ {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-1.5 py-2 border-b border-dashed border-zinc-300 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Food Subtotal:</span>
              <span>৳ {order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount / Coupon:</span>
                <span>-৳ {order.discount}</span>
              </div>
            )}
            {order.serviceCharge > 0 && (
              <div className="flex justify-between text-brand-700 font-bold">
                <span>Waiter Service Charge (5%):</span>
                <span>৳ {order.serviceCharge}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>VAT / Tax:</span>
                <span>৳ {order.tax}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-zinc-900 pt-1 border-t border-zinc-200">
              <span>GRAND TOTAL:</span>
              <span>৳ {order.grandTotal}</span>
            </div>
          </div>

          {/* Payment & Security Metadata */}
          <div className="pt-2 text-center text-[10px] text-zinc-500 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold text-zinc-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>PAYMENT: {order.paymentMethod.toUpperCase()} ({order.paymentStatus})</span>
            </div>
            <p>Order ID: {order.id.slice(0, 16)}...</p>
            <p className="font-sans text-[11px] text-zinc-400 pt-2">
              Thank you for dining at Vivacity Food Court!
            </p>
          </div>
        </div>

        {/* Print Button Footer */}
        <div className="p-4 bg-zinc-100 border-t border-zinc-200 flex justify-end gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Print Stylesheet to guarantee paper format, logo visibility, and layout fidelity */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .fixed {
            position: static !important;
            background: none !important;
            padding: 0 !important;
          }
          .max-w-md {
            max-width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .overflow-y-auto {
            overflow: visible !important;
            max-height: none !important;
          }
          /* Make receipt paper visible */
          .fixed inset-0, [role="dialog"], .bg-black\\/60 {
            display: block !important;
          }
          div:has(> .font-mono), .font-mono, .font-mono * {
            visibility: visible !important;
          }
          .font-mono {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
};

