import React, { useMemo } from 'react';
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

export const KOTPrintView: React.FC<KOTPrintViewProps> = ({ order, stallFilter, onClose }) => {
  if (!order) return null;

  // Exact KOT Grouping Rules:
  // 1. Combined Kitchen KOT: All stalls EXCEPT 'drinks-beverage' and 'waffle-city'
  // 2. Drinks & Beverage KOT: ONLY 'drinks-beverage'
  // 3. Waffle City KOT: ONLY 'waffle-city'
  // Stalls inside Combined Kitchen KOT are clearly separated by stall name headers.
  const tickets: GroupedKOTTicket[] = useMemo(() => {
    if (!order) return [];

    // If stallFilter is specifically set, only render that stall
    if (stallFilter) {
      const singleStall = order.stalls.find(s => s.stallId === stallFilter);
      if (!singleStall || singleStall.items.length === 0) return [];

      let title = singleStall.stallName.toUpperCase();
      let type: 'COMBINED' | 'DRINKS' | 'WAFFLE' = 'COMBINED';
      if (stallFilter === 'drinks-beverage') {
        title = 'DRINKS & BEVERAGE STATION';
        type = 'DRINKS';
      } else if (stallFilter === 'waffle-city') {
        title = 'WAFFLE CITY DESSERT STATION';
        type = 'WAFFLE';
      }

      return [
        {
          id: stallFilter,
          stationTitle: title,
          stationBadge: singleStall.stallName,
          stationType: type,
          stalls: [
            {
              stallId: singleStall.stallId,
              stallName: singleStall.stallName,
              items: singleStall.items
            }
          ],
          totalItemsCount: singleStall.items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)
        }
      ];
    }

    const result: GroupedKOTTicket[] = [];

    // A. Separate Drinks & Beverage Station KOT
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

    // B. Separate Waffle City Station KOT
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

    // C. ONE Combined Kitchen KOT for all other stalls
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
  }, [order, stallFilter]);

  const invoiceNo = order.invoiceNo || order.token;
  const guestCount = Number(order.guestCount || 0);
  const tableLabel = order.tableId ? `Table ${order.tableId}` : 'Takeaway';
  const serviceLabel =
    order.serviceType === 'TABLE_SERVICE' ? 'Table Service' : 'Self-Service';
  const orderType = orderTypeLabel(order);

  const kotEvents = order.history.filter((h) =>
    /KOT\s+\S+\s+generated/i.test(h.note || '')
  ).length;
  const isUpdatedOrder = kotEvents > 1;

  const handlePrint = () => {
    try {
      import('../../services/api').then(({ api }) => {
        api.logReceiptReprint(order.id, order.cashierName || 'Cashier Counter', 'KOT Thermal Print Requested').catch(() => {});
      });
    } catch {}
    window.print();
  };

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
              Kitchen Order Tickets (KOT)
            </span>
            <span className="block text-[10px] text-zinc-400 font-medium">
              {tickets.length} ticket{tickets.length === 1 ? '' : 's'} • Token {order.token}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Print KOT Tickets"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thermal KOT sheets — strictly grouped: Combined Kitchen, Drinks & Beverage, Waffle City */}
        <div className="overflow-y-auto bg-[#e9e6df] p-3 sm:p-4">
          <div className="thermal-print-root mx-auto w-full max-w-[320px] space-y-3">
            {tickets.map((ticket, ticketIndex) => (
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
                  <div className="text-[11.5px] font-black">
                    {isUpdatedOrder ? 'Updated Order' : 'New Order'}
                  </div>
                </div>

                <Dash />

                {/* Items Container: Stalls clearly separated inside Combined Ticket */}
                <div className="space-y-2">
                  {ticket.stalls.map((stallGroup, sIdx) => (
                    <div key={stallGroup.stallId} className="space-y-1">
                      {/* For Combined Kitchen KOT with multiple stalls, render clear stall separator */}
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
                  Order Type: {orderType}
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
                  {ticketIndex < tickets.length - 1 && (
                    <div className="text-[8px] text-zinc-600 no-print pt-1">
                      — next station ticket below —
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-zinc-100 border-t border-zinc-200 flex justify-end gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
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
