import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { MenuItem, Stall } from '../../types';
import { Search, Plus, Filter, Check } from 'lucide-react';
import { FoodDetailModal } from '../../components/common/FoodDetailModal';
import { useCart } from '../../context/CartContext';

export const SearchPage: React.FC = () => {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [query, setQuery] = useState<string>('Chicken');
  const [selectedStallFilter, setSelectedStallFilter] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);

  const { items: cartItems } = useCart();

  useEffect(() => {
    Promise.all([api.getStalls(), api.getMenuItems()])
      .then(([stallsRes, itemsRes]) => {
        setStalls(stallsRes);
        setAllItems(itemsRes);
      })
      .finally(() => setLoading(false));

    const unsub = realtime.on('menu_item_updated', (updatedItem: MenuItem) => {
      setAllItems(prev => prev.map(m => m.id === updatedItem.id ? { ...m, ...updatedItem } : m));
      setSelectedItem(curr => curr && curr.id === updatedItem.id ? { ...curr, ...updatedItem } : curr);
    });

    const unsubInv = realtime.on('inventory_updated', () => {
      api.getMenuItems().then(setAllItems).catch(() => {});
    });

    return () => {
      unsub();
      unsubInv();
    };
  }, []);

  const filteredItems = allItems.filter(item => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q);

    const matchesStall = selectedStallFilter === 'ALL' || item.stallId === selectedStallFilter;
    return matchesQuery && matchesStall;
  });

  const getStallName = (stallId: string) => {
    return stalls.find(s => s.id === stallId)?.name || stallId;
  };

  return (
    <div className="max-w-full md:max-w-4xl mx-auto w-full p-4 sm:p-6 pb-4 sm:pb-6 space-y-4 overflow-x-hidden">
      {/* Header & Search Bar */}
      <div>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight mb-2">
          Global Food Search
        </h1>
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search across all stalls (e.g. Steak, Chicken, Momo, Burger, Waffle, Coffee, Drinks)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 bg-white text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Quick Search Suggestions */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {['Chicken', 'Steak', 'Momo', 'Burger', 'Pizza', 'Seafood', 'Waffle', 'Biriyani', 'Pasta'].map(tag => (
          <button
            key={tag}
            onClick={() => setQuery(tag)}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-colors ${
              query.toLowerCase() === tag.toLowerCase()
                ? 'bg-brand-500 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Filter by Stall */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Filter className="w-3 h-3" /> Stall:
        </span>
        <button
          onClick={() => setSelectedStallFilter('ALL')}
          className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
            selectedStallFilter === 'ALL'
              ? 'bg-zinc-900 text-white'
              : 'bg-white text-zinc-600 border border-zinc-200'
          }`}
        >
          All Stalls
        </button>
        {stalls.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStallFilter(s.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedStallFilter === s.id
                ? 'bg-brand-500 text-white'
                : 'bg-white text-zinc-600 border border-zinc-200'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-xs text-zinc-500 font-semibold">
        Found {filteredItems.length} dishes matching "{query}"
      </div>

      {/* Search Results List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filteredItems.map(item => {
          const inCart = cartItems.some(c => c.menuItemId === item.id);
          const stallTitle = getStallName(item.stallId);
          const availableQty = item.available !== undefined && item.available !== null ? item.available : (item.inv?.available ?? null);
          const isManuallyDisabled = item.inv?.manuallyDisabled;
          const isStockOut = !item.isAvailable || isManuallyDisabled || (availableQty !== null && availableQty !== undefined && availableQty <= 0);
          const isLowStock = !isStockOut && availableQty !== null && availableQty !== undefined && availableQty <= 10 && availableQty > 0;

          return (
            <div
              key={item.id}
              onClick={() => {
                if (isStockOut) return;
                setSelectedItem(item);
              }}
              className={`bg-white rounded-3xl p-3 border border-zinc-200 shadow-2xs hover:border-brand-500/40 hover:shadow-xs transition-all cursor-pointer flex gap-3 group relative ${
                isStockOut ? 'opacity-65 grayscale-[30%]' : ''
              }`}
            >
              {(() => {
                const isDrinkBottle =
                  ['db-coke', 'db-sprite', 'db-fanta', 'db-water'].includes(item.id) ||
                  item.image?.includes('/Drinks/') ||
                  item.category === 'SOFT DRINKS & WATER';
                return (
                  <div className={`w-24 h-24 rounded-2xl overflow-hidden shrink-0 relative flex items-center justify-center ${
                    isDrinkBottle ? 'bg-white p-1.5 border border-zinc-100 shadow-2xs' : 'bg-zinc-100'
                  }`}>
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80"}
                      alt={item.name}
                      className={`w-full h-full ${
                        isDrinkBottle
                          ? 'object-contain object-center group-hover:scale-105 transition-transform duration-300'
                          : 'object-cover group-hover:scale-105 transition-transform duration-500'
                      }`}
                    />
                    {isStockOut ? (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                        <span className="text-[9px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          Stock Out
                        </span>
                      </div>
                    ) : isLowStock ? (
                      <div className="absolute bottom-1 right-1">
                        <span className="text-[8px] font-black text-amber-900 bg-amber-300 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs">
                          Only {availableQty} left
                        </span>
                      </div>
                    ) : (
                      <div className="absolute bottom-1 right-1">
                        <span className="text-[8px] font-black text-white bg-emerald-600/90 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Available
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-wider block">
                      {stallTitle}
                    </span>
                    {isLowStock && (
                      <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                        Only {availableQty} left
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs sm:text-sm font-black text-zinc-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
                    {item.name}
                  </h3>
                  {item.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-zinc-100">
                  <span className="text-xs font-black text-brand-700">
                    ৳ {item.price}
                    {item.isWeightBased && <span className="text-[10px] text-zinc-400 font-normal"> / 100g</span>}
                  </span>

                  <button
                    type="button"
                    disabled={isStockOut}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isStockOut) return;
                      setSelectedItem(item);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                      isStockOut
                        ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed font-black'
                        : inCart
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-brand-50 hover:bg-brand-500 text-brand-700 hover:text-white border border-brand-200'
                    }`}
                  >
                    {isStockOut ? (
                      <span>Stock Out</span>
                    ) : inCart ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <FoodDetailModal
        item={selectedItem}
        stallName={selectedItem ? getStallName(selectedItem.stallId) : ''}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};
