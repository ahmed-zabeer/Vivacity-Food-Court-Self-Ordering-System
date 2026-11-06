import React, { useState } from 'react';
import { MenuItem } from '../../types';
import { X, Plus, Minus, Check, Flame, Clock, Maximize2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface FoodDetailModalProps {
  item: MenuItem | null;
  stallName: string;
  onClose: () => void;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({ item, stallName, onClose }) => {
  const { addItem, isMenuItemAvailable } = useCart();

  if (!item) return null;

  const isDrinkBottle =
    ['db-coke', 'db-sprite', 'db-fanta', 'db-water'].includes(item.id) ||
    item.image?.includes('/Drinks/') ||
    item.category === 'SOFT DRINKS & WATER';

  const isBoba =
    ['BOBA MILK TEA', 'SMOOTHIE', 'QQ JELLY', 'BOBA DRINK'].includes(item.category) && !item.isAddOn;
  const isPizza = item.category === 'PIZZA';
  const isWaffle = item.category === 'WAFFLE';

  const availableQty = item.available !== undefined && item.available !== null ? item.available : (item.inv?.available ?? null);
  const isManuallyDisabled = item.inv?.manuallyDisabled;
  const isLiveAvailable = item.isAvailable && isMenuItemAvailable(item.id) && !isManuallyDisabled;
  const isStockOut = !isLiveAvailable || (availableQty !== null && availableQty !== undefined && availableQty <= 0);
  const isLowStock = !isStockOut && availableQty !== null && availableQty !== undefined && availableQty <= 10 && availableQty > 0;

  // Variant state
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    item.hasVariants && item.variants && item.variants.length > 0 ? item.variants[0].id : undefined
  );

  // Weight state (for per 100g items)
  const [selectedWeight, setSelectedWeight] = useState<number>(item.minWeight || 400);

  // Add-ons state
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(() => {
    if (isBoba && item.addOns && item.addOns.length > 0) {
      // Default to regular pearls
      const reg = item.addOns.find(a => a.id === 'boba-regular');
      return reg ? [reg.id] : [];
    }
    return [];
  });

  // Quantity and Notes
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [showLightbox, setShowLightbox] = useState<boolean>(false);

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOns(prev =>
      prev.includes(addOnId) ? prev.filter(id => id !== addOnId) : [...prev, addOnId]
    );
  };

  const setBobaPearl = (pearlId: string) => {
    const pearlIds = ['boba-no-extra', 'boba-regular', 'extra-pearl', 'boba-more-pearl'];
    setSelectedAddOns(prev => [
      ...prev.filter(id => !pearlIds.includes(id)),
      pearlId
    ]);
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
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      const ok = await addItem(item, stallName, {
        variantId: selectedVariantId,
        variantName,
        weight: item.isWeightBased ? selectedWeight : undefined,
        selectedAddOns,
        addOnNames,
        notes: notes.trim(),
        quantity
      });
      if (ok !== false) {
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add item to tray');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* Lightbox Modal for Full Bottle / Dish Preview */}
      {showLightbox && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-lg w-full flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center w-full max-h-[85vh] overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="max-h-[65vh] w-auto object-contain object-center drop-shadow-xl"
              />
              <div className="mt-4 text-center">
                <h4 className="text-base font-black text-zinc-900">{item.name}</h4>
                <p className="text-xs text-zinc-500 font-semibold">{stallName} • ৳{item.price}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-250"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Photo Container */}
          <div
            onClick={() => isDrinkBottle && setShowLightbox(true)}
            className={`relative ${
              isDrinkBottle ? 'h-64 sm:h-72 bg-zinc-900 cursor-pointer group' : 'h-56 sm:h-64 bg-zinc-100'
            } w-full shrink-0 overflow-hidden flex items-center justify-center`}
          >
            <img
              src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80"}
              alt={item.name}
              className={`w-full h-full ${
                isDrinkBottle
                  ? 'object-contain object-center p-3 group-hover:scale-105 transition-transform duration-300'
                  : 'object-cover'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {isDrinkBottle && (
              <span className="absolute top-4 left-4 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20 z-10">
                <Maximize2 className="w-3 h-3" />
                <span>Full Bottle View</span>
              </span>
            )}

            <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
              <span className="px-2 py-0.5 rounded-full bg-brand-500 text-[10px] font-black uppercase tracking-wider mb-1 inline-block">
                {stallName} • {item.category}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {item.name}
              </h3>
              <p className="text-xs text-amber-200 font-semibold mt-0.5 flex items-center gap-2">
                <span>{item.prepTime || '15 min prep'}</span>
                {isStockOut ? (
                  <span className="bg-red-600 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                    Stock Out
                  </span>
                ) : isLowStock ? (
                  <span className="bg-amber-300 text-amber-950 px-2 py-0.5 rounded-full font-black text-[10px]">
                    Only {availableQty} left
                  </span>
                ) : (
                  <span className="bg-emerald-600/90 text-white px-2 py-0.5 rounded-full font-bold text-[10px]">
                    Available
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

            {/* Weight-Based Pricing Selector */}
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

            {/* 1. BOBA DRINKS: Dedicated Pearl Customization */}
            {isBoba && item.addOns && item.addOns.length > 0 && (
              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                    <span>🧋 Boba Pearl Customization</span>
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold">Select 1 option</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {item.addOns.map((add) => {
                    const isSelected = selectedAddOns.includes(add.id);
                    return (
                      <button
                        key={add.id}
                        type="button"
                        onClick={() => setBobaPearl(add.id)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'border-brand-500 bg-white ring-2 ring-brand-500 font-bold text-brand-900 shadow-xs'
                            : 'border-zinc-200 bg-white/80 hover:bg-white text-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                              isSelected
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs font-bold">{add.name}</span>
                        </div>
                        <span className="text-xs font-black text-brand-700">
                          {add.price === 0 ? 'Free' : `+৳${add.price}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. PIZZA: Custom Multi-Select Toppings */}
            {isPizza && item.addOns && item.addOns.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                    <span>🍕 Custom Pizza Toppings</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Optional • Multi-select</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {item.addOns.map((top) => {
                    const isChecked = selectedAddOns.includes(top.id);
                    return (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => toggleAddOn(top.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500 shadow-xs'
                            : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                              isChecked
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-semibold truncate">{top.name}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-900 ml-1 shrink-0">
                          +৳{top.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. WAFFLE: Customization & Toppings */}
            {isWaffle && item.addOns && item.addOns.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1.5">
                    <span>🧇 Waffle Toppings &amp; Extras</span>
                  </span>
                  <span className="text-[10px] text-zinc-400">Optional • Multi-select</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                  {item.addOns.map((top) => {
                    const isChecked = selectedAddOns.includes(top.id);
                    return (
                      <button
                        key={top.id}
                        type="button"
                        onClick={() => toggleAddOn(top.id)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-1 ring-brand-500 shadow-xs'
                            : 'border-zinc-200 hover:border-zinc-300 text-zinc-700 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                              isChecked
                                ? 'bg-brand-500 border-brand-500 text-white'
                                : 'border-zinc-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-semibold truncate">{top.name}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-900 ml-1 shrink-0">
                          +৳{top.price}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Standard Add-ons for all other items */}
            {!isBoba && !isPizza && !isWaffle && item.addOns && item.addOns.length > 0 && (
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
              disabled={!isLiveAvailable || isStockOut}
              onClick={handleAddToCart}
              className={`flex-1 py-3 px-5 rounded-full font-bold text-sm shadow-md flex items-center justify-between transition-all active:scale-[0.98] ${
                isLiveAvailable && !isStockOut
                  ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25 cursor-pointer'
                  : 'bg-zinc-200 text-zinc-500 border border-zinc-300 cursor-not-allowed font-black'
              }`}
            >
              <span>{isLiveAvailable && !isStockOut ? 'Add to Food Tray' : 'Out of Stock (Stock Out)'}</span>
              <span className="font-black text-base">৳ {totalPrice}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};