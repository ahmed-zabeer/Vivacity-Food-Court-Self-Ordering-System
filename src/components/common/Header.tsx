import React, { useState } from 'react';
import { useTableSession } from '../../context/TableSessionContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingBag, 
  PlayCircle, 
  Shield, 
  ChefHat, 
  UserCheck, 
  ChevronDown, 
  Menu, 
  X, 
  Store, 
  Receipt, 
  UtensilsCrossed,
  Sparkles
} from 'lucide-react';
import { useLocation } from 'wouter';

interface HeaderProps {
  onReplayIntro?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReplayIntro }) => {
  const { tableId, isTakeaway } = useTableSession();
  const { itemCount } = useCart();
  const { currentUser, switchRole, availableUsers } = useAuth();
  const [location, setLocation] = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isStaff = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER', 'CASHIER'].includes(currentUser.role);
  const isKitchenStaff = ['KITCHEN STAFF', 'SUPER ADMIN', 'MANAGER'].includes(currentUser.role);

  const navLinks = [
    { label: 'Menu', href: '/', icon: UtensilsCrossed },
    { label: 'All Stalls', href: '/stalls', icon: Store },
    { label: 'My Orders', href: '/orders', icon: Receipt },
  ];

  if (isStaff) {
    navLinks.push({ label: 'Management', href: '/admin', icon: Shield });
  }
  if (isKitchenStaff) {
    navLinks.push({ label: 'Kitchen KDS', href: '/kitchen', icon: ChefHat });
  }
  if (currentUser.role === 'STALL MANAGER' && currentUser.stallId) {
    navLinks.push({ label: 'My Stall', href: `/stall/${currentUser.stallId}/dashboard`, icon: Store });
  }

  const navigateTo = (path: string) => {
    setLocation(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand & Table Badge */}
        <div
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group shrink-0 min-w-0"
          onClick={() => navigateTo('/')}
        >
          <div className="w-10 h-10 sm:w-10 sm:h-10 rounded-xl overflow-hidden  flex items-center justify-center group-hover:scale-105 -translate-x-3 ">
            <img
              src="/assets/vivacity-logo.png"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  '/assets/vivacity-logo.svg';
              }}
              alt="Vivacity Food Court"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="-ml-2 flex flex-col min-w-0 justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] xs:text-xs sm:text-sm font-extrabold text-zinc-900 tracking-tight leading-none whitespace-nowrap mt-3 -ml-2 ">
                Vivacity Food Court
              </span>
              {tableId && !isTakeaway ? (
                <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-500/30 text-[9px] sm:text-[10px] font-black uppercase whitespace-nowrap shrink-0">
                  {tableId}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-500/30 text-[9px] sm:text-[10px] font-black uppercase whitespace-nowrap shrink-0">
                  Takeaway
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 leading-none mt-1 hidden sm:block">
              7 Kitchens • 55 Tables Hub
            </p>
          </div>
        </div>

        {/* Desktop Proper Menu Bar */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-100/80 p-1 rounded-2xl border border-zinc-200/60">
          {navLinks.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => navigateTo(item.href)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/60'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? 'text-brand-600' : 'text-zinc-500'}`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Replay Intro Button */}
          {onReplayIntro && (
            <button
              onClick={onReplayIntro}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200/80 active:scale-95 transition-all cursor-pointer"
              title="Replay Brand Intro"
            >
              <PlayCircle className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
              <span className="hidden sm:inline">Intro</span>
            </button>
          )}

          {/* Quick Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-1 p-1 sm:px-2.5 sm:py-1.5 rounded-full text-[11px] font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300/80 active:scale-95 transition-all cursor-pointer"
              title="Switch user role"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span className="hidden sm:inline max-w-[70px] sm:max-w-[90px] truncate">
                {currentUser.role.split(' ')[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Switch Role</span>
                  <span className="text-[9px] text-brand-600 font-bold">
                    Demo Mode
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchRole(u.role, u.stallId);
                        setRoleMenuOpen(false);
                        if (
                          u.role === 'SUPER ADMIN' ||
                          u.role === 'MANAGER' ||
                          u.role === 'CASHIER'
                        ) {
                          setLocation('/admin');
                        } else if (u.role === 'KITCHEN STAFF') {
                          setLocation('/kitchen');
                        } else if (u.role === 'RUNNER / WAITER') {
                          setLocation('/admin/runners');
                        } else if (u.role === 'STALL MANAGER' && u.stallId) {
                          setLocation(`/stall/${u.stallId}/dashboard`);
                        } else {
                          setLocation('/');
                        }
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-brand-50 transition-colors ${
                        currentUser.id === u.id
                          ? 'bg-brand-50/70 font-bold text-brand-700'
                          : 'text-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-zinc-900">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {u.role}
                        </div>
                      </div>
                      {currentUser.id === u.id && (
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart / Food Tray Icon */}
          <button
            onClick={() => navigateTo('/cart')}
            className="relative p-1 rounded-full text-zinc-800 hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer"
            title="View Food Tray"
          >
            <ShoppingBag className="w-5 h-5 text-zinc-800" />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 px-1 min-w-[17px] h-4 rounded-full bg-brand-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                {itemCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden  rounded-full text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu Bar (Completely stable, no horizontal shift) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-100 bg-white/98 px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-md">
          <div className="grid grid-cols-2 gap-2 pb-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => navigateTo(item.href)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 border border-brand-200'
                      : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-100'
                  }`}
                >
                  <Icon className="w-4 h-4 text-brand-600" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              Session:{' '}
              <strong className="text-zinc-900">
                {tableId ? `Table ${tableId}` : 'Takeaway'}
              </strong>
            </span>
            {onReplayIntro && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onReplayIntro();
                }}
                className="text-brand-600 font-bold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Play Intro</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
