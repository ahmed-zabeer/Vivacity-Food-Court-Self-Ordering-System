import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Stall, MenuItem } from '../../types';
import { useRoute, useLocation } from 'wouter';
import { FoodDetailModal } from '../../components/common/FoodDetailModal';
import { Search, Star, Clock, ArrowLeft, Plus, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export const StallPage: React.FC = () => {
  const [, params] = useRoute<{ slug: string }>('/stall/:slug');
  const [, setLocation] = useLocation();
  const slug = params ? params.slug : 'fusion-cafe';

  const [stall, setStall] = useState<Stall | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { items: cartItems, addItem } = useCart();

  useEffect(() => {
    setLoading(true);
    api.getStall(slug)
      .then(res => {
        setStall(res);
        return api.getMenuItems({ stallId: res.id });
      })
      .then(items => setMenuItems(items))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);

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
          className="w-full h-full object-cover opacity-80"
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
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {stall.name}
              </h1>
              <p className="text-xs text-zinc-300 mt-1 max-w-lg line-clamp-1">
                {stall.description}
              </p>
            </div>
            <div className="bg-white/95 text-zinc-900 text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{stall.rating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4 max-w-full overflow-hidden">
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

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filteredItems.map((item) => {
            const inCart = cartItems.some(c => c.menuItemId === item.id);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-white rounded-3xl p-3 border border-zinc-200/90 shadow-2xs hover:border-brand-500/40 hover:shadow-xs transition-all cursor-pointer flex gap-3 group relative ${
                  !item.isAvailable ? 'opacity-60 grayscale-[40%]' : ''
                }`}
              >
                {/* Photo */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-zinc-100 shrink-0 relative">
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80"}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1">
                      <span className="text-[9px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded uppercase">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block">
                      {item.category}
                    </span>
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
                      disabled={!item.isAvailable}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-all ${
                        !item.isAvailable
                          ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                          : inCart
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                          : 'bg-brand-50 hover:bg-brand-500 text-brand-700 hover:text-white border border-brand-200'
                      }`}
                    >
                      {inCart ? (
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

      {/* Modal for item customisation */}
      <FoodDetailModal
        item={selectedItem}
        stallName={stall.name}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
};
