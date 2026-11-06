import React from 'react';
import { Order, StallSubOrder } from '../../types';
import { Printer, X } from 'lucide-react';
import {
  FOOD_COURT_INFO,
  KIWEE_LOGO,
  THERMAL_PRINT_CSS,
  formatReceiptDate,
  formatReceiptTime,
  orderTypeLabel,
} from '../../config/receipt';

interface KOTPrintViewProps {
  order: Order | null;
  stallFilter?: string | null;
  onClose: () => void;
}

export const KOTPrintView: React.FC<KOTPrintViewProps> = ({ order, stallFilter, onClose }) => {
  if (!order) return null;

  const tickets: StallSubOrder[] = stallFilter
    ? order.stalls.filter((s) => s.stallId === stallFilter)
    : order.stalls;

  const invoiceNo = order.invoiceNo || order.token;
  const guestCount = Number(order.guestCount || 0);
  const tableLabel = order.tableId ? `Table ${order.tableId}` : 'Takeaway';
  const serviceLabel =
    order.serviceType === 'TABLE_SERVICE' ? 'Table Service' : 'Self-Service';
  const orderType = orderTypeLabel(order);

  // A ticket is "Updated" only when the kitchen has already received a KOT for
  // this order before. A first release is always a New Order.
  const kotEvents = order.history.filter((h) =>
    /KOT\s+\S+\s+generated/i.test(h.note || '')
  ).length;
  const isUpdatedOrder = kotEvents > 1;

  const handlePrint = () => window.print();

  const Dash = () => <div className="border-t border-dashed border-black my-1" />;
  const DoubleDash = () => (
    <div className="border-t-2 border-dashed border-black my-1.5" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-3.5 bg-zinc-900 text-white flex items-center justify-between no-print">
          <div className="min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Kitchen Order Ticket
            </span>
            <span className="block text-[10px] text-zinc-400 font-medium">
              {tickets.length} stall ticket{tickets.length === 1 ? '' : 's'} • Token {order.token}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Print KOT"
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

        {/* Thermal KOT sheets — one per stall, each on its own 80mm page */}
        <div className="overflow-y-auto bg-[#e9e6df] p-3 sm:p-4">
          <div className="thermal-print-root mx-auto w-full max-w-[320px] space-y-3">
            {tickets.map((stall, ticketIndex) => (
              <div
                key={stall.stallId}
                className="thermal-ticket thermal-page-break bg-white text-black font-mono text-[11px] leading-[1.45] px-3.5 py-4 shadow-[0_2px_18px_rgba(0,0,0,0.18)]"
              >
                {/* Header */}
                <div className="text-center">
                  <div className="text-[14px] font-black tracking-[0.05em] leading-tight">
                    {FOOD_COURT_INFO.name}
                  </div>
                  <div className="text-[11.5px] font-bold tracking-wide mt-0.5">
                    {stall.stallName}
                  </div>
                </div>

                <Dash />

                <div className="text-center text-[13px] font-bold tracking-[0.16em] uppercase">
                  Kitchen Orders
                </div>
                <div className="mt-1 space-y-0.5">
                  <div className="text-[10.5px]">Invoice No:{invoiceNo}</div>
                  <div className="text-[11.5px] font-black">
                    {isUpdatedOrder ? 'Updated Order' : 'New Order'}
                  </div>
                </div>

                <Dash />

                {/* Items: quantity first, then food name */}
                <div className="space-y-0.5">
                  {stall.items.map((item, idx) => {
                    const extras = [
                      item.variantName ? `Size: ${item.variantName}` : null,
                      item.addOnNames && item.addOnNames.length > 0
                        ? `+ ${item.addOnNames.join(', ')}`
                        : null,
                    ].filter(Boolean) as string[];
                    return (
                      <div key={`${stall.stallId}-${idx}`}>
                        <div className="text-[14.5px] font-bold leading-snug break-words">
                          {item.quantity}-:{item.name}
                        </div>
                        {extras.length > 0 && (
                          <div className="text-[9px] leading-snug break-words pl-1">
                            {extras.join(' • ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[9px] leading-snug break-words pl-1">
                            Note: {item.notes}
                          </div>
                        )}
                        {idx < stall.items.length - 1 && (
                          <div className="border-t border-dashed border-black my-1" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <Dash />

                {/* Time, token & service details */}
                <div className="flex items-start justify-between gap-2">
                  <span>Date:{formatReceiptDate(order.createdAt)}</span>
                  <span>Time:{formatReceiptTime(order.createdAt)}</span>
                </div>
                <div className="text-[17px] font-black tracking-wide leading-tight">
                  Token No:{order.token}
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span>{tableLabel}</span>
                  <span>Guests:{guestCount}</span>
                </div>
                <div className="text-[9.5px] break-words">
                  Guest: {order.customerName || 'Guest'}
                </div>
                {order.customerPhone && (
                  <div className="text-[9.5px] break-words">Phone: {order.customerPhone}</div>
                )}
                <div className="text-[9.5px] break-words">Order Type: {orderType}</div>
                <div className="text-[9.5px] break-words">Service: {serviceLabel}</div>
                <div className="text-[9.5px] break-words">
                  Notes: {order.customerNotes || '-'}
                </div>

                <DoubleDash />

                {/* Kiwee Tech footer (no social link on kitchen tickets) */}
                <div className="text-center space-y-0.5">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-[8.5px] font-bold tracking-wide">Powered by</span>
                    <img
                      src={KIWEE_LOGO}
                      alt="Kiwee Tech"
                      className="h-5 w-auto object-contain"
                    />
                  </div>
                  <div className="text-[10px] font-bold tracking-wide">
                    {FOOD_COURT_INFO.phone}
                  </div>
                  {ticketIndex < tickets.length - 1 && (
                    <div className="text-[8px] text-zinc-600 no-print">— next stall ticket below —</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-zinc-100 border-t border-zinc-200 flex justify-end gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            <Printer className="w-4 h-4" />
            <span>
              Print {tickets.length} KOT Ticket{tickets.length === 1 ? '' : 's'} (80mm)
            </span>
          </button>
        </div>
      </div>

      <style>{THERMAL_PRINT_CSS}</style>
    </div>
  );
};
