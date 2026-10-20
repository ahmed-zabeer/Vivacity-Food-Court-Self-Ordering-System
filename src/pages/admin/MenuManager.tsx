import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { MenuItem, Stall } from '../../types';
import { Search, Plus, Filter, Edit2, Check, XCircle } from 'lucide-react';

export const MenuManager: React.FC = () => {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [selectedStall, setSelectedStall] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchMenu = async () => {
    try {
      const [stallsRes, itemsRes] = await Promise.all([
        api.getStalls(),
        api.getMenuItems()
      ]);
      setStalls(stallsRes);
      setItems(itemsRes);
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
            Control live dish availability, modify prices, and verify all 6 stall menus
          </p>
        </div>

        <div className="text-xs font-bold text-zinc-600 bg-zinc-100 px-3 py-1.5 rounded-xl">
          Total Seeded Dishes: <strong>{items.length}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedStall('ALL')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              selectedStall === 'ALL' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200'
            }`}
          >
            All Stalls ({items.length})
          </button>
          {stalls.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStall(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
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
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-700"
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
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
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
    </div>
  );
};
