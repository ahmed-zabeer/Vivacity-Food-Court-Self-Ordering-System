import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MenuItem, Stall } from '../../types';
import { Search, Plus, Filter, Edit2, Check, XCircle, Sliders, Utensils } from 'lucide-react';

export const MenuManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'CUSTOMIZATIONS'>('ITEMS');
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [customConfig, setCustomConfig] = useState<any>(null);
  const [selectedStall, setSelectedStall] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  
  // Customization editing state
  const [editingCustomKey, setEditingCustomKey] = useState<{ category: string; id: string } | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchMenu = async () => {
    try {
      const [stallsRes, itemsRes, configRes] = await Promise.all([
        api.getStalls(),
        api.getMenuItems(),
        api.getCustomizationConfig()
      ]);
      setStalls(stallsRes);
      setItems(itemsRes);
      setCustomConfig(configRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await api.updateItemAvailability(item.id, !item.isAvailable);
      fetchMenu();
    } catch (e) {
      alert('Failed to toggle availability');
    }
  };

  const handleSavePrice = async (item: MenuItem) => {
    const num = Number(priceInput);
    if (isNaN(num) || num <= 0) return;
    try {
      await api.updateItemPrice(item.id, num);
      setEditingPriceId(null);
      fetchMenu();
    } catch (e) {
      alert('Failed to update price');
    }
  };

  const handleSaveCustomPrice = async (categoryKey: string, addOnId: string) => {
    const num = Number(customPriceInput);
    if (isNaN(num) || num < 0) return;
    try {
      await api.updateCustomizationPrice(categoryKey, addOnId, num);
      setEditingCustomKey(null);
      fetchMenu();
    } catch (e: any) {
      alert(e.message || 'Failed to update customization price');
    }
  };

  const filtered = items.filter(i => {
    const matchStall = selectedStall === 'ALL' || i.stallId === selectedStall;
    const matchSearch = !search || 
      i.name.toLowerCase().includes(search.toLowerCase()) || 
      i.category.toLowerCase().includes(search.toLowerCase());
    return matchStall && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto w-full p-4 md:p-6 pb-4 sm:pb-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
            Menu Management &amp; Stock Availability
          </h1>
          <p className="text-xs text-zinc-500">
            Control dish availability, modify dish base prices, and configure add-on and topping pricing
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
          <button
            onClick={() => setActiveTab('ITEMS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ITEMS'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dishes ({items.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CUSTOMIZATIONS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CUSTOMIZATIONS'
                ? 'bg-brand-500 text-white shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Add-on &amp; Topping Pricing</span>
          </button>
        </div>
      </div>

      {activeTab === 'ITEMS' && (
        <>
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedStall('ALL')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedStall === 'ALL' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200'
                }`}
              >
                All Stalls ({items.length})
              </button>
              {stalls.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStall(s.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    selectedStall === s.id ? 'bg-brand-500 text-white' : 'bg-white text-zinc-600 border border-zinc-200'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search dish or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 text-xs"
              />
            </div>
          </div>

          {/* Dishes Table */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="p-4">Dish</th>
                    <th className="p-4">Stall</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Availability</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="p-4 font-bold text-zinc-900 flex items-center gap-3">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?w=100&q=80"}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover bg-zinc-100 shrink-0"
                        />
                        <div>
                          <div>{item.name}</div>
                          {item.description && (
                            <p className="text-[10px] text-zinc-400 max-w-xs truncate font-normal">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-600 font-semibold">
                        {stalls.find(s => s.id === item.stallId)?.name || item.stallId}
                      </td>
                      <td className="p-4 text-zinc-500 font-bold uppercase text-[10px]">
                        {item.category}
                      </td>
                      <td className="p-4 font-black text-brand-600">
                        {editingPriceId === item.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={priceInput}
                              onChange={(e) => setPriceInput(e.target.value)}
                              className="w-20 px-2 py-1 border rounded text-xs font-bold"
                            />
                            <button onClick={() => handleSavePrice(item)} className="p-1 text-emerald-600">✓</button>
                            <button onClick={() => setEditingPriceId(null)} className="p-1 text-zinc-400">✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span>৳ {item.price}</span>
                            <button
                              onClick={() => {
                                setEditingPriceId(item.id);
                                setPriceInput(item.price.toString());
                              }}
                              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          item.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            item.isAvailable
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {item.isAvailable ? 'Mark Sold Out' : 'Make Available'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CUSTOMIZATIONS & ADD-ON PRICING TAB */}
      {activeTab === 'CUSTOMIZATIONS' && customConfig && (
        <div className="space-y-6">
          <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-950 mb-1">
              Live Customization &amp; Add-on Pricing Controls
            </h3>
            <p className="text-xs text-amber-800 font-medium">
              Update pricing for Boba pearls, Pizza toppings, Burger patties &amp; add-ons, and Waffle toppings. Changes apply instantly to customer menus, order calculations, and kitchen displays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. BOBA PEARLS */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                  <span>🧋 Boba Drink Pearl Options</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Stall 07 • Drinks &amp; Beverage</span>
              </div>
              <div className="divide-y divide-zinc-100">
                {(customConfig.boba_pearls || []).map((p: any) => {
                  const isEditing = editingCustomKey?.category === 'boba_pearls' && editingCustomKey?.id === p.id;
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800">{p.name}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-xs font-bold"
                            />
                            <button
                              onClick={() => handleSaveCustomPrice('boba_pearls', p.id)}
                              className="p-1 text-emerald-600 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCustomKey(null)}
                              className="p-1 text-zinc-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-brand-600">৳ {p.price}</span>
                            <button
                              onClick={() => {
                                setEditingCustomKey({ category: 'boba_pearls', id: p.id });
                                setCustomPriceInput(p.price.toString());
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. PIZZA TOPPINGS */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                  <span>🍕 Pizza Custom Toppings</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Stall 01 • Fusion Cafe</span>
              </div>
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto pr-1">
                {(customConfig.pizza_toppings || []).map((t: any) => {
                  const isEditing = editingCustomKey?.category === 'pizza_toppings' && editingCustomKey?.id === t.id;
                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800">{t.name}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-xs font-bold"
                            />
                            <button
                              onClick={() => handleSaveCustomPrice('pizza_toppings', t.id)}
                              className="p-1 text-emerald-600 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCustomKey(null)}
                              className="p-1 text-zinc-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-brand-600">৳ {t.price}</span>
                            <button
                              onClick={() => {
                                setEditingCustomKey({ category: 'pizza_toppings', id: t.id });
                                setCustomPriceInput(t.price.toString());
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. BURGER PATTIES & ADD-ONS */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                  <span>🍔 Burger Customization &amp; Add-ons</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Stall 06 • Burger Bar</span>
              </div>
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto pr-1">
                <div className="py-1 text-[10px] font-black uppercase text-zinc-400 bg-zinc-50 px-2 rounded">
                  Patty Options
                </div>
                {(customConfig.burger_patties || []).map((p: any) => {
                  const isEditing = editingCustomKey?.category === 'burger_patties' && editingCustomKey?.id === p.id;
                  return (
                    <div key={p.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800">{p.name}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-xs font-bold"
                            />
                            <button
                              onClick={() => handleSaveCustomPrice('burger_patties', p.id)}
                              className="p-1 text-emerald-600 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCustomKey(null)}
                              className="p-1 text-zinc-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-brand-600">৳ {p.price}</span>
                            <button
                              onClick={() => {
                                setEditingCustomKey({ category: 'burger_patties', id: p.id });
                                setCustomPriceInput(p.price.toString());
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="py-1 mt-2 text-[10px] font-black uppercase text-zinc-400 bg-zinc-50 px-2 rounded">
                  Extras &amp; Add-ons
                </div>
                {(customConfig.burger_addons || []).map((a: any) => {
                  const isEditing = editingCustomKey?.category === 'burger_addons' && editingCustomKey?.id === a.id;
                  return (
                    <div key={a.id} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800">{a.name}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-xs font-bold"
                            />
                            <button
                              onClick={() => handleSaveCustomPrice('burger_addons', a.id)}
                              className="p-1 text-emerald-600 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCustomKey(null)}
                              className="p-1 text-zinc-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-brand-600">৳ {a.price}</span>
                            <button
                              onClick={() => {
                                setEditingCustomKey({ category: 'burger_addons', id: a.id });
                                setCustomPriceInput(a.price.toString());
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. WAFFLE TOPPINGS */}
            <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
                  <span>🧇 Waffle Customization &amp; Toppings</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Stall 04 • Waffle City</span>
              </div>
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto pr-1">
                {(customConfig.waffle_toppings || []).map((w: any) => {
                  const isEditing = editingCustomKey?.category === 'waffle_toppings' && editingCustomKey?.id === w.id;
                  return (
                    <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-800">{w.name}</span>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={customPriceInput}
                              onChange={(e) => setCustomPriceInput(e.target.value)}
                              className="w-16 px-2 py-1 border rounded text-xs font-bold"
                            />
                            <button
                              onClick={() => handleSaveCustomPrice('waffle_toppings', w.id)}
                              className="p-1 text-emerald-600 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCustomKey(null)}
                              className="p-1 text-zinc-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-black text-brand-600">৳ {w.price}</span>
                            <button
                              onClick={() => {
                                setEditingCustomKey({ category: 'waffle_toppings', id: w.id });
                                setCustomPriceInput(w.price.toString());
                              }}
                              className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                              title="Edit price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};