import React from 'react';
import { Order, StallSubOrder } from '../../types';
import { Printer, X } from 'lucide-react';

interface KOTPrintViewProps {
  order: Order | null;
  stallFilter?: string | null;
  onClose: () => void;
}

export const KOTPrintView: React.FC<KOTPrintViewProps> = ({ order, stallFilter, onClose }) => {
  if (!order) return null;

  const relevantStalls = stallFilter
    ? order.stalls.filter(s => s.stallId === stallFilter)
    : order.stalls;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-3.5 bg-zinc-900 text-white flex items-center justify-between no-print">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            KOT Ticket Print
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
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

        {/* Thermal KOT Ticket Sheet */}
        <div className="p-6 font-mono text-xs text-black bg-white space-y-4">
          <div className="text-center pb-3 border-b-2 border-black space-y-1.5">
            <h1 className="text-xl font-black tracking-wider uppercase font-sans">
              VIVACITY FOOD COURT
            </h1>

            {/* Compact Branding Line: Powered by [NEW OFFICIAL KIWEE LOGO] */}
            <div className="inline-flex items-center justify-center gap-1.5 py-0.5 flex-nowrap font-sans">
              <span className="text-[10px] font-normal text-zinc-600 whitespace-nowrap">
                Powered by
              </span>
              <img
                src="/assets/kiwee-logo-transparent.png"
                alt="Kiwee Tech"
                className="h-3.5 w-auto object-contain brightness-0 opacity-90 shrink-0"
              />
            </div>

            <h2 className="text-base font-black tracking-wider uppercase font-sans mt-1">
              KOT #{order.token}
            </h2>
            <div className="text-sm font-extrabold">
              {order.tableId ? `TABLE ${order.tableId}` : 'PARCEL TAKEAWAY'}
            </div>
            <p className="text-[11px] font-black text-black uppercase tracking-wider font-sans bg-zinc-100 py-0.5 px-2 rounded inline-block border border-black">
              Service Type: {order.serviceType === 'TABLE_SERVICE' ? 'TABLE SERVICE' : 'SELF-SERVICE'}
            </p>
            {(order.customerName || order.customerPhone) && (
              <div className="text-[11px] font-bold text-zinc-900 font-sans border border-black rounded px-2.5 py-1 bg-zinc-50 my-1 text-center">
                <span className="font-black uppercase tracking-wider block text-[10px] text-zinc-600">Guest Information</span>
                <span className="text-zinc-950 font-black">{order.customerName || 'Guest'}</span>
                {order.customerPhone && (
                  <span className="block font-mono text-[11px] text-zinc-800 font-extrabold mt-0.5">
                    Phone: {order.customerPhone}
                  </span>
                )}
              </div>
            )}
            <p className="text-[10px] text-zinc-500">
              {new Date().toLocaleTimeString()} • {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Stalls Sub-Order Items */}
          {relevantStalls.map((stall) => (
            <div key={stall.stallId} className="space-y-2 pb-3 border-b border-black">
              <div className="text-xs font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 inline-block rounded">
                STATION: {stall.stallName}
              </div>
              <div className="space-y-1.5 pt-1">
                {stall.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs font-bold">
                    <span className="flex-1">
                      <span className="text-sm font-black mr-1.5">[{item.quantity}x]</span>
                      {item.name}
                      {item.notes && (
                        <span className="block text-[11px] font-normal text-red-600 font-sans mt-0.5">
                          * NOTE: {item.notes}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {order.customerNotes && (
            <div className="p-2 border border-black rounded text-[11px] bg-zinc-50">
              <strong>Order Note:</strong> {order.customerNotes}
            </div>
          )}

          <div className="text-center text-[10px] text-zinc-500 pt-2 font-sans">
            *** End of Kitchen Ticket ***
          </div>
        </div>

        <div className="p-3 bg-zinc-100 border-t border-zinc-200 flex justify-end gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>Send to Kitchen Printer</span>
          </button>
        </div>
      </div>

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
          .max-w-sm {
            max-width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
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

