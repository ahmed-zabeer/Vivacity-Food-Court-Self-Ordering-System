import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useTableSession } from '../../context/TableSessionContext';
import { useLocation } from 'wouter';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { Plus, Minus, Trash2, ArrowRight, Tag, Store, ShoppingBag, UtensilsCrossed, Package, AlertTriangle } from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    items,
    groupedByStall,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discount,
    couponCode,
    applyCoupon,
    removeCoupon,
    grandTotal,
    itemCount,
    orderType,
    setOrderType,
    unavailableCartItems,
    hasUnavailableItems,
    removeUnavailableItems,
    isMenuItemAvailable,
    isCartItemOutOfStock
  } = useCart();

  const { tableId, isTakeaway } = useTableSession();
  const [, setLocation] = useLocation();

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [pausedStallNames, setPausedStallNames] = useState<string[]>([]);

  useEffect(() => {
    const checkStalls = async () => {
      try {
        const stallList = await api.getStalls();
        const pausedIds = new Set(stallList.filter(s => s.isPaused).map(s => s.id));
        const pausedNames = Array.from(new Set(
          items
            .filter(i => pausedIds.has(i.stallId))
            .map(i => i.stallName || i.stallId)
        ));
        setPausedStallNames(pausedNames);
      } catch {}
    };
    checkStalls();
    const unsub = realtime.on('stall_updated', checkStalls);
    return () => unsub();
  }, [items]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const ok = applyCoupon(couponInput.trim());
    if (ok) {
      setCouponMsg({ text: `Coupon ${couponInput.toUpperCase()} applied successfully!` });
      setCouponInput('');
    } else {
      setCouponMsg({ text: 'Invalid coupon or minimum spend not met. Try "VIVA10"', error: true });
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto w-full p-6 py-10 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4 text-zinc-400">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-zinc-900 tracking-tight">
          Your Food Tray is Empty
        </h2>
        <p className="text-xs text-zinc-500 max-w-xs mt-1.5 leading-relaxed">
          Explore all 6 food stalls, pick your favorite steaks, momos, and burgers, and add them here.
        </p>
        <button
          onClick={() => setLocation('/')}
          className="mt-6 px-6 py-3 rounded-full bg-brand-500 text-white font-bold text-xs shadow-md hover:bg-brand-600 transition-colors"
        >
          Explore Food Court Stalls
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-full md:max-w-2xl mx-auto w-full p-4 sm:p-6 pb-4 sm:pb-6 space-y-4 overflow-x-hidden">
      {/* Table Context Banner */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/90 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-600">
            Delivery Location
          </span>
          <h2 className="text-sm font-black text-zinc-900">
            {tableId && !isTakeaway ? `Serving to Table ${tableId}` : 'Takeaway / Parcel Order'}
          </h2>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-red-600 hover:text-red-700 p-1 flex items-center gap-1 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Tray</span>
        </button>
      </div>

      {/* Out of Stock Warning Banner */}
      {hasUnavailableItems && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-4 space-y-2.5 text-xs text-red-900 shadow-sm animate-pulse">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-black text-sm text-red-900">
                Item(s) Out of Stock (Stock Out)
              </h3>
              <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                {unavailableCartItems.length === 1
                  ? `"${unavailableCartItems[0].name}" is currently out of stock.`
                  : `${unavailableCartItems.length} dishes in your food tray are currently out of stock.`
                }{' '}
                You must remove unavailable item(s) from your tray before checkout.
              </p>
            </div>
            <button
              type="button"
              onClick={removeUnavailableItems}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] shrink-0 transition-colors cursor-pointer shadow-xs"
            >
              Remove Sold Out
            </button>
          </div>
        </div>
      )}

      {/* Paused Stall Warning Banner */}
      {pausedStallNames.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 space-y-2 text-xs text-amber-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-black text-sm text-amber-900">
                Stall Temporarily Unavailable
              </h3>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Items in your tray from <strong>{pausedStallNames.join(', ')}</strong> cannot be ordered right now because the stall is temporarily paused. Please remove them or wait for the stall to resume.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER TYPE SELECTOR (Dine-in / Takeaway) ================= */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Order Type
            </h3>
            <span className="text-red-600 font-black">*</span>
          </div>
          <span className={`text-[10px] font-bold ${orderType ? 'text-zinc-500 font-extrabold' : 'text-amber-600'}`}>
            {orderType ? (orderType === 'DINE_IN' ? '✓ Dine-in Selected' : '✓ Takeaway Selected') : 'Selection required'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: Dine-in */}
          <button
            type="button"
            onClick={() => setOrderType('DINE_IN')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              orderType === 'DINE_IN'
                ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30 shadow-xs'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    orderType === 'DINE_IN' ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Dine-in</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Eat Here
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Enjoy your dishes right here inside Vivacity Food Court seating area.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-600">
              <span>Hall / Table dining</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                orderType === 'DINE_IN' ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 bg-white'
              }`}>
                {orderType === 'DINE_IN' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </button>

          {/* Option 2: Takeaway */}
          <button
            type="button"
            onClick={() => setOrderType('TAKEAWAY')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              orderType === 'TAKEAWAY'
                ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30 shadow-xs'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    orderType === 'TAKEAWAY' ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Takeaway</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Parcel
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Dishes packaged hot in takeaway containers for carryout or home.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-600">
              <span>Carryout parcel box</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                orderType === 'TAKEAWAY' ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 bg-white'
              }`}>
                {orderType === 'TAKEAWAY' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Grouped Stalls Container */}
      <div className="space-y-4">
        {groupedByStall.map((stallGroup) => (
          <div
            key={stallGroup.stallId}
            className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-2xs space-y-3"
          >
            {/* Stall Header Badge */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  {stallGroup.stallName}
                </h3>
              </div>
              <span className="text-[10px] font-bold text-zinc-400">
                {stallGroup.items.length} item{stallGroup.items.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Item Rows */}
            <div className="divide-y divide-zinc-100">
              {stallGroup.items.map((item) => {
                const isOutOfStock = isCartItemOutOfStock(item);
                return (
                  <div
                    key={item.cartItemId}
                    className={`py-3 px-2 rounded-2xl transition-colors flex items-start justify-between gap-3 ${
                      isOutOfStock ? 'bg-red-50/70 border border-red-200 my-1' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-xs sm:text-sm font-bold truncate ${isOutOfStock ? 'text-red-900 line-through' : 'text-zinc-900'}`}>
                          {item.name}
                        </h4>
                        {isOutOfStock && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600 text-white tracking-wider animate-pulse">
                            Stock Out
                          </span>
                        )}
                      </div>
                      
                      {/* Modifiers, Variants, Weight, Add-ons */}
                      <div className="text-[11px] text-zinc-500 space-y-0.5 mt-0.5">
                        {item.variantName && (
                          <div>Portion: <strong className="text-zinc-700">{item.variantName}</strong></div>
                        )}
                        {item.weight && (
                          <div>Weight: <strong className="text-zinc-700">{item.weight}g</strong></div>
                        )}
                        {item.addOnNames && item.addOnNames.length > 0 && (
                          <div>Add-ons: <span className="text-brand-600 font-semibold">{item.addOnNames.join(', ')}</span></div>
                        )}
                        {item.notes && (
                          <div className="italic text-amber-700">Note: "{item.notes}"</div>
                        )}
                      </div>

                      <div className="text-xs font-black text-brand-600 mt-1">
                        ৳ {item.price * item.quantity}
                      </div>

                      {isOutOfStock && (
                        <p className="text-[11px] font-bold text-red-600 mt-1">
                          This dish is out of stock. Please remove it from your tray.
                        </p>
                      )}
                    </div>

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isOutOfStock ? (
                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      ) : (
                        <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-full p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:bg-white active:scale-90 transition-all"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-xs font-black text-zinc-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:bg-white active:scale-90 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Promo Code & Voucher */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-brand-600" />
            Apply Food Hall Promo Code
          </span>
          <span className="text-[10px] font-bold text-zinc-400">Available: VIVA10</span>
        </div>

        {couponCode ? (
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
            <div className="text-emerald-800 font-bold">
              ✓ Promo <strong>{couponCode}</strong> applied (-৳{discount})
            </div>
            <button
              onClick={removeCoupon}
              className="text-xs font-black text-emerald-700 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              placeholder="Enter promo code (e.g. VIVA10)"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-200 text-xs uppercase font-bold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Apply
            </button>
          </form>
        )}

        {couponMsg && (
          <p className={`text-[11px] font-semibold ${couponMsg.error ? 'text-red-600' : 'text-emerald-600'}`}>
            {couponMsg.text}
          </p>
        )}
      </div>

      {/* Bill Breakdown */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-2xs space-y-2 text-xs">
        <div className="flex justify-between text-zinc-600">
          <span>Items Subtotal ({itemCount} dishes):</span>
          <span className="font-bold text-zinc-800">৳ {subtotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Special Food Hall Discount:</span>
            <span>-৳ {discount}</span>
          </div>
        )}
        <div className="flex justify-between text-zinc-400 text-[11px]">
          <span>Service Charge &amp; VAT:</span>
          <span>Included in dish prices</span>
        </div>
        <div className="pt-2 border-t border-zinc-100 flex justify-between items-baseline text-zinc-900">
          <span className="text-sm font-black">Grand Total:</span>
          <span className="text-xl font-black text-brand-600">৳ {grandTotal}</span>
        </div>
      </div>

      {/* Proceed to Checkout CTA */}
      <div className="pt-2 space-y-2">
        <button
          disabled={hasUnavailableItems || pausedStallNames.length > 0}
          onClick={() => {
            if (hasUnavailableItems || pausedStallNames.length > 0) return;
            setLocation('/checkout');
          }}
          className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm flex items-center justify-between transition-all ${
            hasUnavailableItems || pausedStallNames.length > 0
              ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_8px_25px_rgba(224,109,36,0.35)] active:scale-[0.99] cursor-pointer'
          }`}
        >
          <span>
            {hasUnavailableItems
              ? '⚠️ Remove Out-of-Stock Items to Checkout'
              : pausedStallNames.length > 0
              ? `⚠️ ${pausedStallNames[0]} is Paused`
              : 'Review & Place Order'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black">৳ {grandTotal}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
        {hasUnavailableItems && (
          <p className="text-center text-[11px] font-bold text-red-600">
            Cannot checkout until all out-of-stock items are removed from your tray.
          </p>
        )}
        {!hasUnavailableItems && pausedStallNames.length > 0 && (
          <p className="text-center text-[11px] font-bold text-amber-600">
            Cannot checkout while items from paused stalls remain in tray.
          </p>
        )}
      </div>
    </div>
  );
};
