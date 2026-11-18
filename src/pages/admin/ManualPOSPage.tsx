import React, { useState, useEffect, useMemo } from 'react';
import {
  Stall,
  MenuItem,
  Order,
  MenuVariant,
  MenuAddOn
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'wouter';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Percent,
  DollarSign,
  CreditCard,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Phone,
  Lock,
  Printer,
  RotateCcw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface CartItem {
  cartId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: MenuVariant;
  selectedAddOns: MenuAddOn[];
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

export const ManualPOSPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  // Master Data
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Navigation
  const [selectedStallId, setSelectedStallId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);

  // Order Details
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableId, setTableId] = useState<string>('T01');
  const [serviceType, setServiceType] = useState<'SELF_SERVICE' | 'TABLE_SERVICE'>('SELF_SERVICE');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Discount System
  const [discountType, setDiscountType] = useState<'NONE' | '5' | '10' | '15' | 'CUSTOM'>('NONE');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Payment System
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'bKash' | 'Nagad' | 'Card / Physical POS Terminal'>('CASH');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

  // Physical Card POS Terminal System
  const [cardTerminalName, setCardTerminalName] = useState<string>('Terminal #1 (Ingenico Desk 3500)');
  const [cardApprovalCode, setCardApprovalCode] = useState<string>('');
  const [cardPosStatus, setCardPosStatus] = useState<'APPROVED' | 'PENDING' | 'DECLINED'>('APPROVED');

  // Customization modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [tempVariant, setTempVariant] = useState<MenuVariant | null>(null);
  const [tempAddOns, setTempAddOns] = useState<MenuAddOn[]>([]);
  const [tempNotes, setTempNotes] = useState<string>('');

  // Order success modal / receipt modal
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 55 Tables list (T01 - T55)
  const allTables = useMemo(() => {
    return Array.from({ length: 55 }, (_, i) => `T${(i + 1).toString().padStart(2, '0')}`);
  }, []);

  // Fetch stalls and menu
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getStalls().catch(() => []),
      api.getMenuItems().catch(() => [])
    ])
      .then(([stallsData, itemsData]) => {
        if (!isMounted) return;
        setStalls(stallsData || []);
        setMenuItems(itemsData || []);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Current categories for the selected stall
  const availableCategories = useMemo(() => {
    if (selectedStallId === 'ALL') {
      const cats = new Set<string>();
      menuItems.forEach(i => {
        if (i.category) cats.add(i.category);
      });
      return Array.from(cats);
    }
    const stall = stalls.find(s => s.id === selectedStallId);
    if (stall && stall.categories && stall.categories.length > 0) {
      return stall.categories;
    }
    const cats = new Set<string>();
    menuItems.filter(i => i.stallId === selectedStallId).forEach(i => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats);
  }, [selectedStallId, stalls, menuItems]);

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (selectedStallId !== 'ALL' && item.stallId !== selectedStallId) {
        return false;
      }
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesCategory && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [menuItems, selectedStallId, selectedCategory, searchQuery]);

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  // Table Service adds exactly 5% waiter service fee on subtotal; Self-Service is ৳0
  const serviceCharge = useMemo(() => {
    return serviceType === 'TABLE_SERVICE' ? Math.round(subtotal * 0.05) : 0;
  }, [serviceType, subtotal]);

  // Discount percentage resolution
  const effectiveDiscountPercent = useMemo(() => {
    if (discountType === '5') return 5;
    if (discountType === '10') return 10;
    if (discountType === '15') return 15;
    if (discountType === 'CUSTOM') {
      const val = parseFloat(customDiscountPercent);
      return !isNaN(val) && val > 0 ? Math.min(100, val) : 0;
    }
    return 0;
  }, [discountType, customDiscountPercent]);

  // Discount requires Manager Approval if:
  // User is Cashier and discount > 10% (15% or Custom > 10%)
  const requiresManagerApproval = useMemo(() => {
    const isHighRank = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'].includes(currentUser.role);
    if (isHighRank) return false;
    return effectiveDiscountPercent > 10;
  }, [currentUser.role, effectiveDiscountPercent]);

  const discountAmount = useMemo(() => {
    if (effectiveDiscountPercent <= 0 || subtotal <= 0) return 0;
    return Math.round((subtotal * effectiveDiscountPercent) / 100);
  }, [subtotal, effectiveDiscountPercent]);

  const netPayable = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + serviceCharge);
  }, [subtotal, discountAmount, serviceCharge]);

  // Cash Calculation: Change to Return = Cash Received - Net Payable
  const cashReceivedNumber = useMemo(() => {
    const num = parseFloat(cashReceivedInput);
    return isNaN(num) ? 0 : num;
  }, [cashReceivedInput]);

  const changeToReturn = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    return cashReceivedNumber >= netPayable ? cashReceivedNumber - netPayable : 0;
  }, [paymentMethod, cashReceivedNumber, netPayable]);

  const remainingCashDue = useMemo(() => {
    if (paymentMethod !== 'CASH') return 0;
    return cashReceivedNumber < netPayable ? netPayable - cashReceivedNumber : 0;
  }, [paymentMethod, cashReceivedNumber, netPayable]);

  // Add Item to Cart
  const handleAddToCart = (item: MenuItem) => {
    if (item.isAvailable === false) return;

    // If item has variants or add-ons, open customization modal
    if ((item.variants && item.variants.length > 0) || (item.addOns && item.addOns.length > 0) || (item.burgerPatties && item.burgerPatties.length > 0)) {
      setCustomizingItem(item);
      setTempVariant(item.variants ? item.variants[0] : null);
      setTempAddOns([]);
      setTempNotes('');
      return;
    }

    // Direct add
    setCart(prev => {
      const existingIdx = prev.findIndex(c => c.menuItem.id === item.id && !c.selectedVariant && c.selectedAddOns.length === 0);
      if (existingIdx >= 0) {
        const next = [...prev];
        const existing = next[existingIdx];
        const newQty = existing.quantity + 1;
        next[existingIdx] = {
          ...existing,
          quantity: newQty,
          totalPrice: existing.unitPrice * newQty
        };
        return next;
      }

      return [
        ...prev,
        {
          cartId: `${item.id}-${Date.now()}-${Math.random()}`,
          menuItem: item,
          quantity: 1,
          selectedAddOns: [],
          unitPrice: item.price,
          totalPrice: item.price
        }
      ];
    });
  };

  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    let basePrice = customizingItem.price;
    if (tempVariant) {
      basePrice = tempVariant.price;
    }
    const addOnsTotal = tempAddOns.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = basePrice + addOnsTotal;

    const newCartItem: CartItem = {
      cartId: `${customizingItem.id}-${Date.now()}-${Math.random()}`,
      menuItem: customizingItem,
      quantity: 1,
      selectedVariant: tempVariant || undefined,
      selectedAddOns: tempAddOns,
      notes: tempNotes.trim() || undefined,
      unitPrice,
      totalPrice: unitPrice
    };

    setCart(prev => [...prev, newCartItem]);
    setCustomizingItem(null);
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartId !== cartId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          return {
            ...item,
            quantity: nextQty,
            totalPrice: item.unitPrice * nextQty
          };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(c => c.cartId !== cartId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items in the current counter order?')) {
      setCart([]);
      setDiscountType('NONE');
      setCustomDiscountPercent('');
      setDiscountReason('');
      setCashReceivedInput('');
      setCardApprovalCode('');
    }
  };

  const handleVerifyManagerPin = () => {
    if (managerPin === '1234' || ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'].includes(currentUser.role)) {
      setManagerApproved(true);
      setPinError(null);
    } else {
      setPinError('Invalid Manager Authorization PIN. Default is 1234.');
    }
  };

  // Submit Order to Central Backend
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setSubmitError('Cart is empty. Please add at least one food item.');
      return;
    }

    if (orderType === 'DINE_IN' && !tableId) {
      setSubmitError('Table number is required for Dine-in orders.');
      return;
    }

    if (requiresManagerApproval && !managerApproved) {
      setSubmitError('Discounts above 10% require Manager PIN authorization.');
      return;
    }

    if (paymentMethod === 'CASH') {
      if (cashReceivedNumber < netPayable) {
        setSubmitError(`Insufficient cash received. Remaining due: ৳${netPayable - cashReceivedNumber}`);
        return;
      }
    }

    if (paymentMethod === 'Card / Physical POS Terminal') {
      if (cardPosStatus !== 'APPROVED') {
        setSubmitError('Card payment cannot proceed. POS terminal status must be APPROVED.');
        return;
      }
      if (!cardApprovalCode.trim()) {
        setSubmitError('Please enter the Approval Code / RRN from the physical POS merchant slip.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const rawItems = cart.map(c => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        variantId: c.selectedVariant?.id,
        variantName: c.selectedVariant?.name,
        selectedAddOns: c.selectedAddOns.map(a => a.id),
        notes: c.notes || ''
      }));

      const orderPayload = {
        tableId: orderType === 'DINE_IN' ? tableId : null,
        type: orderType === 'TAKEAWAY' ? ('PARCEL' as const) : ('DINE_IN' as const),
        customerOrderType: orderType,
        rawItems,
        customerName: customerName.trim() || 'Counter Guest',
        customerPhone: customerPhone.trim(),
        serviceType: orderType === 'DINE_IN' ? serviceType : 'SELF_SERVICE',
        customerNotes: customerNotes.trim(),
        paymentMethod,
        discountType,
        discountPercent: effectiveDiscountPercent,
        discountAmount,
        discountReason: discountReason.trim() || (discountAmount > 0 ? 'Counter Discount' : ''),
        discountAppliedBy: currentUser.name,
        discountApprovedBy: requiresManagerApproval ? 'Manager (PIN Verified)' : (discountAmount > 0 ? currentUser.name : ''),
        cashReceived: paymentMethod === 'CASH' ? cashReceivedNumber : null,
        changeReturned: paymentMethod === 'CASH' ? changeToReturn : null,
        cardPosTerminal: paymentMethod === 'Card / Physical POS Terminal' ? cardTerminalName : null,
        cardPosRef: paymentMethod === 'Card / Physical POS Terminal' ? cardApprovalCode.trim() : null,
        cardPosStatus: paymentMethod === 'Card / Physical POS Terminal' ? cardPosStatus : null,
        cashierName: currentUser.name,
        cashierId: currentUser.id
      };

      const result = await api.createManualOrder(orderPayload);
      setCreatedOrder(result);
      setShowReceiptModal(true);

      // Reset cart and fields for the next order
      setCart([]);
      setDiscountType('NONE');
      setCustomDiscountPercent('');
      setDiscountReason('');
      setManagerPin('');
      setManagerApproved(false);
      setCashReceivedInput('');
      setCardApprovalCode('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerNotes('');
    } catch (err: any) {
      console.error('Manual order submission failed:', err);
      setSubmitError(err?.message || 'Failed to submit order. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col font-sans select-none">
      {/* Top Header Bar */}
      <header className="h-16 bg-zinc-900 text-white px-4 md:px-6 flex items-center justify-between shadow-md shrink-0 border-b border-zinc-800 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            title="Return to Central Counter"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Back to Central Counter</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-6 w-px bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center font-black shadow-xs">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Manual POS Terminal</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                  Central Counter
                </span>
              </h1>
              <p className="text-[10px] text-zinc-400 hidden md:block">
                Direct walk-in ordering • Multi-stall unified checkout
              </p>
            </div>
          </div>
        </div>

        {/* Right Info: Cashier Badge & Live Clock */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1.5 justify-end">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-xs font-bold text-white">{currentUser.name}</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Role: <strong className="text-amber-400">{currentUser.role}</strong>
            </span>
          </div>

          <div className="h-6 w-px bg-zinc-700 hidden sm:block" />

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{currentTime || '12:00:00 PM'}</span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Clear current cart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Full-Page Workspace: 2-Column Responsive Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Food Menu Explorer (60-65% width) */}
        <div className="flex-1 flex flex-col bg-zinc-50 border-r border-zinc-200 overflow-hidden">
          {/* 1. Stalls Horizontal Selector Tabs */}
          <div className="bg-white border-b border-zinc-200 p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-2xs">
            <button
              onClick={() => {
                setSelectedStallId('ALL');
                setSelectedCategory('ALL');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                selectedStallId === 'ALL'
                  ? 'bg-zinc-900 text-white shadow-xs ring-2 ring-zinc-900/20'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>All 7 Kitchens</span>
            </button>

            {stalls.map(stall => (
              <button
                key={stall.id}
                onClick={() => {
                  setSelectedStallId(stall.id);
                  setSelectedCategory('ALL');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                  selectedStallId === stall.id
                    ? 'bg-brand-500 text-white shadow-xs ring-2 ring-brand-500/20'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                {stall.avatar && (
                  <img src={stall.avatar} alt={stall.name} className="w-4 h-4 rounded-full object-cover" />
                )}
                <span>{stall.name}</span>
              </button>
            ))}
          </div>

          {/* 2. Search & Category Filters Bar */}
          <div className="p-3 bg-white border-b border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search food by name, ingredient, category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black shrink-0 cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                All Categories
              </button>
              {availableCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-brand-500 text-white shadow-2xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Food Items Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Loading menu items...
              </div>
            ) : filteredMenuItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs font-bold">No food items matched your search or category filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredMenuItems.map(item => {
                  const isOutOfStock = item.isAvailable === false;
                  const stallObj = stalls.find(s => s.id === item.stallId);
                  const isFanta = item.id === 'db-fanta';

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && handleAddToCart(item)}
                      className={`group relative rounded-2xl border p-2.5 flex flex-col justify-between transition-all select-none cursor-pointer ${
                        isOutOfStock
                          ? 'bg-zinc-50 border-zinc-200 opacity-60 cursor-not-allowed'
                          : 'bg-white border-zinc-200 hover:border-brand-500 hover:shadow-md'
                      }`}
                    >
                      {/* Food Image with object-contain to prevent stretching/cropping */}
                      <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 mb-2 flex items-center justify-center p-1">
                        <img
                          src={item.image || '/assets/vivacity-chili-icon.png'}
                          alt={item.name}
                          className={`w-full h-full ${
                            isFanta ? 'object-contain' : 'object-cover'
                          } rounded-lg transition-transform group-hover:scale-105 ${
                            isOutOfStock ? 'grayscale' : ''
                          }`}
                          onError={e => {
                            (e.target as HTMLImageElement).src = '/assets/vivacity-chili-icon.png';
                          }}
                        />
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] uppercase tracking-wider">
                              Out of Stock
                            </span>
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white uppercase truncate max-w-[90%]">
                          {stallObj?.name || item.stallId}
                        </span>
                      </div>

                      {/* Title & Price */}
                      <div>
                        <h3 className="text-xs font-black text-zinc-900 leading-snug line-clamp-2 mb-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-brand-600">
                            ৳{item.price}
                          </span>
                          {!isOutOfStock && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleAddToCart(item);
                              }}
                              className="w-6 h-6 rounded-lg bg-zinc-900 group-hover:bg-brand-500 text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                              title="Add to Order"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: POS Register & Payment Terminal (35-40% width) */}
        <div className="w-full lg:w-[460px] xl:w-[500px] bg-white flex flex-col shrink-0 overflow-y-auto border-t lg:border-t-0 shadow-lg">
          {/* Order Configuration Header */}
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 space-y-3">
            {/* Dine-In vs Takeaway Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  orderType === 'DINE_IN'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span>🍽️ Dine-In</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                <span>🥡 Takeaway</span>
              </button>
            </div>

            {/* Table & Service Type (Only required for Dine-in) */}
            {orderType === 'DINE_IN' && (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Dining Table *
                  </label>
                  <select
                    value={tableId}
                    onChange={e => setTableId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  >
                    {allTables.map(t => (
                      <option key={t} value={t}>
                        Table {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Service Style
                  </label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="SELF_SERVICE">Self-Service (৳0)</option>
                    <option value="TABLE_SERVICE">Table Service (+5%)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Optional Customer Info */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Guest Name (Optional)"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
              <input
                type="text"
                placeholder="Phone (Optional)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="p-4 flex-1 overflow-y-auto space-y-2.5 min-h-[140px] max-h-[300px]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
                <ShoppingCart className="w-8 h-8 opacity-40 text-zinc-400" />
                <p className="text-xs font-bold">Counter cart is empty.</p>
                <p className="text-[11px] text-zinc-400">Click any food card on the left to add items.</p>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.cartId}
                  className="p-2.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-start justify-between gap-2 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-zinc-900 leading-snug truncate">
                      {item.menuItem.name}
                    </h4>
                    <div className="text-[10px] text-zinc-500">
                      {item.selectedVariant && (
                        <span className="text-brand-600 font-bold block">
                          Size: {item.selectedVariant.name}
                        </span>
                      )}
                      {item.selectedAddOns.length > 0 && (
                        <span className="text-zinc-600 block">
                          Add: {item.selectedAddOns.map(a => a.name).join(', ')}
                        </span>
                      )}
                      {item.notes && (
                        <span className="italic text-amber-700 block">
                          Note: "{item.notes}"
                        </span>
                      )}
                      <span className="font-bold text-zinc-700">
                        ৳{item.unitPrice} each
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.cartId, -1)}
                      className="w-6 h-6 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-zinc-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.cartId, 1)}
                      className="w-6 h-6 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100 flex items-center justify-center font-bold text-xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-black text-zinc-900 w-14 text-right">
                      ৳{item.totalPrice}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.cartId)}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Financial Breakdown & Discounts */}
          <div className="p-4 border-t border-zinc-200 bg-zinc-50/60 space-y-3 shrink-0">
            {/* Discount selector buttons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Discount Offer
                </span>
                {effectiveDiscountPercent > 0 && (
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {effectiveDiscountPercent}% OFF (-৳{discountAmount})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {(['NONE', '5', '10', '15', 'CUSTOM'] as const).map(dt => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => {
                      setDiscountType(dt);
                      if (dt !== '15' && dt !== 'CUSTOM') {
                        setManagerApproved(false);
                      }
                    }}
                    className={`py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                      discountType === dt
                        ? 'bg-brand-500 text-white shadow-2xs'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {dt === 'NONE' ? '0%' : dt === 'CUSTOM' ? 'Custom' : `${dt}%`}
                  </button>
                ))}
              </div>

              {discountType === 'CUSTOM' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Enter Custom % (e.g. 20)"
                    value={customDiscountPercent}
                    onChange={e => setCustomDiscountPercent(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              )}

              {/* Manager Approval Box if discount > 10% */}
              {requiresManagerApproval && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Manager Authorization Required (&gt;10%)</span>
                  </div>

                  {managerApproved ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/60 p-1.5 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Authorized by Manager PIN</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Manager PIN (1234)"
                          value={managerPin}
                          onChange={e => setManagerPin(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-zinc-800"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyManagerPin}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Verify
                        </button>
                      </div>
                      {pinError && (
                        <p className="text-[10px] text-red-600 font-bold">{pinError}</p>
                      )}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="Reason for discount (VIP, Promo, Staff...)"
                    value={discountReason}
                    onChange={e => setDiscountReason(e.target.value)}
                    className="w-full px-3 py-1 bg-white border border-amber-200 rounded-lg text-xs text-zinc-800 placeholder-zinc-400"
                  />
                </div>
              )}
            </div>

            {/* Subtotal, Service Charge, Net Payable */}
            <div className="space-y-1.5 text-xs pt-2 border-t border-zinc-200">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal:</span>
                <span className="font-bold">৳{subtotal}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>Table Waiter Service (5%):</span>
                  <span className="font-bold">+৳{serviceCharge}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount ({effectiveDiscountPercent}%):</span>
                  <span>-৳{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-zinc-900 pt-1.5 border-t border-zinc-200">
                <span className="uppercase tracking-wider">Net Payable:</span>
                <span className="text-xl text-brand-600 font-black">
                  ৳{netPayable}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector & Calculator */}
          <div className="p-4 border-t border-zinc-200 bg-white space-y-3 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-1">
              Select Payment Method
            </span>

            <div className="grid grid-cols-4 gap-1.5">
              {(['CASH', 'bKash', 'Nagad', 'Card / Physical POS Terminal'] as const).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    paymentMethod === method
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {method === 'CASH' && <DollarSign className="w-4 h-4 text-emerald-400" />}
                  {method === 'bKash' && <Smartphone className="w-4 h-4 text-pink-400" />}
                  {method === 'Nagad' && <Smartphone className="w-4 h-4 text-orange-400" />}
                  {method === 'Card / Physical POS Terminal' && <CreditCard className="w-4 h-4 text-blue-400" />}
                  <span className="text-[10px] truncate max-w-full">
                    {method === 'Card / Physical POS Terminal' ? 'POS Card' : method}
                  </span>
                </button>
              ))}
            </div>

            {/* CASH CALCULATOR (CRITICAL SPEC REQUIREMENT) */}
            {paymentMethod === 'CASH' && (
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Cash Payment Calculator</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Change = Received - Net</span>
                </div>

                {/* Quick Cash Presets */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {[50, 100, 500, 1000].map(addVal => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => setCashReceivedInput(String((cashReceivedNumber || 0) + addVal))}
                      className="px-2 py-1 bg-white border border-emerald-300 rounded-lg text-[10px] font-black text-emerald-800 hover:bg-emerald-100 transition-colors shrink-0 cursor-pointer"
                    >
                      +৳{addVal}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput(String(netPayable))}
                    className="px-2 py-1 bg-emerald-700 text-white rounded-lg text-[10px] font-black hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer"
                  >
                    Exact (৳{netPayable})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput('')}
                    className="px-2 py-1 bg-white border border-zinc-300 rounded-lg text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Cash Received Input */}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-900 mb-1">
                    Cash Received from Guest (৳)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter cash received..."
                    value={cashReceivedInput}
                    onChange={e => setCashReceivedInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-emerald-300 rounded-xl text-base font-black text-emerald-900 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                {/* Change or Due Display */}
                {cashReceivedInput && (
                  <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                    {cashReceivedNumber >= netPayable ? (
                      <>
                        <span className="text-xs font-black text-emerald-900">
                          Change to Return:
                        </span>
                        <span className="text-lg font-black text-emerald-700">
                          ৳{changeToReturn}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-black text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Remaining Due:
                        </span>
                        <span className="text-sm font-black text-red-600">
                          ৳{remainingCashDue}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PHYSICAL CARD POS TERMINAL WORKFLOW */}
            {paymentMethod === 'Card / Physical POS Terminal' && (
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Physical Card POS Terminal Integration</span>
                </div>

                <p className="text-[11px] text-blue-800 leading-snug">
                  Swipe/Insert customer card on the physical terminal. Verify the paper transaction slip before recording below.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">
                      Terminal Machine
                    </label>
                    <select
                      value={cardTerminalName}
                      onChange={e => setCardTerminalName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-zinc-800"
                    >
                      <option value="Terminal #1 (Ingenico Desk 3500)">Terminal #1 (Ingenico)</option>
                      <option value="Terminal #2 (Pax A920 Pro)">Terminal #2 (Pax A920)</option>
                      <option value="Terminal #3 (Verifone V200c)">Terminal #3 (Verifone)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">
                      Terminal Result *
                    </label>
                    <select
                      value={cardPosStatus}
                      onChange={e => setCardPosStatus(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-zinc-800"
                    >
                      <option value="APPROVED">APPROVED (Successful)</option>
                      <option value="PENDING">PENDING</option>
                      <option value="DECLINED">DECLINED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-blue-900 mb-1">
                    Approval Code / RRN / Transaction # *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. APP-849201 or RRN-99214"
                    value={cardApprovalCode}
                    onChange={e => setCardApprovalCode(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-blue-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[9px] text-blue-700 mt-0.5">
                    Found on the printed paper slip from the physical POS device.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Place Order & Charge Button */}
            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleSubmitOrder}
              className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                submitting || cart.length === 0
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]'
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing Payment & KOT...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    Charge ৳{netPayable} & Print Memo
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Item Customization Modal */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-zinc-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-brand-600 tracking-wider">
                  Customize Food Item
                </span>
                <h3 className="text-base font-black text-zinc-900">
                  {customizingItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Variants */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-zinc-700">
                  Select Size / Portion:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.variants.map(v => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => setTempVariant(v)}
                      className={`p-2 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                        tempVariant?.name === v.name
                          ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                          : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="font-black">{v.name}</div>
                      <div className="text-[11px] text-brand-600">৳{v.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-Ons */}
            {customizingItem.addOns && customizingItem.addOns.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-zinc-700">
                  Add Extra Ingredients:
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {customizingItem.addOns.map(addon => {
                    const isSelected = tempAddOns.some(a => a.name === addon.name);
                    return (
                      <div
                        key={addon.name}
                        onClick={() => {
                          if (isSelected) {
                            setTempAddOns(prev => prev.filter(a => a.name !== addon.name));
                          } else {
                            setTempAddOns(prev => [...prev, addon]);
                          }
                        }}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 text-brand-900'
                            : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                        }`}
                      >
                        <span>{addon.name}</span>
                        <span className="text-brand-600">+৳{addon.price}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Kitchen Notes */}
            <div className="space-y-1">
              <label className="block text-xs font-black text-zinc-700">
                Special Kitchen Note:
              </label>
              <input
                type="text"
                placeholder="e.g. Less spicy, no mayo, extra sauce"
                value={tempNotes}
                onChange={e => setTempNotes(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-black shadow-xs cursor-pointer"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Cash Memo & Receipt Modal */}
      {showReceiptModal && createdOrder && (
        <ReceiptModal
          order={createdOrder}
          onClose={() => {
            setShowReceiptModal(false);
          }}
        />
      )}
    </div>
  );
};
