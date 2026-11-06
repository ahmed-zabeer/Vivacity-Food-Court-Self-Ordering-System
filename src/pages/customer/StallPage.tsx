import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { Stall, MenuItem } from '../../types';
import { useRoute, useLocation } from 'wouter';
import { FoodDetailModal } from '../../components/common/FoodDetailModal';
import { Search, Star, Clock, ArrowLeft, Plus, Check, AlertTriangle, X, Maximize2, Flame } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const StallPage: React.FC = () => {
  const [, params] = useRoute<{ slug: string }>('/stall/:slug');
  const [, setLocation] = useLocation();
  const slug = params ? params.slug : 'fusion-cafe';

  const [stall, setStall] = useState<Stall | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, any>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { items: cartItems, addItem } = useCart();

  const loadStallData = useCallback(async () => {
    try {
      const res = await api.getStall(slug);
      setStall(res);
      const [items, invList] = await Promise.all([
        api.getMenuItems({ stallId: res.id }),
        api.getInventory(res.id).catch(() => [])
      ]);
      setMenuItems(items);
      const invMap: Record<string, any> = {};
      invList.forEach((it: any) => {
        invMap[it.id] = it.inv;
      });
      setInventoryMap(invMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    loadStallData();
  }, [loadStallData]);

  useEffect(() => {
    const unsubMenu = realtime.on('menu_item_updated', (updatedItem: MenuItem) => {
      setMenuItems(prev => prev.map(m => m.id === updatedItem.id ? { ...m, ...updatedItem } : m));
      setSelectedItem(curr => curr && curr.id === updatedItem.id ? { ...curr, ...updatedItem } : curr);
      if (updatedItem.inv) {
        setInventoryMap(prev => ({
          ...prev,
          [updatedItem.id]: updatedItem.inv
        }));
      } else if (updatedItem.available !== undefined) {
        setInventoryMap(prev => ({
          ...prev,
          [updatedItem.id]: {
            ...(prev[updatedItem.id] || {}),
            available: updatedItem.available,
            stockOut: updatedItem.available === 0 || !updatedItem.isAvailable
          }
        }));
      }
    });

    const unsubStall = realtime.on('stall_updated', () => {
      loadStallData();
    });

    const unsubInv = realtime.on('inventory_updated', () => {
      if (stall?.id) {
        api.getInventory(stall.id).then((invList: any[]) => {
          const invMap: Record<string, any> = {};
          invList.forEach((it: any) => {
            invMap[it.id] = it.inv;
          });
          setInventoryMap(invMap);
        }).catch(() => {});
      }
    });

    return () => {
      unsubMenu();
      unsubStall();
      unsubInv();
    };
  }, [loadStallData, stall?.id]);

  if (loading) {
    return (
      <div className="max-w-md md:max-w-4xl mx-auto w-full p-4 py-12 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
            Loading Kitchen Menu...
          </p>
        </div>
      </div>
    );
  }

  if (!stall) {
    return (
      <div className="max-w-md mx-auto w-full p-6 pb-4 text-center">
        <h2 className="text-lg font-bold">Stall Not Found</h2>
        <button
          onClick={() => setLocation('/')}
          className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-full text-xs font-bold"
        >
          Return to Food Court
        </button>
      </div>
    );
  }

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || 
      item.category.toUpperCase() === selectedCategory.toUpperCase() ||
      (item.parentCategory && item.parentCategory.toUpperCase() === selectedCategory.toUpperCase());
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subCategory && item.subCategory.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-full md:max-w-4xl mx-auto w-full pb-4 sm:pb-6 flex flex-col overflow-x-hidden">
      {/* Top Banner & Navigation */}
      <div className="relative w-full h-52 sm:h-64 bg-zinc-900 overflow-hidden">
        <img
          src={stall.coverImage}
          alt={stall.name}
          className="w-full h-full object-cover object-center opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        <button
          onClick={() => setLocation('/')}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="absolute bottom-4 left-4 right-4 text-white">
          <span className="px-2.5 py-0.5 rounded-full bg-brand-500 text-[10px] font-black uppercase tracking-wider mb-1.5 inline-block">
            {stall.badge}
          </span>
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {stall.logo && (
                <img
                  src={stall.logo}
                  alt={stall.name}
                  className="h-12 sm:h-14 w-auto object-contain shrink-0 drop-shadow-md"
                />
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {stall.name}
                </h1>
                <p className="text-xs text-zinc-300 mt-1 max-w-lg line-clamp-1 uppercase tracking-wide font-medium">
                  {stall.description}
                </p>
              </div>
            </div>
            <div className="bg-white/95 text-zinc-900 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{stall.rating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 max-w-full overflow-hidden">
        {/* Stall Paused Banner */}
        {stall.isPaused && (
          <div className="bg-amber-100 border-2 border-amber-300 rounded-3xl p-4 text-center space-y-1 shadow-sm">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
              <span className="font-black text-amber-900 text-sm">Temporarily Unavailable</span>
            </div>
            <p className="text-xs text-amber-800">
              {stall.pauseReason || 'This stall is temporarily closed.'}
            </p>
            {stall.pauseUntil && (
              <p className="text-[11px] text-amber-700 font-bold">
                Expected to reopen at: {new Date(stall.pauseUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <p className="text-[10px] text-amber-700 pt-0.5">
              New orders are temporarily paused. Existing orders are being prepared.
            </p>
          </div>
        )}

        {/* Search within Stall */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={`Search dishes in ${stall.name}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-2xs"
          />
        </div>

        {/* Category Pills (Horizontal scrolling) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {stall.categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedCategory.toUpperCase() === cat.toUpperCase()
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Featured shelf — Fusion Cafe keeps "Our Popular Items"; every other
            stall shows its "Our Special Items". Same product records, no duplicates. */}
        {selectedCategory === 'ALL' && !searchQuery && (() => {
          const isFusion = stall.id === 'fusion-cafe';
          const featuredItems = menuItems.filter((item) =>
            isFusion ? item.isPopular : item.isSpecial
          );
          if (featuredItems.length === 0) return null;
          const sectionTitle = isFusion ? 'Our Popular Items' : 'Our Special Items';
          const sectionHint = isFusion ? 'Guest Favourites' : 'Stall Favourites';
          const badgeLabel = isFusion ? 'Popular' : 'Special';

          return (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs">
                    <Flame className="w-3.5 h-3.5" />
                  </span>
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-wider">
                    {sectionTitle}
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  {sectionHint}
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1.5 no-scrollbar w-full">
                {featuredItems.map((item) => {
                  const isStallPaused = !!stall.isPaused;
                  const inv = inventoryMap[item.id];
                  const availableQty = inv?.available !== undefined && inv?.available !== null
                    ? inv.available
                    : (item.available !== undefined ? item.available : (item.inv?.available ?? null));
                  const isStockOut =
                    !item.isAvailable ||
                    inv?.manuallyDisabled ||
                    item.inv?.manuallyDisabled ||
                    (inv && inv.stockOut) ||
                    (availableQty !== null && availableQty !== undefined && availableQty <= 0);
                  const canOrder = !isStallPaused && !isStockOut;

                  return (
                    <button
                      key={`featured-${item.id}`}
                      type="button"
                      disabled={!canOrder}
                      onClick={() => {
                        if (!canOrder) return;
                        setSelectedItem(item);
                      }}
                      className={`w-40 shrink-0 text-left bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden transition-all ${
                        canOrder
                          ? 'hover:border-brand-500/40 hover:shadow-xs active:scale-[0.99]'
                          : 'opacity-60 grayscale-[30%] cursor-not-allowed'
                      }`}
                    >
                      <div className="relative h-24 w-full bg-zinc-100 overflow-hidden">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-black/65 text-amber-300 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                          {badgeLabel}
                        </span>
                      </div>
                      <div className="p-2.5 space-y-1">
                        <h3 className="text-[11px] font-black text-zinc-900 leading-tight line-clamp-2 min-h-[2.1em]">
                          {item.name}
                        </h3>
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-black text-brand-600">
                            {item.hasVariants ? `From ৳${item.price}` : `৳ ${item.price}`}
                          </span>
                          <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center shrink-0">
                            <Plus className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const inCart = cartItems.some(c => c.menuItemId === item.id);
            const inv = inventoryMap[item.id];
            const availableQty = inv?.available !== undefined && inv?.available !== null 
              ? inv.available 
              : (item.available !== undefined ? item.available : (item.inv?.available ?? null));
            const isManuallyDisabled = inv?.manuallyDisabled || item.inv?.manuallyDisabled;
            const isStockOut = !item.isAvailable || isManuallyDisabled || (inv && inv.stockOut) || (availableQty !== null && availableQty !== undefined && availableQty <= 0);
            const isLowStock = !isStockOut && availableQty !== null && availableQty !== undefined && availableQty <= 10 && availableQty > 0;
            const isStallPaused = !!stall.isPaused;
            const canOrder = !isStallPaused && !isStockOut;

            return (
              <div
                key={item.id}
                onClick={() => {
                  if (isStallPaused) {
                    alert(`"${stall.name}" is temporarily unavailable. Please try again later.`);
                    return;
                  }
                  if (isStockOut) return;
                  setSelectedItem(item);
                }}
                className={`bg-white rounded-3xl p-3 border border-zinc-200/90 shadow-2xs hover:border-brand-500/40 hover:shadow-xs transition-all cursor-pointer flex gap-3 group relative ${
                  !canOrder ? 'opacity-60 grayscale-[30%]' : ''
                }`}
              >
                {/* Photo */}
                {(() => {
                  const isDrinkBottle =
                    ['db-coke', 'db-sprite', 'db-fanta', 'db-water'].includes(item.id) ||
                    item.image?.includes('/Drinks/') ||
                    item.category === 'SOFT DRINKS & WATER';
                  return (
                    <div
                      onClick={(e) => {
                        if (isDrinkBottle && item.image) {
                          e.stopPropagation();
                          setLightboxImage({ src: item.image, title: item.name });
                        }
                      }}
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 relative flex items-center justify-center ${
                        isDrinkBottle
                          ? 'bg-white p-1.5 border border-zinc-100 shadow-2xs group/img'
                          : 'bg-zinc-100'
                      }`}
                    >
                      <img
                        src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80"}
                        alt={item.name}
                        className={`w-full h-full ${
                          isDrinkBottle
                            ? 'object-contain object-center group-hover:scale-105 transition-transform duration-300'
                            : 'object-cover group-hover:scale-105 transition-transform duration-500'
                        }`}
                      />
                      {isDrinkBottle && (
                        <span
                          className="absolute top-1 left-1 bg-black/65 text-white p-1 rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity z-10 shadow-xs"
                          title="Click to view full bottle"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                        </span>
                      )}
                      {isStallPaused ? (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1 text-center">
                          <span className="text-[9px] font-black text-white bg-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Unavailable
                          </span>
                        </div>
                      ) : isStockOut ? (
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
                          <span className="text-[8px] font-black text-white bg-emerald-600/90 px-1.5 py-0.5 rounded uppercase tracking-wider backdrop-blur-xs">
                            Available
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                        {item.category}
                      </span>
                      {isLowStock && (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                          Only {availableQty} left
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-black text-zinc-900 group-hover:text-brand-600 transition-colors line-clamp-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5 font-normal">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1">
                    <div>
                      <div className="text-xs font-black text-brand-600">
                        {item.hasVariants ? `From ৳${item.price}` : `৳ ${item.price}`}
                        {item.isWeightBased && <span className="text-[10px] text-zinc-400 font-normal"> / 100g</span>}
                      </div>
                      {item.hasVariants && (
                        <span className="text-[9px] text-zinc-400 font-bold">
                          {item.variants?.map(v => v.name.split(' ')[0]).join(' / ')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!canOrder}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isStallPaused) {
                          alert(`"${stall.name}" is temporarily unavailable. Please try again later.`);
                          return;
                        }
                        if (isStockOut) return;
                        setSelectedItem(item);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                        isStallPaused
                          ? 'bg-amber-50 text-amber-700 border border-amber-200 cursor-not-allowed font-black'
                          : isStockOut
                          ? 'bg-red-50 text-red-600 border border-red-200 cursor-not-allowed font-black'
                          : inCart
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-brand-50 hover:bg-brand-500 text-brand-700 hover:text-white border border-brand-200'
                      }`}
                    >
                      {isStallPaused ? (
                        <span>Closed</span>
                      ) : isStockOut ? (
                        <span>Stock Out</span>
                      ) : inCart ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
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

        {filteredItems.length === 0 && (
          <div className="py-12 text-center text-zinc-400">
            <p className="text-sm font-semibold">No dishes found matching your selection.</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Full Bottle / Dish Preview */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[10000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-lg w-full flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="bg-white rounded-3xl p-5 shadow-2xl flex flex-col items-center w-full max-h-[85vh] overflow-hidden">
              <img
                src={lightboxImage.src}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto object-contain object-center drop-shadow-xl"
              />
              <div className="mt-4 text-center">
                <h4 className="text-base font-black text-zinc-900">{lightboxImage.title}</h4>
                <p className="text-xs text-zinc-500 font-semibold">{stall.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for item customisation */}
      <FoodDetailModal
        item={selectedItem}
        stallName={stall.name}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};
