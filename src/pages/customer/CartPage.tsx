import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { useTableSession } from '../../context/TableSessionContext';
import { useLocation } from 'wouter';
import { Plus, Minus, Trash2, ArrowRight, Tag, Store, ShoppingBag } from 'lucide-react';

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
    itemCount
  } = useCart();

  const { tableId, isTakeaway } = useTableSession();
  const [, setLocation] = useLocation();

  const [couponInput, setCouponInput] = useState('');
  const [couponMsg, setCouponMsg] = useState<{ text: string; error?: boolean } | null>(null);

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
            Dine-In Destination
          </span>
          <h2 className="text-sm font-black text-zinc-900">
            {tableId && !isTakeaway ? `Serving to Table ${tableId}` : 'Takeaway / Parcel Order'}
          </h2>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-bold text-red-600 hover:text-red-700 p-1 flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Tray</span>
        </button>
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
              {stallGroup.items.map((item) => (
                <div key={item.cartItemId} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                      {item.name}
                    </h4>
                    
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
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-full p-0.5 shrink-0 shadow-2xs">
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
                </div>
              ))}
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
      <div className="pt-2">
        <button
          onClick={() => setLocation('/checkout')}
          className="w-full py-4 px-6 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-[0_8px_25px_rgba(224,109,36,0.35)] flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer"
        >
          <span>Review &amp; Place Order</span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black">৳ {grandTotal}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
};
