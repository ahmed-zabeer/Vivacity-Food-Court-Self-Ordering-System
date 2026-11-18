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
import {
  X,
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
  Store,
  Clock,
  User,
  Phone,
  Lock,
  ShieldAlert,
  Printer
} from 'lucide-react';

interface ManualPOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

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

export const ManualPOSModal: React.FC<ManualPOSModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated
}) => {
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
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'bKash' | 'Nagad' | 'Card / Physical POS Terminal' | 'NFC / Contactless'>('CASH');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');

  // Physical Card POS Terminal System
  const [cardTerminalName, setCardTerminalName] = useState<string>('Terminal #1 (Ingenico Desk 3500)');
  const [cardApprovalCode, setCardApprovalCode] = useState<string>('');
  const [cardPosStatus, setCardPosStatus] = useState<'APPROVED' | 'PENDING' | 'DECLINED'>('APPROVED');

  // Modal States
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [tempVariant, setTempVariant] = useState<MenuVariant | null>(null);
  const [tempAddOns, setTempAddOns] = useState<MenuAddOn[]>([]);
  const [tempNotes, setTempNotes] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 55 Tables list (T01 - T55)
  const allTables = useMemo(() => {
    return Array.from({ length: 55 }, (_, i) => `T${(i + 1).toString().padStart(2, '0')}`);
  }, []);

  // Fetch stalls and menu
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

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

    // If item has variants or add-ons, open customization drawer
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
      const cartId = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      return [
        ...prev,
        {
          cartId,
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

    const basePrice = tempVariant ? tempVariant.price : customizingItem.price;
    const addOnsTotal = tempAddOns.reduce((s, a) => s + a.price, 0);
    const unitPrice = basePrice + addOnsTotal;

    const cartId = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCart(prev => [
      ...prev,
      {
        cartId,
        menuItem: customizingItem,
        quantity: 1,
        selectedVariant: tempVariant || undefined,
        selectedAddOns: tempAddOns,
        notes: tempNotes.trim() || undefined,
        unitPrice,
        totalPrice: unitPrice
      }
    ]);

    setCustomizingItem(null);
  };

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartId !== cartId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty
          };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleVerifyManagerPin = () => {
    // Default system Manager PIN: "1234"
    if (managerPin === '1234') {
      setManagerApproved(true);
      setPinError(null);
    } else {
      setPinError('Invalid Manager PIN. Default PIN is 1234.');
    }
  };

  // Validation before opening confirmation
  const handleProceedToPayment = () => {
    setSubmitError(null);
    if (cart.length === 0) {
      setSubmitError('Cart is empty. Please add items before placing order.');
      return;
    }

    if (orderType === 'DINE_IN' && !tableId) {
      setSubmitError('Table number is required for Dine-in orders.');
      return;
    }

    if (requiresManagerApproval && !managerApproved) {
      setSubmitError('Discounts above 10% require Manager Authorization PIN.');
      return;
    }

    if (effectiveDiscountPercent > 0 && !discountReason.trim()) {
      setSubmitError('Please enter a reason for the applied discount.');
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
        setSubmitError('Physical POS Terminal payment must be processed and marked APPROVED on the terminal.');
        return;
      }
      if (!cardApprovalCode.trim()) {
        setSubmitError('Please enter the Terminal Approval Code / RRN from the paper slip.');
        return;
      }
    }

    setShowConfirmModal(true);
  };

  // Submit Final Order to Central Order Database
  const handleFinalSubmitOrder = async () => {
    if (submitting) return; // Prevent double clicking
    setSubmitting(true);
    setSubmitError(null);

    try {
      const rawItems = cart.map(c => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        variantId: c.selectedVariant?.id,
        variantName: c.selectedVariant?.name,
        selectedAddOns: c.selectedAddOns.map(a => a.id),
        notes: c.notes || ''
      }));

      const payload = {
        tableId: orderType === 'DINE_IN' ? tableId : null,
        type: orderType === 'TAKEAWAY' ? ('PARCEL' as const) : ('DINE_IN' as const),
        customerOrderType: orderType,
        rawItems,
        customerName: customerName.trim() || 'Counter Guest',
        customerPhone: customerPhone.trim(),
        serviceType,
        customerNotes: customerNotes.trim(),
        paymentMethod,
        discountType,
        discountPercent: effectiveDiscountPercent,
        discountAmount,
        discountReason: discountReason.trim() || (discountAmount > 0 ? 'Counter Discount' : ''),
        discountAppliedBy: currentUser.name,
        discountApprovedBy: requiresManagerApproval ? 'Food Court Manager' : (discountAmount > 0 ? currentUser.name : ''),
        cashReceived: paymentMethod === 'CASH' ? cashReceivedNumber : null,
        changeReturned: paymentMethod === 'CASH' ? changeToReturn : null,
        cardPosRef: paymentMethod === 'Card / Physical POS Terminal' ? cardApprovalCode.trim() : null,
        cardPosStatus: paymentMethod === 'Card / Physical POS Terminal' ? cardPosStatus : null,
        cardPosTerminal: paymentMethod === 'Card / Physical POS Terminal' ? cardTerminalName : null,
        cashierName: currentUser.name,
        cashierId: currentUser.id
      };

      const createdOrder = await api.createManualOrder(payload);

      // Clean up local POS state
      setCart([]);
      setDiscountType('NONE');
      setCustomDiscountPercent('');
      setDiscountReason('');
      setManagerPin('');
      setManagerApproved(false);
      setCashReceivedInput('');
      setCardApprovalCode('');
      setShowConfirmModal(false);

      // Trigger callback for Thermal Receipt printing
      onOrderCreated(createdOrder);
      onClose();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to place manual counter order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs font-sans animate-in fade-in">
      <div className="w-full max-w-7xl h-[94vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200">
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white uppercase">
                  Central Counter POS Ordering
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                  Live Terminal
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Direct Counter Orders • All 7 Stalls • Instant Multi-Kitchen KOT • Thermal Cash Memo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
              <User className="w-3.5 h-3.5 text-brand-400" />
              <span>Cashier: <strong className="text-white font-black">{currentUser.name}</strong></span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close POS"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content: Left (Menu Explorer) + Right (Cart & Checkout) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-zinc-100">
          
          {/* ========================================================= */}
          {/* LEFT 60%: Stalls, Categories, Search & Food Grid          */}
          {/* ========================================================= */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-zinc-200 bg-white">
            
            {/* Stall Selector Tabs */}
            <div className="p-3 bg-zinc-50 border-b border-zinc-200 overflow-x-auto shrink-0 flex items-center gap-2 no-scrollbar">
              <button
                onClick={() => {
                  setSelectedStallId('ALL');
                  setSelectedCategory('ALL');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedStallId === 'ALL'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>All 7 Stalls</span>
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

            {/* Search & Category Filter Toolbar */}
            <div className="p-3 border-b border-zinc-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              {/* Search input */}
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
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Categories horizontal scroll */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black shrink-0 cursor-pointer ${
                    selectedCategory === 'ALL'
                      ? 'bg-zinc-900 text-white'
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
                        ? 'bg-brand-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredMenuItems.map(item => {
                    const isOutOfStock = item.isAvailable === false;
                    const stallObj = stalls.find(s => s.id === item.stallId);

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
                        {/* Food Image */}
                        <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 mb-2">
                          <img
                            src={item.image || '/assets/vivacity-chili-icon.png'}
                            alt={item.name}
                            className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
                              isOutOfStock ? 'grayscale' : ''
                            }`}
                            onError={e => {
                              (e.target as HTMLImageElement).src = '/assets/vivacity-chili-icon.png';
                            }}
                          />
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
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
                                className="w-6 h-6 rounded-lg bg-zinc-900 group-hover:bg-brand-500 text-white flex items-center justify-center transition-colors shadow-2xs"
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

          {/* ========================================================= */}
          {/* RIGHT 40%: Order Details, Unified Cart, Discounts, Pay   */}
          {/* ========================================================= */}
          <div className="w-full lg:w-[480px] xl:w-[520px] bg-white flex flex-col shrink-0 overflow-hidden shadow-lg border-l border-zinc-200">
            
            {/* Customer & Dining Mode Selector */}
            <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 space-y-2.5 shrink-0">
              
              {/* Dine-in vs Takeaway Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('DINE_IN')}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    orderType === 'DINE_IN'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>Dine-in (Hall)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('TAKEAWAY')}
                  className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    orderType === 'TAKEAWAY'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>Takeaway (Parcel)</span>
                </button>
              </div>

              {/* Table Selector (Dine-in Only) + Service Type */}
              <div className="grid grid-cols-2 gap-2">
                {orderType === 'DINE_IN' ? (
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">
                      Table Number *
                    </label>
                    <select
                      value={tableId}
                      onChange={e => setTableId(e.target.value)}
                      className="w-full py-1.5 px-2 bg-white border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    >
                      {allTables.map(t => (
                        <option key={t} value={t}>
                          Table {t}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">
                      Order Destination
                    </label>
                    <div className="py-1.5 px-2 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-600 border border-zinc-200 truncate">
                      Parcel Counter Pickup
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">
                    Service Type
                  </label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value as any)}
                    className="w-full py-1.5 px-2 bg-white border border-zinc-200 rounded-xl text-xs font-black text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="SELF_SERVICE">Self-Service (৳0 Fee)</option>
                    <option value="TABLE_SERVICE">Table Service (+5% Fee)</option>
                  </select>
                </div>
              </div>

              {/* Optional Guest Name & Phone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    placeholder="Guest Name (Optional)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Phone (e.g. 017...)"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-zinc-50/50">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                  <ShoppingCart className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs font-bold">Cart is empty.</p>
                  <p className="text-[11px] text-zinc-400">Click any food card on the left to add items.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.cartId}
                    className="p-2.5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 shrink-0">
                          {item.menuItem.stallId}
                        </span>
                        <h4 className="text-xs font-black text-zinc-900 truncate">
                          {item.menuItem.name}
                        </h4>
                      </div>

                      {item.selectedVariant && (
                        <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                          Size: {item.selectedVariant.name}
                        </p>
                      )}

                      {item.selectedAddOns.length > 0 && (
                        <p className="text-[10px] text-brand-600 font-semibold truncate">
                          + {item.selectedAddOns.map(a => a.name).join(', ')}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-[9px] italic text-zinc-400 truncate">
                          Note: {item.notes}
                        </p>
                      )}

                      <div className="text-[11px] font-black text-zinc-800 mt-1">
                        ৳{item.unitPrice} × {item.quantity} = <span className="text-brand-600">৳{item.totalPrice}</span>
                      </div>
                    </div>

                    {/* Quantity +/- and Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQuantity(item.cartId, -1)}
                        className="w-6 h-6 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-zinc-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQuantity(item.cartId, 1)}
                        className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-black text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveItem(item.cartId)}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Discount & Payment Controls Footer */}
            <div className="p-3.5 bg-white border-t border-zinc-200 space-y-3 shrink-0">
              
              {/* Discount Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-brand-600" />
                    <span>Apply Discount</span>
                  </span>
                  {discountAmount > 0 && (
                    <span className="text-[11px] font-black text-emerald-600">
                      -৳{discountAmount} ({effectiveDiscountPercent}%)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {(['NONE', '5', '10', '15', 'CUSTOM'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setDiscountType(d);
                        if (d !== 'CUSTOM' && parseInt(d, 10) <= 10) {
                          setManagerApproved(false);
                          setPinError(null);
                        }
                      }}
                      className={`py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        discountType === d
                          ? 'bg-zinc-900 text-white'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {d === 'NONE' ? '0%' : d === 'CUSTOM' ? 'Custom' : `${d}%`}
                    </button>
                  ))}
                </div>

                {/* Custom discount % input & reason */}
                {discountType === 'CUSTOM' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Percent %"
                      value={customDiscountPercent}
                      onChange={e => setCustomDiscountPercent(e.target.value)}
                      className="w-24 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-black text-zinc-900"
                    />
                    <input
                      type="text"
                      placeholder="Reason for custom discount *"
                      value={discountReason}
                      onChange={e => setDiscountReason(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-900"
                    />
                  </div>
                )}

                {/* Discount reason for preset discounts if applied */}
                {discountType !== 'NONE' && discountType !== 'CUSTOM' && (
                  <div className="mt-1.5">
                    <input
                      type="text"
                      placeholder="Reason for discount (e.g. VIP Diner, Opening Offer) *"
                      value={discountReason}
                      onChange={e => setDiscountReason(e.target.value)}
                      className="w-full px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold text-zinc-800"
                    />
                  </div>
                )}

                {/* Manager PIN Authorization Gate for Cashier (if discount > 10%) */}
                {requiresManagerApproval && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Manager Authorization Required (&gt;10% Discount)</span>
                    </div>
                    {managerApproved ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Manager Approval Verified (Authorized by Food Court Manager)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="Manager PIN (1234)"
                          value={managerPin}
                          onChange={e => setManagerPin(e.target.value)}
                          className="w-32 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyManagerPin}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Authorize
                        </button>
                        {pinError && <span className="text-[10px] text-red-600 font-bold">{pinError}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="p-2.5 bg-zinc-50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between text-zinc-600 font-bold">
                  <span>Subtotal:</span>
                  <span>৳{subtotal}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-zinc-600 font-bold">
                    <span>Service Charge (5%):</span>
                    <span>৳{serviceCharge}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount ({effectiveDiscountPercent}%):</span>
                    <span>-৳{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-zinc-200 text-base font-black text-zinc-950">
                  <span>Net Payable Total:</span>
                  <span className="text-brand-600 text-lg">৳{netPayable}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Card / Physical POS Terminal')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === 'Card / Physical POS Terminal'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Physical Card POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bKash')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === 'bKash'
                        ? 'bg-[#E2136E] text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>bKash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Nagad')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === 'Nagad'
                        ? 'bg-[#F7941D] text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span>Nagad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NFC / Contactless')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      paymentMethod === 'NFC / Contactless'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                    }`}
                  >
                    <span>NFC Tap</span>
                  </button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* CASH PAYMENT CALCULATOR                                  */}
              {/* ======================================================== */}
              {paymentMethod === 'CASH' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Cash Payment Calculator
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      Formula: Change = Received - Net
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-800">৳</span>
                      <input
                        type="number"
                        placeholder="Cash Received"
                        value={cashReceivedInput}
                        onChange={e => setCashReceivedInput(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-sm font-black text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Quick Cash Buttons */}
                    <button
                      type="button"
                      onClick={() => setCashReceivedInput(String(netPayable))}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-black cursor-pointer hover:bg-emerald-800"
                      title="Exact payable amount"
                    >
                      Exact (৳{netPayable})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceivedInput('500')}
                      className="px-2 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-black cursor-pointer hover:bg-emerald-100"
                    >
                      ৳500
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceivedInput('1000')}
                      className="px-2 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-black cursor-pointer hover:bg-emerald-100"
                    >
                      ৳1000
                    </button>
                  </div>

                  {/* Calculations Display */}
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-200/60">
                    {cashReceivedNumber < netPayable ? (
                      <div className="text-xs font-black text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Remaining Due: ৳{remainingCashDue}</span>
                      </div>
                    ) : (
                      <div className="text-xs font-black text-emerald-900 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Change to Return: <strong className="text-sm font-black text-emerald-700">৳{changeToReturn}</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* PHYSICAL CARD POS TERMINAL WORKFLOW                      */}
              {/* ======================================================== */}
              {paymentMethod === 'Card / Physical POS Terminal' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      <span>Physical POS Terminal Integration</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 text-[9px] font-black">
                      External Hardware
                    </span>
                  </div>

                  <p className="text-[10.5px] text-blue-800 leading-snug">
                    Swipe, insert, or tap diner&apos;s card on the physical countertop POS terminal device. Confirm approved slip before entering reference.
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-blue-900 uppercase mb-0.5">Terminal Device</label>
                      <input
                        type="text"
                        value={cardTerminalName}
                        onChange={e => setCardTerminalName(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-blue-900 uppercase mb-0.5">Terminal Result *</label>
                      <select
                        value={cardPosStatus}
                        onChange={e => setCardPosStatus(e.target.value as any)}
                        className="w-full px-2 py-1 bg-white border border-blue-300 rounded-lg text-xs font-black text-zinc-900"
                      >
                        <option value="APPROVED">Approved (Slip Printed)</option>
                        <option value="DECLINED">Declined</option>
                        <option value="PENDING">Processing / Waiting</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-blue-900 uppercase mb-0.5">
                      Approval Code / RRN / Slip Reference *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. APP-84920 or RRN-004928"
                      value={cardApprovalCode}
                      onChange={e => setCardApprovalCode(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono font-black text-blue-950 placeholder-blue-300"
                    />
                  </div>
                </div>
              )}

              {/* Submit Error */}
              {submitError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons: Confirm & Pay */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl text-xs font-black transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={cart.length === 0 || submitting || (paymentMethod === 'CASH' && cashReceivedNumber < netPayable)}
                  className={`flex-1 py-3 px-4 rounded-2xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    cart.length === 0 || (paymentMethod === 'CASH' && cashReceivedNumber < netPayable)
                      ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
                      : 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/25'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>Complete &amp; Print Order (৳{netPayable})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ITEM CUSTOMIZATION MODAL (Variants & Add-ons)            */}
      {/* ======================================================== */}
      {customizingItem && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div>
                <h3 className="text-base font-black text-zinc-900">{customizingItem.name}</h3>
                <p className="text-xs text-zinc-500">{customizingItem.stallId} • Select Options</p>
              </div>
              <button
                onClick={() => setCustomizingItem(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Variants */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div>
                <label className="block text-xs font-black text-zinc-700 uppercase mb-1.5">Portion / Size</label>
                <div className="space-y-1.5">
                  {customizingItem.variants.map(v => (
                    <label
                      key={v.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${
                        tempVariant?.id === v.id
                          ? 'border-brand-500 bg-brand-50/50 text-zinc-900 font-black'
                          : 'border-zinc-200 text-zinc-700 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="pos_variant"
                          checked={tempVariant?.id === v.id}
                          onChange={() => setTempVariant(v)}
                          className="accent-brand-500"
                        />
                        <span className="text-xs">{v.name}</span>
                      </div>
                      <span className="text-xs text-brand-600 font-black">৳{v.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {((customizingItem.addOns && customizingItem.addOns.length > 0) || (customizingItem.burgerPatties && customizingItem.burgerPatties.length > 0)) && (
              <div>
                <label className="block text-xs font-black text-zinc-700 uppercase mb-1.5">Add-ons &amp; Extras</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {[...(customizingItem.addOns || []), ...(customizingItem.burgerPatties || [])].map(a => {
                    const isSelected = tempAddOns.some(x => x.id === a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 text-zinc-900 font-bold'
                            : 'border-zinc-200 text-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setTempAddOns(prev => prev.filter(x => x.id !== a.id));
                              } else {
                                setTempAddOns(prev => [...prev, a]);
                              }
                            }}
                            className="accent-brand-500 rounded"
                          />
                          <span className="text-xs">{a.name}</span>
                        </div>
                        <span className="text-xs text-brand-600 font-black">+৳{a.price}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Preparation Notes */}
            <div>
              <label className="block text-xs font-black text-zinc-700 uppercase mb-1">Kitchen Preparation Note</label>
              <input
                type="text"
                placeholder="e.g. Less spicy, no mayo, extra sauce on side"
                value={tempNotes}
                onChange={e => setTempNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="px-3.5 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
              >
                Add Custom Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FINAL ORDER CONFIRMATION MODAL                           */}
      {/* ======================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-xs">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">Confirm Order &amp; Release KOT</h3>
                <p className="text-xs text-zinc-500">Order will be sent to kitchens immediately</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-zinc-700">
                <span>Destination:</span>
                <span className="font-black text-zinc-900">
                  {orderType === 'DINE_IN' ? `Dine-in (Table ${tableId})` : 'Takeaway (Parcel Counter)'}
                </span>
              </div>
              <div className="flex justify-between font-bold text-zinc-700">
                <span>Service:</span>
                <span>{serviceType === 'TABLE_SERVICE' ? 'Table Service (+5%)' : 'Self-Service'}</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-700">
                <span>Total Items:</span>
                <span>{cart.reduce((s, i) => s + i.quantity, 0)} food portions</span>
              </div>
              <div className="flex justify-between font-bold text-zinc-700">
                <span>Payment Method:</span>
                <span className="text-blue-700 font-black">{paymentMethod}</span>
              </div>
              {paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Cash Received:</span>
                    <span>৳{cashReceivedNumber}</span>
                  </div>
                  <div className="flex justify-between font-black text-emerald-700">
                    <span>Change Returned:</span>
                    <span>৳{changeToReturn}</span>
                  </div>
                </>
              )}
              {paymentMethod === 'Card / Physical POS Terminal' && (
                <div className="flex justify-between font-bold text-blue-900">
                  <span>Terminal Ref:</span>
                  <span className="font-mono">{cardApprovalCode}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-zinc-950 pt-1.5 border-t border-zinc-200">
                <span>Net Payable:</span>
                <span className="text-brand-600 text-base">৳{netPayable}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
                {submitError}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleFinalSubmitOrder}
                disabled={submitting}
                className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span>Processing &amp; Printing...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm &amp; Print</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
