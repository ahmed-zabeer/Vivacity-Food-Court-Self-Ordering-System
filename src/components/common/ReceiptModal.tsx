import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Order } from '../../types';
import { X, Printer, CheckCircle2, Clock } from 'lucide-react';
import {
  FOOD_COURT_INFO,
  KIWEE_LOGO,
  THERMAL_PRINT_CSS,
  formatReceiptDate,
  formatReceiptTime,
  money,
  orderTypeLabel,
} from '../../config/receipt';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const [fbQrDataUrl, setFbQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (FOOD_COURT_INFO.facebook) {
      QRCode.toDataURL(FOOD_COURT_INFO.facebook, {
        width: 72,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
        .then(url => setFbQrDataUrl(url))
        .catch(err => console.error('Failed to generate Facebook QR code:', err));
    }
  }, []);

  if (!order) return null;

  const isPaid = order.paymentStatus === 'PAID';
  const invoiceNo = order.invoiceNo || order.token;
  const guestCount = Number(order.guestCount || 0);
  const paidAmount = isPaid ? order.grandTotal : 0;
  const returnedAmount = isPaid ? Number((order as any).returnedAmount || 0) : 0;
  const stallNames = Array.from(new Set(order.stalls.map((s) => s.stallName))).join(' • ');
  const tableLabel = order.tableId ? `Table ${order.tableId}` : 'Takeaway';
  const serviceLabel =
    order.serviceType === 'TABLE_SERVICE' ? 'Table Service' : 'Self-Service';

  const handlePrint = () => {
    try {
      if (order && order.id) {
        import('../../services/api').then(({ api }) => {
          api.logReceiptReprint(order.id, order.cashierName || 'Cashier Counter', 'Thermal Print Requested').catch(() => {});
        });
      }
    } catch {}
    window.print();
  };

  const Dash = () => <div className="border-t border-dashed border-black my-1" />;
  const DoubleDash = () => (
    <div className="border-t-2 border-dashed border-black my-1.5" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Actions */}
        <div className="p-3.5 sm:p-4 bg-zinc-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Guest Receipt
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

        {/* Digital receipt paper — mirrors the 80mm thermal print */}
        <div className="overflow-y-auto bg-[#e9e6df] p-3 sm:p-5">
          <div className="thermal-print-root mx-auto w-full max-w-[340px] bg-white text-black font-mono text-[11px] leading-[1.45] px-3.5 py-4 shadow-[0_2px_18px_rgba(0,0,0,0.18)]">
            {/* Header */}
            <div className="text-center">
              <div className="text-[15px] font-black tracking-[0.06em] leading-tight">
                {FOOD_COURT_INFO.name}
              </div>
              {stallNames && (
                <div className="text-[12px] font-bold tracking-wide mt-0.5">
                  {stallNames}
                </div>
              )}
              <div className="text-[9px] mt-1 leading-snug">{FOOD_COURT_INFO.addressLine1}</div>
              <div className="text-[9px] leading-snug">{FOOD_COURT_INFO.addressLine2}</div>
              <div className="text-[9px] leading-snug">Phone# {FOOD_COURT_INFO.phone}</div>
              <div className="text-[9px] leading-snug">BIN:{FOOD_COURT_INFO.bin}</div>
              <div className="text-[9px] leading-snug">Mushak-{FOOD_COURT_INFO.mushak}</div>
            </div>

            <Dash />
            <Dash />

            {/* Bill heading */}
            <div className="text-center text-[13px] font-black tracking-wide">
              {isPaid ? 'Paid Bill' : 'Payment Pending'}
            </div>
            {!isPaid && (
              <div className="text-center text-[8.5px] font-bold">
                Awaiting Central Counter confirmation
              </div>
            )}

            <div className="mt-1 space-y-0.5">
              <div className="flex items-start justify-between gap-2">
                <span>Date:{formatReceiptDate(order.createdAt)}</span>
                <span>Time:{formatReceiptTime(order.createdAt)}</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="truncate">Invoice No:{invoiceNo}</span>
                <span className="shrink-0">Number Of Guests:{guestCount}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span>Order Source:</span>
                <span className="font-bold uppercase">
                  {order.orderSource === 'MANUAL_COUNTER' ? 'Manual Counter' : 'Online / QR'}
                </span>
              </div>
              {order.cashierName && (
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span>Cashier:</span>
                  <span className="font-bold">{order.cashierName}</span>
                </div>
              )}
              {order.reprintCount && order.reprintCount > 0 ? (
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-amber-700">
                  <span>Reprint Copy:</span>
                  <span>#{order.reprintCount}</span>
                </div>
              ) : null}
              <div className="text-[16px] font-black tracking-wide leading-tight pt-0.5">
                Token No:{order.token}
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[13px] font-black">{tableLabel}</span>
                <span className="text-[10.5px] text-right font-bold">{serviceLabel}</span>
              </div>
              <div className="text-[11px] font-black break-words mt-0.5">
                Order Type: {orderTypeLabel(order)}
              </div>
              {(order.customerName || order.customerPhone) && (
                <div className="text-[12px] font-black break-words mt-0.5">
                  Guest: {order.customerName || 'Guest'}
                  {order.customerPhone ? ` • ${order.customerPhone}` : ''}
                </div>
              )}
            </div>

            <Dash />

            {/* Column headings */}
            <div className="flex items-end gap-1 text-[10.5px] font-black">
              <span className="w-6 shrink-0">Qty</span>
              <span className="flex-1 min-w-0">Item Name</span>
              <span className="w-12 text-right shrink-0">Price</span>
              <span className="w-12 text-right shrink-0">T.Price</span>
            </div>
            <Dash />

            {/* Items grouped by stall */}
            <div className="space-y-1">
              {order.stalls.map((stall) => (
                <div key={stall.stallId} className="space-y-0.5">
                  {order.stalls.length > 1 && (
                    <div className="text-[10px] font-black uppercase tracking-wide">
                      {stall.stallName}
                    </div>
                  )}
                  {stall.items.map((item, idx) => {
                    const unit = Number(item.price || 0);
                    const lineTotal = unit * Number(item.quantity || 0);
                    const extras = [
                      item.variantName ? `Size: ${item.variantName}` : null,
                      item.addOnNames && item.addOnNames.length > 0
                        ? `+ ${item.addOnNames.join(', ')}`
                        : null,
                    ].filter(Boolean) as string[];
                    return (
                      <div key={`${stall.stallId}-${idx}`} className="text-[11.5px] font-semibold">
                        <div className="flex items-start gap-1">
                          <span className="w-6 shrink-0 font-black">-{item.quantity}</span>
                          <span className="flex-1 min-w-0 break-words font-bold">{item.name}</span>
                          <span className="w-12 text-right shrink-0">{money(unit)}</span>
                          <span className="w-12 text-right shrink-0 font-black">{money(lineTotal)}</span>
                        </div>
                        {extras.length > 0 && (
                          <div className="pl-6 text-[9px] leading-snug break-words font-normal">
                            {extras.join(' • ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="pl-6 text-[9px] leading-snug break-words font-normal italic">
                            Note: {item.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <Dash />

            {/* Financial breakdown: Subtotal -> Service Charge -> Discount -> VAT -> Net Total */}
            <div className="space-y-0.5 text-[10.5px]">
              <div className="flex justify-between gap-2 font-bold">
                <span>Subtotal:</span>
                <span>৳{money(order.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Service Charge:</span>
                <span>৳{money(order.serviceCharge || 0)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Discount{order.discountPercent ? ` (${order.discountPercent}%)` : ''}:</span>
                <span>-৳{money(order.discount || 0)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>VAT:</span>
                <span>৳{money(order.tax || 0)}</span>
              </div>
            </div>

            <Dash />

            <div className="flex justify-between gap-2 font-black text-[13px]">
              <span>Net Total:</span>
              <span>৳{money(order.grandTotal)}</span>
            </div>

            <DoubleDash />

            {/* Payments */}
            <div className="text-[10.5px] font-bold">Payments:</div>
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between gap-2">
                <span>-{order.paymentMethod}:</span>
                <span>{money(paidAmount)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>-Payment Status:</span>
                <span className="font-bold uppercase">{order.paymentStatus}</span>
              </div>
              {order.paymentMethod === 'CASH' && order.cashReceived !== undefined && order.cashReceived !== null && (
                <div className="flex justify-between gap-2">
                  <span>-Cash Received:</span>
                  <span>{money(order.cashReceived)}</span>
                </div>
              )}
              {order.paymentMethod === 'CASH' && (order.changeReturned !== undefined && order.changeReturned !== null || returnedAmount > 0) && (
                <div className="flex justify-between gap-2 font-bold">
                  <span>-Change Returned:</span>
                  <span>{money(order.changeReturned !== undefined && order.changeReturned !== null ? order.changeReturned : returnedAmount)}</span>
                </div>
              )}
              {order.cardPosRef && (
                <div className="flex justify-between gap-2 font-bold">
                  <span>-POS Card Ref:</span>
                  <span className="font-mono">{order.cardPosRef}</span>
                </div>
              )}
              {order.cardPosTerminal && (
                <div className="flex justify-between gap-2 text-[9px] text-zinc-600">
                  <span>-Terminal:</span>
                  <span>{order.cardPosTerminal}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 font-bold">
                <span>-TOTAL PAYMENT:</span>
                <span>{money(paidAmount)}</span>
              </div>
              {order.paymentMethod !== 'CASH' && returnedAmount > 0 && (
                <div className="flex justify-between gap-2">
                  <span>-RETURNED AMOUNT:</span>
                  <span>{money(returnedAmount)}</span>
                </div>
              )}
              {!isPaid && (
                <div className="flex justify-between gap-2 pt-0.5 font-bold text-red-600">
                  <span>-AMOUNT DUE:</span>
                  <span>{money(order.grandTotal)}</span>
                </div>
              )}
            </div>

            <DoubleDash />

            {/* Notes */}
            <div className="text-[10px] font-bold">Notes:</div>
            {order.customerNotes && (
              <div className="text-[9.5px] leading-snug break-words">{order.customerNotes}</div>
            )}

            {/* Footer */}
            <div className="text-center mt-2 space-y-1">
              <div className="text-[10px] font-bold tracking-wide">THANK YOU, COME AGAIN</div>
              <div className="flex items-center justify-center gap-1">
                <span className="text-[9px] font-bold tracking-wide">Powered by</span>
                <img
                  src={KIWEE_LOGO}
                  alt="Kiwee Tech"
                  className="h-6 w-auto object-contain"
                />
              </div>
              <div className="text-[10px] font-bold tracking-wide">{FOOD_COURT_INFO.phone}</div>
              <div className="flex flex-col items-center justify-center my-1.5 space-y-0.5">
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-600">
                  Follow Us on Facebook
                </span>
                {fbQrDataUrl ? (
                  <img
                    src={fbQrDataUrl}
                    alt="Official Facebook QR Code"
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 border border-dashed border-zinc-300 flex items-center justify-center text-[8px] text-zinc-400">
                    QR Code
                  </div>
                )}
              </div>
              <div className="text-[8px] flex items-center justify-center gap-1 pt-0.5">
                {isPaid ? (
                  <>
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>PAID • {order.paymentMethod}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-2.5 h-2.5" />
                    <span>PAYMENT PENDING</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print Button Footer */}
        <div className="p-3.5 sm:p-4 bg-zinc-100 border-t border-zinc-200 flex justify-end gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt (80mm)</span>
          </button>
        </div>
      </div>

      <style>{THERMAL_PRINT_CSS}</style>
    </div>
  );
};
