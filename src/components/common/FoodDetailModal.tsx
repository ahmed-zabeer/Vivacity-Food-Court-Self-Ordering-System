import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { X, Plus, Minus, Check, Flame, Clock } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface FoodDetailModalProps {
  item: MenuItem | null;
  stallName: string;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ item, stallName, onClose }) => {
  const { addItem } = useCart();

  if (!item) return null;

  // Variant state
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    item.hasVariants && item.variants && item.variants.length > 0 ? item.variants[0].id : undefined
  );

  // Weight state (for per 100g items)
  const [selectedWeight, setSelectedWeight] = useState<number>(item.minWeight || 400);

  // Add-ons state
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // Quantity and Notes
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId) ? prev.filter(id => id !== addOnId) : [...prev, addOnId]
    );
  };

  // Price calculations
  let basePrice = item.price;
  let variantName: string | undefined = undefined;

  if (selectedVariantId && item.variants) {
    const v = item.variants.find(varItem => varItem.id === selectedVariantId);
    if (v) {
      basePrice = v.price;
      variantName = v.name;
    }
  }

  if (item.isWeightBased) {
    basePrice = (item.price / 100) * selectedWeight;
  }

  let addOnsTotal = 0;
  const addOnNames: string[] = [];
  if (item.addOns && selectedAddOns.length > 0) {
    for (const aId of selectedAddOns) {
      const match = item.addOns.find(a => a.id === aId);
      if (match) {
        addOnsTotal += match.price;
        addOnNames.push(match.name);
      }
    }
  }

  const unitPrice = basePrice + addOnsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    addItem(item, stallName, {
      variantId: selectedVariantId,
      variantName,
      weight: item.isWeightBased ? selectedWeight : undefined,
      selectedAddOns,
      addOnNames,
      notes: notes.trim(),
      quantity
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Photo Container */}
        <div className="relative h-56 sm:h-64 w-full bg-zinc-100 shrink-0">
          <img
            src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80"}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="px-2 py-0.5 rounded-full bg-brand-500 text-[10px] font-black uppercase tracking-wider mb-1 inline-block">
              {stallName} • {item.category}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {item.name}
            </h3>
            <p className="text-xs text-amber-200 font-semibold mt-0.5 flex items-center gap-2">
              <span>{item.prepTime || '15 min prep'}</span>
              {!item.isAvailable && (
                <span className="bg-red-600 text-white px-2 py-0.2 rounded-full font-bold">
                  SOLD OUT
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Item Description */}
          {item.description && (
            <div>
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                About this Dish
              </h4>
              <p className="text-sm text-zinc-700 leading-relaxed font-normal bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                {item.description}
              </p>
            </div>
          )}

          {/* Size / Variants Selector */}
          {item.hasVariants && item.variants && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Select Size / Portion <span className="text-brand-600">*</span>
                </span>
                <span className="text-[10px] text-zinc-400">Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedVariantId === v.id
                        ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 font-bold text-brand-900'
                        : 'border-zinc-200 hover:border-zinc-300 text-zinc-800'
                    }`}
                  >
                    <span className="text-xs font-bold">{v.name}</span>
                    <span className="text-xs font-black text-brand-600">৳{v.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weight-Based Pricing Selector (e.g. Red Snapper, Coral fish per 100g) */}
          {item.isWeightBased && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Select Fresh Cut Weight
                </span>
                <span className="text-xs font-extrabold text-brand-700">
                  ৳{item.price} / 100 gm
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {[400, 500, 600, 800, 1000].map(weight => (
                  <button
                    key={weight}
                    type="button"
                    onClick={() => setSelectedWeight(weight)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedWeight === weight
                        ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                        : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {weight}g
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-amber-800/90 font-medium">
                Current portion: <strong>{selectedWeight}g</strong> = <strong className="text-brand-700">৳{basePrice}</strong>
              </p>
            </div>
          )}

          {/* Optional Add-Ons */}
          {item.addOns && item.addOns.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                  Custom Add-ons &amp; Extras
                </span>
                <span className="text-[10px] text-zinc-400">Optional</span>
              </div>
              <div className="space-y-2">
                {item.addOns.map((add) => {
                  const isChecked = selectedAddOns.includes(add.id);
                  return (
                    <button
                      key={add.id}
                      type="button"
                      onClick={() => toggleAddOn(add.id)}
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                        isChecked
                          ? 'border-brand-500 bg-brand-50/40 text-brand-900'
                          : 'border-zinc-200 hover:border-zinc-300 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                            isChecked
                              ? 'bg-brand-500 border-brand-500 text-white'
                              : 'border-zinc-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-semibold">{add.name}</span>
                      </div>
                      <span className="text-xs font-bold text-zinc-900">+৳{add.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-900 mb-1.5">
              Kitchen Preparation Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Less spicy, dressing on the side, no onions"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>
        </div>

        {/* Footer Bar with Quantity and Add Button */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/80 flex items-center gap-4 shrink-0">
          {/* Stepper */}
          <div className="flex items-center bg-white border border-zinc-200 rounded-full p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 active:scale-90 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-black text-zinc-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-100 active:scale-90 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Tray Button */}
          <button
            type="button"
            disabled={!item.isAvailable}
            onClick={handleAddToCart}
            className={`flex-1 py-3 px-5 rounded-full font-bold text-sm shadow-md flex items-center justify-between transition-all active:scale-[0.98] ${
              item.isAvailable
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25'
                : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <span>{item.isAvailable ? 'Add to Food Tray' : 'Currently Unavailable'}</span>
            <span className="font-black text-base">৳ {totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
