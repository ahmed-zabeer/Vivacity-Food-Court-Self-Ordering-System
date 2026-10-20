import React, { useState, useEffect } from 'react';
import { useTableSession } from '../../context/TableSessionContext';
import { useCart } from '../../context/CartContext';
import { api } from '../../services/api';
import { Stall } from '../../types';
import { useLocation } from 'wouter';
import { Utensils, Star, Clock, ChevronRight, Sparkles, QrCode, ArrowRight, ShieldCheck } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { tableId, activeOrders } = useTableSession();
  const [, setLocation] = useLocation();
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStalls()
      .then(res => setStalls(res))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const heroStall = stalls.find(s => s.isFeatured) || stalls[0];
  const otherStalls = stalls.filter(s => s.id !== heroStall?.id);
  const activeOrder = activeOrders[0];

  return (
    <div className="max-w-full md:max-w-4xl mx-auto w-full pt-2 pb-3 sm:pb-4 px-4 sm:px-6 flex flex-col gap-5 overflow-x-hidden">
      {/* Table Active Context Ribbon */}
      <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/20 rounded-3xl p-3.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <span className="text-sm font-black">{tableId || 'T17'}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-zinc-900 truncate">
                Dining at Table {tableId || 'T17'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              Multi-Stall single checkout enabled
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setLocation('/scan')}
            className="text-[11px] font-bold text-zinc-600 bg-white/80 hover:bg-white px-2.5 py-1.5 rounded-full border border-zinc-200 shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
            title="Scan different table QR"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Change</span>
          </button>
          <button
            onClick={() => setLocation('/cart')}
            className="text-[11px] font-extrabold text-brand-600 bg-white px-3 py-1.5 rounded-full border border-zinc-200 shadow-2xs hover:bg-brand-50 transition-colors cursor-pointer"
          >
            View Tray
          </button>
        </div>
      </div>

      {/* Live Ongoing Order Banner (if active) */}
      {activeOrder && (
        <div
          onClick={() => setLocation(`/orders/${activeOrder.id}`)}
          className="bg-white rounded-3xl p-4 border border-amber-400/50 shadow-sm flex items-center justify-between cursor-pointer hover:border-brand-500 transition-all active:scale-[0.99] group bg-gradient-to-r from-amber-50/50 to-white"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-zinc-900">
                  Token #{activeOrder.token} {activeOrder.status}
                </span>
                <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate max-w-[200px] sm:max-w-xs mt-0.5">
                {activeOrder.stalls.map(s => s.stallName).join(' & ')} in kitchen
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-brand-600 font-bold text-xs group-hover:translate-x-1 transition-transform">
            <span>Track</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* FEATURED HERO STALL: Coffee Buzz Fusion Cafe */}
      {heroStall && (
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-base">👑</span>
              <h2 className="text-xs font-black text-zinc-900 uppercase tracking-widest">
                Featured Partner
              </h2>
            </div>
            <span className="text-[11px] font-extrabold text-brand-600 uppercase">
              {heroStall.badge}
            </span>
          </div>

          <div
            onClick={() => setLocation(`/stall/${heroStall.slug}`)}
            className="group cursor-pointer bg-white rounded-3xl overflow-hidden border border-zinc-200/90 shadow-sm hover:border-brand-500/50 hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="relative w-full h-52 sm:h-64 bg-zinc-100 overflow-hidden">
              <img
                src={heroStall.coverImage}
                alt={heroStall.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between">
                <div>
                  <span className="bg-brand-500 text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full tracking-wider mb-1.5 inline-block shadow-sm">
                    Premier Fusion Steakhouse
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {heroStall.name}
                  </h3>
                  <p className="text-xs text-zinc-200 mt-1 max-w-sm">
                    Steak • Pizza • Seafood • Boba • Platters
                  </p>
                </div>
                <div className="bg-white/95 backdrop-blur-xs text-zinc-900 font-black text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{heroStall.rating}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-xs bg-white">
              <div className="flex items-center gap-2.5 text-zinc-500 text-xs">
                <span className="flex items-center gap-1 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  {heroStall.prepTime}
                </span>
                <span>•</span>
                <span className="text-zinc-700 font-bold truncate">🔥 Top Rated Sizzlers</span>
              </div>
              <button
                type="button"
                className="bg-brand-500 text-white px-4 py-2 rounded-full font-bold text-xs shadow-2xs hover:bg-brand-600 transition-colors flex items-center gap-1.5 group-hover:translate-x-0.5 duration-200 shrink-0 cursor-pointer"
              >
                <span>Explore Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2-COLUMN GRID: ALL REMAINING FOOD COURT STALLS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-black text-zinc-900 uppercase tracking-widest">
              Food Court Kitchens
            </h2>
            <p className="text-[11px] text-zinc-500">Order across multiple stalls into one tray</p>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            All 6 Kitchens Open
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
          {otherStalls.map((stall) => (
            <div
              key={stall.id}
              onClick={() => setLocation(`/stall/${stall.slug}`)}
              className="cursor-pointer bg-white rounded-3xl overflow-hidden border border-zinc-200/80 shadow-2xs hover:border-brand-500/40 hover:shadow-sm transition-all flex flex-col justify-between active:scale-[0.98] group"
            >
              <div>
                <div className="relative h-32 sm:h-36 w-full bg-zinc-100 overflow-hidden">
                  <img
                    src={stall.coverImage}
                    alt={stall.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md">
                    {stall.prepTime}
                  </span>
                  <span className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-zinc-900 text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-2xs">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>{stall.rating}</span>
                  </span>
                </div>

                <div className="p-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-brand-600 block mb-0.5">
                    {stall.badge}
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 truncate">
                    {stall.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                    {stall.description}
                  </p>
                </div>
              </div>

              <div className="p-3 pt-0">
                <button
                  type="button"
                  className="w-full py-1.5 rounded-xl bg-zinc-50 group-hover:bg-brand-50 text-zinc-700 group-hover:text-brand-700 text-[11px] font-bold border border-zinc-200 group-hover:border-brand-300 transition-colors"
                >
                  View Menu
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Dining Guarantees */}
      <section className="bg-zinc-100/70 rounded-3xl p-4 border border-zinc-200/60 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
            Vivacity Food Court Experience
          </h4>
        </div>
        <p className="text-xs text-zinc-600 leading-relaxed font-normal">
          Sit back at Table <strong>{tableId || 'T17'}</strong>. Add items from your favourite stalls, pay once securely, and your orders will be prepared hot and delivered straight to your table by our floor runners.
        </p>
      </section>
    </div>
  );
};
