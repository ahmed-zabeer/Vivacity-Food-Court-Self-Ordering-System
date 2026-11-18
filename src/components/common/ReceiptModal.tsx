import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';
import { Order, StallSubOrder } from '../../types';
import { X, Printer, CheckCircle2, Clock, ChefHat, Receipt, ArrowRight } from 'lucide-react';
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
  /** If true, automatically start sequential print (KOT first → Guest Receipt) on open */
  autoSequentialPrint?: boolean;
}

type StallItem = StallSubOrder['items'][number];

interface StallGroup {
  stallId: string;
  stallName: string;
  items: StallItem[];
}

interface GroupedKOTTicket {
  id: string;
  stationTitle: string;
  stationBadge: string;
  stationType: 'COMBINED' | 'DRINKS' | 'WAFFLE';
  stalls: StallGroup[];
  totalItemsCount: number;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, autoSequentialPrint = false }) => {
  // For Manual Counter orders default to KOT first; for QR orders default to RECEIPT
  const isManualOrder = order?.orderSource === 'MANUAL_COUNTER';
  const [activeTab, setActiveTab] = useState<'RECEIPT' | 'KOT'>(isManualOrder ? 'KOT' : 'RECEIPT');
  const [fbQrDataUrl, setFbQrDataUrl] = useState<string>('');
  const [seqPrintState, setSeqPrintState] = useState<'idle' | 'step1' | 'step2' | 'done'>('idle');
  const seqPrintRef = useRef(false);

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

  // Auto-sequential print: open with KOT, trigger print, then switch to RECEIPT and trigger print
  const runSequentialPrint = useCallback(() => {
    if (seqPrintRef.current) return;
    seqPrintRef.current = true;
    setSeqPrintState('step1');
    // Switch to KOT tab and print
    setActiveTab('KOT');
    setTimeout(() => {
      window.print();
      const afterKOT = () => {
        window.removeEventListener('afterprint', afterKOT);
        // After KOT printed, switch to RECEIPT and print
        setSeqPrintState('step2');
        setActiveTab('RECEIPT');
        setTimeout(() => {
          window.print();
          const afterReceipt = () => {
            window.removeEventListener('afterprint', afterReceipt);
            setSeqPrintState('done');
            seqPrintRef.current = false;
          };
          window.addEventListener('afterprint', afterReceipt);
        }, 600);
      };
      window.addEventListener('afterprint', afterKOT);
    }, 600);
  }, []);

  // Auto-trigger sequential print on mount for Manual Counter orders
  useEffect(() => {
    if (autoSequentialPrint && isManualOrder && order) {
      // Small delay to let DOM render first
      const timer = setTimeout(() => {
        runSequentialPrint();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoSequentialPrint, isManualOrder, order, runSequentialPrint]);

  // Group KOTs according to EXACT KOT Rules:
  // - Combined Kitchen KOT: all stalls EXCEPT Drinks & Beverage and Waffle City
  // - Separate Drinks & Beverage KOT
  // - Separate Waffle City KOT
  const kotTickets: GroupedKOTTicket[] = useMemo(() => {
    if (!order) return [];
    const result: GroupedKOTTicket[] = [];

    // 1. Separate Drinks & Beverage Station KOT
    const drinksStall = order.stalls.find(s => s.stallId === 'drinks-beverage');
    if (drinksStall && drinksStall.items && drinksStall.items.length > 0) {
      result.push({
        id: 'drinks-beverage',
        stationTitle: 'DRINKS & BEVERAGE STATION',
        stationBadge: 'Drinks & Beverage Station',
        stationType: 'DRINKS',
        stalls: [
          {
            stallId: drinksStall.stallId,
            stallName: drinksStall.stallName,
            items: drinksStall.items
          }
        ],
        totalItemsCount: drinksStall.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)
      });
    }

    // 2. Separate Waffle City Station KOT
    const waffleStall = order.stalls.find(s => s.stallId === 'waffle-city');
    if (waffleStall && waffleStall.items && waffleStall.items.length > 0) {
      result.push({
        id: 'waffle-city',
        stationTitle: 'WAFFLE CITY DESSERT STATION',
        stationBadge: 'Waffle City Dessert Station',
        stationType: 'WAFFLE',
        stalls: [
          {
            stallId: waffleStall.stallId,
            stallName: waffleStall.stallName,
            items: waffleStall.items
          }
        ],
        totalItemsCount: waffleStall.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)
      });
    }

    // 3. ONE Combined Kitchen KOT for all other stalls
    const otherStalls = order.stalls.filter(
      s => s.stallId !== 'drinks-beverage' && s.stallId !== 'waffle-city' && s.items && s.items.length > 0
    );

    if (otherStalls.length > 0) {
      const totalCount = otherStalls.reduce(
        (sum, s) => sum + s.items.reduce((stSum, i) => stSum + (Number(i.quantity) || 1), 0),
        0
      );

      result.push({
        id: 'combined-kitchen',
        stationTitle: 'MAIN KITCHEN ORDERS (COMBINED)',
        stationBadge: otherStalls.length > 1
          ? `Combined Kitchen (${otherStalls.map(s => s.stallName).join(', ')})`
          : otherStalls[0].stallName,
        stationType: 'COMBINED',
        stalls: otherStalls.map(s => ({
          stallId: s.stallId,
          stallName: s.stallName,
          items: s.items
        })),
        totalItemsCount: totalCount
      });
    }

    return result;
  }, [order]);

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

  const kotEvents = order.history.filter((h) =>
    /KOT\s+\S+\s+generated/i.test(h.note || '')
  ).length;
  const isUpdatedOrder = kotEvents > 1;

  const handlePrint = () => {
    try {
      if (order && order.id) {
        import('../../services/api').then(({ api }) => {
          api.logReceiptReprint(
            order.id,
            order.cashierName || 'Cashier Counter',
            activeTab === 'RECEIPT' ? 'Guest Receipt Print' : 'Kitchen KOT Print'
          ).catch(() => {});
        });
      }
    } catch {}
    window.print();
  };

  const handlePrintKOT = () => {
    setActiveTab('KOT');
    setTimeout(() => window.print(), 400);
  };

  const handlePrintReceipt = () => {
    setActiveTab('RECEIPT');
    setTimeout(() => window.print(), 400);
  };

  const Dash = () => <div className="border-t border-dashed border-black my-1" />;
  const DoubleDash = () => (
    <div className="border-t-2 border-dashed border-black my-1.5" />
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header & Tab Switcher (No Print) */}
        <div className="p-3 sm:p-4 bg-zinc-950 text-white flex flex-col gap-2.5 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Order Processed (Token #{order.token})
              </span>
              {order.orderSource === 'MANUAL_COUNTER' && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-900 text-[9px] font-black uppercase tracking-wider">
                  Manual Counter
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isManualOrder && (
                <button
                  onClick={runSequentialPrint}
                  disabled={seqPrintState === 'step1' || seqPrintState === 'step2'}
                  className="p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px] font-black"
                  title="Auto Print: KOT first, then Guest Receipt"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <ArrowRight className="w-3 h-3" />
                  <span>{seqPrintState === 'step1' ? 'KOT…' : seqPrintState === 'step2' ? 'Receipt…' : seqPrintState === 'done' ? '✓ Done' : 'Auto Print'}</span>
                </button>
              )}
              <button
                onClick={handlePrint}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Print Current View"
              >
                <Printer className="w-4 h-4 text-amber-400" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Toggle between Guest Receipt and Kitchen KOTs */}
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab('RECEIPT')}
              className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'RECEIPT'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Guest Memo (80mm)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('KOT')}
              className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'KOT'
                  ? 'bg-white text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 text-amber-500" />
              <span>Kitchen KOT ({kotTickets.length})</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: GUEST CASH MEMO / RECEIPT (80mm)
           ========================================================================= */}
        {activeTab === 'RECEIPT' && (
          <div className="overflow-y-auto bg-[#e9e6df] p-3 sm:p-5 flex-1 min-h-0">
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
                <div className="text-[9px] leading-snug">BIN: {FOOD_COURT_INFO.bin}</div>
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
                  <span>Date: {formatReceiptDate(order.createdAt)}</span>
                  <span>Time: {formatReceiptTime(order.createdAt)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate">Invoice No: {invoiceNo}</span>
                  <span className="shrink-0">Guests: {guestCount}</span>
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
                <div className="text-[16px] font-black tracking-wide leading-tight pt-0.5">
                  Token No: {order.token}
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

              {/* Financial breakdown */}
              <div className="space-y-0.5 text-[10.5px]">
                <div className="flex justify-between gap-2 font-bold">
                  <span>Subtotal:</span>
                  <span>৳{money(order.subtotal)}</span>
                </div>
                {order.serviceCharge ? (
                  <div className="flex justify-between gap-2">
                    <span>Service Charge (5%):</span>
                    <span>৳{money(order.serviceCharge)}</span>
                  </div>
                ) : null}
                {order.discount ? (
                  <div className="flex justify-between gap-2 text-emerald-700 font-bold">
                    <span>Discount{order.discountPercent ? ` (${order.discountPercent}%)` : ''}:</span>
                    <span>-৳{money(order.discount)}</span>
                  </div>
                ) : null}
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
                  <span>Method:</span>
                  <span className="font-bold">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>Status:</span>
                  <span className="font-bold uppercase">{order.paymentStatus}</span>
                </div>
                {order.paymentMethod === 'CASH' && order.cashReceived !== undefined && order.cashReceived !== null && (
                  <div className="flex justify-between gap-2">
                    <span>Cash Received:</span>
                    <span className="font-bold">{money(order.cashReceived)}</span>
                  </div>
                )}
                {order.paymentMethod === 'CASH' && (order.changeReturned !== undefined && order.changeReturned !== null || returnedAmount > 0) && (
                  <div className="flex justify-between gap-2 font-bold">
                    <span>Change Returned:</span>
                    <span>{money(order.changeReturned !== undefined && order.changeReturned !== null ? order.changeReturned : returnedAmount)}</span>
                  </div>
                )}
                {order.cardPosRef && (
                  <div className="flex justify-between gap-2 font-bold">
                    <span>POS Card Slip Ref:</span>
                    <span className="font-mono">{order.cardPosRef}</span>
                  </div>
                )}
                {order.cardPosTerminal && (
                  <div className="flex justify-between gap-2 text-[9px] text-zinc-600">
                    <span>Terminal:</span>
                    <span>{order.cardPosTerminal}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2 font-bold pt-0.5">
                  <span>TOTAL PAID:</span>
                  <span>{money(paidAmount)}</span>
                </div>
              </div>

              <DoubleDash />

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
                  ) : null}
                </div>
                <div className="text-[8px] flex items-center justify-center gap-1 pt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  <span>PAID • {order.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: KITCHEN ORDER TICKETS (EXACT GROUPING RULES)
            - 1 Combined Kitchen KOT for all regular stalls
            - 1 Dedicated Drinks & Beverage Station KOT
            - 1 Dedicated Waffle City Dessert Station KOT
           ========================================================================= */}
        {activeTab === 'KOT' && (
          <div className="overflow-y-auto bg-[#e9e6df] p-3 sm:p-4 flex-1 min-h-0">
            <div className="thermal-print-root mx-auto w-full max-w-[320px] space-y-3">
              {kotTickets.length === 0 ? (
                <div className="p-4 bg-white text-center text-xs font-bold text-zinc-500">
                  No kitchen items to print.
                </div>
              ) : (
                kotTickets.map((ticket, ticketIndex) => (
                  <div
                    key={ticket.id}
                    className="thermal-ticket thermal-page-break bg-white text-black font-mono text-[11px] leading-[1.45] px-3.5 py-4 shadow-[0_2px_18px_rgba(0,0,0,0.18)]"
                  >
                    {/* Header */}
                    <div className="text-center">
                      <div className="text-[14px] font-black tracking-[0.05em] leading-tight">
                        {FOOD_COURT_INFO.name}
                      </div>
                      <div className="text-[12.5px] font-black tracking-wide mt-0.5 text-zinc-900">
                        {ticket.stationTitle}
                      </div>
                    </div>

                    <Dash />

                    <div className="text-center text-[12px] font-bold tracking-[0.14em] uppercase">
                      Kitchen Order Ticket
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <div className="text-[10.5px]">Invoice No: {invoiceNo}</div>
                      <div className="text-[10px] text-zinc-600">Order ID: {order.id}</div>
                      <div className="text-[11.5px] font-black">
                        {isUpdatedOrder ? 'Updated Order' : 'New Order'}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wide">
                        Source: {order.orderSource === 'MANUAL_COUNTER' ? 'Manual Counter' : 'QR / Online'}
                      </div>
                    </div>

                    <Dash />

                    {/* Items: For Combined Kitchen KOT, clearly separate stalls */}
                    <div className="space-y-2">
                      {ticket.stalls.map((stallGroup, sIdx) => (
                        <div key={stallGroup.stallId} className="space-y-1">
                          {ticket.stationType === 'COMBINED' && ticket.stalls.length > 1 && (
                            <div className="bg-black text-white px-2 py-0.5 my-1 text-[11px] font-black uppercase tracking-wider text-center">
                              — {stallGroup.stallName} —
                            </div>
                          )}

                          {stallGroup.items.map((item, idx) => {
                            const extras = [
                              item.variantName ? `Size: ${item.variantName}` : null,
                              item.addOnNames && item.addOnNames.length > 0
                                ? `+ ${item.addOnNames.join(', ')}`
                                : null,
                            ].filter(Boolean) as string[];

                            return (
                              <div key={`${stallGroup.stallId}-${idx}`}>
                                <div className="text-[15.5px] font-black leading-snug break-words">
                                  {item.quantity}-: {item.name}
                                </div>
                                {extras.length > 0 && (
                                  <div className="text-[9.5px] leading-snug break-words pl-1 font-semibold">
                                    {extras.join(' • ')}
                                  </div>
                                )}
                                {item.notes && (
                                  <div className="text-[9.5px] leading-snug break-words pl-1 font-semibold">
                                    Note: {item.notes}
                                  </div>
                                )}
                                {idx < stallGroup.items.length - 1 && (
                                  <div className="border-t border-dashed border-zinc-400 my-1" />
                                )}
                              </div>
                            );
                          })}

                          {sIdx < ticket.stalls.length - 1 && (
                            <div className="border-t-2 border-dashed border-black my-1.5" />
                          )}
                        </div>
                      ))}
                    </div>

                    <Dash />

                    {/* Time, token & service details */}
                    <div className="flex items-start justify-between gap-2 text-[10px]">
                      <span>Date: {formatReceiptDate(order.createdAt)}</span>
                      <span>Time: {formatReceiptTime(order.createdAt)}</span>
                    </div>
                    <div className="text-[17px] font-black tracking-wide leading-tight">
                      Token No: {order.token}
                    </div>
                    <div className="flex items-center justify-between gap-2 my-0.5">
                      <span className="text-[15px] font-black tracking-wide">{tableLabel}</span>
                      <span className="text-[10px] font-semibold">Guests: {guestCount}</span>
                    </div>
                    <div className="text-[12px] font-black break-words mt-0.5">
                      Guest: {order.customerName || 'Guest'}
                      {order.customerPhone ? ` • ${order.customerPhone}` : ''}
                    </div>
                    <div className="text-[11.5px] font-black break-words">
                      Order Type: {orderTypeLabel(order)}
                    </div>
                    <div className="text-[12px] font-black break-words tracking-wide">
                      Service: {serviceLabel}
                    </div>
                    {order.customerNotes && (
                      <div className="text-[9.5px] break-words">
                        Notes: {order.customerNotes}
                      </div>
                    )}

                    <DoubleDash />

                    {/* Footer */}
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
                      {ticketIndex < kotTickets.length - 1 && (
                        <div className="text-[8px] text-zinc-600 no-print pt-1">
                          — next station ticket below —
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Print Button Footer (No Print) */}
        <div className="p-3.5 sm:p-4 bg-zinc-100 border-t border-zinc-200 flex items-center justify-between gap-2 no-print">
          <span className="text-[11px] font-bold text-zinc-600">
            {activeTab === 'RECEIPT'
              ? 'Guest Memo (80mm)'
              : `${kotTickets.length} KOT Ticket${kotTickets.length === 1 ? '' : 's'}`}
          </span>
          <div className="flex items-center gap-2">
            {isManualOrder && (
              <>
                <button
                  onClick={handlePrintKOT}
                  className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-800 text-white px-3 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs active:scale-95"
                  title="Reprint Kitchen KOT Only"
                >
                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                  <span>KOT</span>
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-800 text-white px-3 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs active:scale-95"
                  title="Reprint Guest Receipt Only"
                >
                  <Receipt className="w-3.5 h-3.5 text-sky-400" />
                  <span>Receipt</span>
                </button>
              </>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-zinc-950 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>
                Print {activeTab === 'RECEIPT' ? 'Guest Memo' : `KOTs (${kotTickets.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style>{THERMAL_PRINT_CSS}</style>
    </div>
  );
};
