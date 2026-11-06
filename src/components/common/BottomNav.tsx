import React from 'react';
import { Home, Store, Search, ShoppingBag, Receipt, QrCode } from 'lucide-react';
import { useLocation } from 'wouter';
import { useCart } from '../../context/CartContext';

export const BottomNav: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { itemCount, grandTotal } = useCart();

  const isCartPage = location === '/cart' || location === '/checkout';

  return (
    <>
      {/* Floating Sticky Cart Summary Pill above Bottom Bar */}
      {itemCount > 0 && !isCartPage && (
        <div className="fixed bottom-18 left-0 right-0 z-30 px-4 pointer-events-none md:max-w-md md:mx-auto">
          <button
            onClick={() => setLocation('/cart')}
            className="pointer-events-auto w-full bg-brand-500 hover:bg-brand-600 text-white rounded-2xl p-3.5 shadow-[0_8px_25px_rgba(224,109,36,0.35)] flex items-center justify-between font-bold transition-all active:scale-[0.98] border border-amber-400/30 backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                {itemCount}
              </span>
              <span className="text-xs uppercase tracking-wider text-amber-100">
                Food Tray
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold">৳ {grandTotal}</span>
              <span className="text-xs bg-white text-brand-600 px-3 py-1 rounded-full font-black shadow-xs">
                View Tray →
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Main Mobile Bottom Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200 py-1.5 px-3 md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <button
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center py-1 transition-colors ${
              location === '/' ? 'text-brand-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setLocation('/stalls')}
            className={`flex flex-col items-center py-1 transition-colors ${
              location === '/stalls' ? 'text-brand-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Store className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">All Stalls</span>
          </button>

          <button
            onClick={() => setLocation('/search')}
            className={`flex flex-col items-center py-1 transition-colors ${
              location === '/search' ? 'text-brand-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Search className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Search</span>
          </button>

          <button
            onClick={() => setLocation('/cart')}
            className={`relative flex flex-col items-center py-1 transition-colors ${
              location === '/cart' ? 'text-brand-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 mb-0.5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-brand-500 text-white text-[9px] font-black flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">Tray</span>
          </button>

          <button
            onClick={() => setLocation('/orders')}
            className={`flex flex-col items-center py-1 transition-colors ${
              location === '/orders' ? 'text-brand-600 font-bold' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Receipt className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Tracking</span>
          </button>
        </div>
      </nav>
    </>
  );
};
