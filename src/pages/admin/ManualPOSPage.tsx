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
  ArrowRight,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Lock,
  RotateCcw,
  Sparkles,
  Delete,
  Check,
  Receipt
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

  // TWO-STEP WORKFLOW STATE
  // STEP 1: 'SELECT_FOOD' (Browse food, customize, add to cart, configure table)
  // STEP 2: 'PAYMENT' (Order summary, optional discount, cash calculator, keypad, charge)
  const [currentStep, setCurrentStep] = useState<'SELECT_FOOD' | 'PAYMENT'>('SELECT_FOOD');

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

  // Discount System (100% Optional)
  const [discountType, setDiscountType] = useState<'NONE' | '5' | '10' | '15' | 'CUSTOM'>('NONE');
  const [customDiscountMode, setCustomDiscountMode] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<string>('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Payment System
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'bKash' | 'Nagad' | 'Card / Physical POS Terminal' | 'NFC / Contactless'>('CASH');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [mobileTrxRef, setMobileTrxRef] = useState<string>('');

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

  // Discount calculations (Optional)
  const effectiveDiscountPercent = useMemo(() => {
    if (discountType === '5') return 5;
    if (discountType === '10') return 10;
    if (discountType === '15') return 15;
    if (discountType === 'CUSTOM') {
      if (customDiscountMode === 'PERCENT') {
        const val = parseFloat(customDiscountPercent);
        return !isNaN(val) && val > 0 ? Math.min(100, val) : 0;
      } else {
        const amt = parseFloat(customDiscountAmount);
        if (!isNaN(amt) && amt > 0 && subtotal > 0) {
          return Math.min(100, Math.round((amt / subtotal) * 100));
        }
      }
    }
    return 0;
  }, [discountType, customDiscountMode, customDiscountPercent, customDiscountAmount, subtotal]);

  const discountAmount = useMemo(() => {
    if (subtotal <= 0 || discountType === 'NONE') return 0;
    if (discountType === 'CUSTOM' && customDiscountMode === 'FIXED') {
      const amt = parseFloat(customDiscountAmount);
      return !isNaN(amt) && amt > 0 ? Math.min(subtotal, Math.round(amt)) : 0;
    }
    if (effectiveDiscountPercent <= 0) return 0;
    return Math.round((subtotal * effectiveDiscountPercent) / 100);
  }, [subtotal, discountType, customDiscountMode, customDiscountAmount, effectiveDiscountPercent]);

  // Discount requires Manager Approval if:
  // User is Cashier and discount > 10%
  const requiresManagerApproval = useMemo(() => {
    const isHighRank = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'].includes(currentUser.role);
    if (isHighRank) return false;
    return effectiveDiscountPercent > 10;
  }, [currentUser.role, effectiveDiscountPercent]);

  const netPayable = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + serviceCharge);
  }, [subtotal, discountAmount, serviceCharge]);

  // Cash Calculation
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

    // Direct add without customization
    const cartId = `${item.id}-std-${Date.now()}`;
    const existingIndex = cart.findIndex(c => c.menuItem.id === item.id && !c.selectedVariant && c.selectedAddOns.length === 0);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setCart(updated);
    } else {
      setCart(prev => [
        ...prev,
        {
          cartId,
          menuItem: item,
          quantity: 1,
          selectedAddOns: [],
          unitPrice: item.price,
          totalPrice: item.price
        }
      ]);
    }
  };

  // Confirm Customization & Add to Cart
  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    let unitPrice = customizingItem.price;
    if (tempVariant) {
      unitPrice = tempVariant.price;
    }
    const addOnsTotal = tempAddOns.reduce((sum, a) => sum + a.price, 0);
    unitPrice += addOnsTotal;

    const cartId = `${customizingItem.id}-${tempVariant?.id || 'base'}-${tempAddOns.map(a => a.id).sort().join('-')}-${Date.now()}`;

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
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(item => item.cartId !== cartId));
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear the entire cart?')) {
      setCart([]);
      setDiscountType('NONE');
      setCustomDiscountPercent('');
      setCustomDiscountAmount('');
      setCashReceivedInput('');
      setCardApprovalCode('');
      setCurrentStep('SELECT_FOOD');
    }
  };

  // Verify Manager PIN for >10% discount
  const handleVerifyManagerPin = () => {
    setPinError(null);
    if (managerPin === '1234') {
      setManagerApproved(true);
      setPinError(null);
    } else {
      setPinError('Invalid Manager PIN. Default is 1234.');
    }
  };

  // Keypad Click Handler for Cash Calculator
  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setCashReceivedInput('');
    } else if (val === 'BACKSPACE') {
      setCashReceivedInput(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!cashReceivedInput.includes('.')) {
        setCashReceivedInput(prev => (prev ? prev + '.' : '0.'));
      }
    } else if (val === '00') {
      if (cashReceivedInput && cashReceivedInput !== '0') {
        setCashReceivedInput(prev => prev + '00');
      }
    } else {
      if (cashReceivedInput === '0') {
        setCashReceivedInput(val);
      } else {
        setCashReceivedInput(prev => prev + val);
      }
    }
  };

  // Submit Final Order & Payment to Server
  const handleSubmitOrder = async () => {
    if (submitting) return;

    if (cart.length === 0) {
      setSubmitError('Cart is empty. Please add items before placing order.');
      return;
    }

    if (orderType === 'DINE_IN' && !tableId) {
      setSubmitError('Please select a dining table (T01–T55).');
      return;
    }

    // Verify Manager Authorization for Cashier >10%
    if (requiresManagerApproval && !managerApproved) {
      setSubmitError('Discounts exceeding 10% require Manager PIN approval.');
      return;
    }

    // Verify Cash Received
    if (paymentMethod === 'CASH') {
      if (cashReceivedNumber < netPayable) {
        setSubmitError(`Insufficient cash received. Remaining due is ৳${remainingCashDue}.`);
        return;
      }
    }

    // Verify Physical Card POS Approval Code
    if (paymentMethod === 'Card / Physical POS Terminal') {
      if (!cardApprovalCode.trim()) {
        setSubmitError('Please enter the Approval Code from the Physical POS slip.');
        return;
      }
      if (cardPosStatus !== 'APPROVED') {
        setSubmitError('Card payment must be marked as APPROVED to complete.');
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
        cardPosRef: paymentMethod === 'Card / Physical POS Terminal' ? cardApprovalCode.trim() : (mobileTrxRef.trim() || null),
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
      setCustomDiscountAmount('');
      setCustomDiscountMode('PERCENT');
      setDiscountReason('');
      setManagerPin('');
      setManagerApproved(false);
      setCashReceivedInput('');
      setCardApprovalCode('');
      setMobileTrxRef('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerNotes('');
      setCurrentStep('SELECT_FOOD');
    } catch (err: any) {
      console.error('Manual order submission failed:', err);
      setSubmitError(err?.message || 'Failed to submit order. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen h-[100dvh] bg-zinc-100 flex flex-col font-sans select-none overflow-hidden">
      {/* =========================================================================
          TOP FIXED HEADER: Cashier Identity, Back Button, Step Indicator, Clock
         ========================================================================= */}
      <header className="h-16 bg-zinc-950 text-white px-4 md:px-6 flex items-center justify-between shadow-md shrink-0 border-b border-zinc-800 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 border border-white/10"
            title="Return to Central Counter"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Back to Central Counter</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white text-zinc-950 flex items-center justify-center font-black shadow-xs">
              <ShoppingCart className="w-4 h-4 text-zinc-950" />
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

        {/* Center: Step Indicator Pills (Clean Black & White) */}
        <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setCurrentStep('SELECT_FOOD')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              currentStep === 'SELECT_FOOD'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Select Food</span>
          </button>

          <span className="text-zinc-600 text-xs">→</span>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => cart.length > 0 && setCurrentStep('PAYMENT')}
            className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              currentStep === 'PAYMENT'
                ? 'bg-white text-zinc-950 shadow-xs'
                : cart.length > 0
                ? 'text-zinc-400 hover:text-white cursor-pointer'
                : 'text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Payment & Calculator</span>
          </button>
        </div>

        {/* Right Info: Cashier Badge, Clock, Reset */}
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

          <div className="h-6 w-px bg-zinc-800 hidden sm:block" />

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{currentTime || '12:00:00 PM'}</span>
          </div>

          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-red-500/30"
              title="Clear current cart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* =========================================================================
          STEP 1: SELECT FOOD WORKFLOW
          - Fixed Left: Stalls tabs + Categories + Search
          - Scrollable Left: Food Cards Grid (ONLY THIS SCROLLS)
          - Fixed Right: Order Configuration + Cart items + Prominent "Confirm Order" Button
         ========================================================================= */}
      {currentStep === 'SELECT_FOOD' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* LEFT COLUMN: Food Menu Explorer */}
          <div className="flex-1 flex flex-col bg-zinc-50 border-r border-zinc-200 overflow-hidden min-h-0">
            {/* 1. Stalls Horizontal Selector Tabs (FIXED) */}
            <div className="bg-white border-b border-zinc-200 p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-2xs">
              <button
                onClick={() => {
                  setSelectedStallId('ALL');
                  setSelectedCategory('ALL');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-2 ${
                  selectedStallId === 'ALL'
                    ? 'bg-zinc-950 text-white shadow-xs'
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
                      ? 'bg-zinc-950 text-white shadow-xs'
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

            {/* 2. Search & Category Filters Bar (FIXED) */}
            <div className="p-2.5 sm:p-3 bg-white border-b border-zinc-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search food by name, ingredient, category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
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
                      ? 'bg-zinc-950 text-white shadow-2xs'
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
                        ? 'bg-zinc-950 text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Food Items Grid (ONLY THIS AREA SCROLLS VERTICALLY) */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4">
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
                            : 'bg-white border-zinc-200 hover:border-zinc-950 hover:shadow-md'
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
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white uppercase truncate max-w-[90%]">
                            {stallObj?.name || item.stallId}
                          </span>
                        </div>

                        {/* Title & Price */}
                        <div>
                          <h3 className="text-xs font-black text-zinc-900 leading-snug line-clamp-2 mb-1">
                            {item.name}
                          </h3>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-zinc-900">
                              ৳{item.price}
                            </span>
                            {!isOutOfStock && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleAddToCart(item);
                                }}
                                className="w-6 h-6 rounded-lg bg-zinc-950 group-hover:bg-black text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer active:scale-95"
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

          {/* RIGHT COLUMN: Cart Panel (Fixed layout with internal items scroll) */}
          <div className="w-full lg:w-[420px] xl:w-[460px] bg-white flex flex-col shrink-0 border-t lg:border-t-0 border-l border-zinc-200 shadow-lg overflow-hidden min-h-0">
            {/* Top Fixed Order Configuration */}
            <div className="p-3.5 border-b border-zinc-200 bg-zinc-50/70 space-y-2.5 shrink-0">
              {/* Dine-In vs Takeaway Toggle (Clean Black and White) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('DINE_IN')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    orderType === 'DINE_IN'
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <span>🍽️ Dine-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('TAKEAWAY')}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    orderType === 'TAKEAWAY'
                      ? 'bg-zinc-950 text-white shadow-xs'
                      : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
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
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
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
                      className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-zinc-900"
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
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
                <input
                  type="text"
                  placeholder="Phone (Optional)"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* Cart Items List (SCROLLABLE INSIDE CART) */}
            <div className="p-3 flex-1 overflow-y-auto min-h-0 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400 space-y-2">
                  <ShoppingCart className="w-8 h-8 opacity-40 text-zinc-400" />
                  <p className="text-xs font-bold text-zinc-600">Cart is empty.</p>
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

            {/* Bottom Fixed Action Bar: Summary & CONFIRM ORDER Button */}
            <div className="p-3.5 border-t border-zinc-200 bg-white space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-700 px-1">
                <span>
                  Items: <strong className="text-zinc-950 font-black">{cart.reduce((sum, i) => sum + i.quantity, 0)}</strong>
                </span>
                <span>
                  Subtotal: <strong className="text-base text-zinc-950 font-black">৳{subtotal}</strong>
                </span>
              </div>

              {/* Prominent CONFIRM ORDER Button (Clean Black & White Design) */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setCurrentStep('PAYMENT')}
                className={`w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                  cart.length === 0
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                    : 'bg-zinc-950 hover:bg-black text-white active:scale-[0.99] border-2 border-zinc-950'
                }`}
              >
                <span>Confirm Order ({cart.reduce((sum, i) => sum + i.quantity, 0)} Items)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STEP 2: PAYMENT & CASH CALCULATOR WORKFLOW
          - Dedicated 2-Column POS Checkout view within the same page (no popup)
          - Left: Complete Order Summary, Items list, Optional Discount
          - Right: Payment Methods, Dedicated Cash Calculator with Touch Numeric Keypad, Confirm Payment Button
         ========================================================================= */}
      {currentStep === 'PAYMENT' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-zinc-100">
          {/* LEFT COLUMN: Order Review & Optional Discount (38-42% width) */}
          <div className="w-full lg:w-[440px] xl:w-[480px] bg-zinc-50 border-r border-zinc-200 flex flex-col shrink-0 overflow-y-auto min-h-0 p-4 space-y-4 shadow-sm">
            {/* Back to Food Selection Button */}
            <button
              type="button"
              onClick={() => setCurrentStep('SELECT_FOOD')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-900 hover:bg-zinc-100 text-xs font-black transition-all cursor-pointer shadow-2xs w-fit"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-900" />
              <span>← Back to Edit Order</span>
            </button>

            {/* Order Details Banner */}
            <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Order Destination
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-900 text-white text-[10px] font-black uppercase">
                  {orderType === 'DINE_IN' ? `Table ${tableId}` : 'Takeaway / Parcel'}
                </span>
              </div>
              <p className="text-xs font-bold text-zinc-800">
                {orderType === 'DINE_IN'
                  ? `Dine-in at Table ${tableId} (${serviceType === 'TABLE_SERVICE' ? 'Table Service +5%' : 'Self-Service ৳0'})`
                  : 'Takeaway / Parcel Order at Central Counter'}
              </p>
              {customerName && (
                <p className="text-[11px] text-zinc-500">
                  Guest: <strong className="text-zinc-800">{customerName}</strong> {customerPhone ? `(${customerPhone})` : ''}
                </p>
              )}
            </div>

            {/* Itemized Order List */}
            <div className="p-3 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">
                Selected Food Items ({cart.reduce((s, i) => s + i.quantity, 0)})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.cartId} className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 last:border-0">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-bold text-zinc-900">{item.quantity}x {item.menuItem.name}</span>
                      {item.selectedVariant && (
                        <span className="text-[10px] text-zinc-500 block">({item.selectedVariant.name})</span>
                      )}
                      {item.selectedAddOns.length > 0 && (
                        <span className="text-[10px] text-zinc-500 block">+ {item.selectedAddOns.map(a => a.name).join(', ')}</span>
                      )}
                    </div>
                    <span className="font-black text-zinc-900 shrink-0">৳{item.totalPrice}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OPTIONAL DISCOUNT SECTION (Do Not Force It) */}
            <div className="p-3.5 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  Discount Offer (Optional)
                </span>
                {effectiveDiscountPercent > 0 ? (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300">
                    {effectiveDiscountPercent}% OFF (-৳{discountAmount})
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-zinc-400">
                    No Discount (৳0)
                  </span>
                )}
              </div>

              {/* Discount Preset Buttons */}
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
                    className={`py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
                      discountType === dt
                        ? 'bg-zinc-950 text-white shadow-xs'
                        : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {dt === 'NONE' ? '0%' : dt === 'CUSTOM' ? 'Custom' : `${dt}%`}
                  </button>
                ))}
              </div>

              {/* Custom Discount Input (% or Fixed Amount) */}
              {discountType === 'CUSTOM' && (
                <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomDiscountMode('PERCENT')}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        customDiscountMode === 'PERCENT'
                          ? 'bg-zinc-950 text-white'
                          : 'bg-white border border-zinc-200 text-zinc-600'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomDiscountMode('FIXED')}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        customDiscountMode === 'FIXED'
                          ? 'bg-zinc-950 text-white'
                          : 'bg-white border border-zinc-200 text-zinc-600'
                      }`}
                    >
                      Fixed Amount (৳)
                    </button>
                  </div>

                  {customDiscountMode === 'PERCENT' ? (
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Enter % discount (e.g. 20)"
                      value={customDiscountPercent}
                      onChange={e => setCustomDiscountPercent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      placeholder="Enter discount amount in ৳ (e.g. 50)"
                      value={customDiscountAmount}
                      onChange={e => setCustomDiscountAmount(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-bold text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                    />
                  )}
                </div>
              )}

              {/* Manager Approval Box if discount > 10% */}
              {requiresManagerApproval && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Manager Approval Required (&gt;10%)</span>
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

            {/* Financial Summary & Net Payable Card */}
            <div className="p-4 rounded-2xl bg-zinc-950 text-white shadow-md space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Subtotal:</span>
                <span className="font-bold text-white">৳{subtotal}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Table Waiter Service (5%):</span>
                  <span className="font-bold text-white">+৳{serviceCharge}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-bold">
                  <span>Discount ({effectiveDiscountPercent}%):</span>
                  <span>-৳{discountAmount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-300">Net Payable:</span>
                <span className="text-2xl font-black text-amber-400">
                  ৳{netPayable}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Payment Method Selection & Manual Cash Calculator (58-62% width) */}
          <div className="flex-1 bg-white flex flex-col overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
            {/* Payment Method Selector (Clean Black & White Design) */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-2">
                1. Select Payment Method
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'CASH', label: 'Cash', icon: DollarSign },
                    { id: 'Card / Physical POS Terminal', label: 'Card POS', icon: CreditCard },
                    { id: 'bKash', label: 'bKash', icon: Smartphone },
                    { id: 'Nagad', label: 'Nagad', icon: Smartphone },
                    { id: 'NFC / Contactless', label: 'NFC Tap', icon: CreditCard }
                  ] as const
                ).map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 border-2 ${
                        isSelected
                          ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                          : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-zinc-600'}`} />
                      <span className="truncate">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CASH PAYMENT CALCULATOR & TOUCH KEYPAD (Only shown when CASH is selected) */}
            {paymentMethod === 'CASH' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-zinc-50 border-2 border-zinc-200 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Cash Payment Calculator</span>
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Net: <strong className="text-zinc-900 font-black">৳{netPayable}</strong>
                  </span>
                </div>

                {/* Quick Cash Presets Bar */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {[50, 100, 500, 1000].map(addVal => (
                    <button
                      key={addVal}
                      type="button"
                      onClick={() => setCashReceivedInput(String((cashReceivedNumber || 0) + addVal))}
                      className="px-3 py-1.5 bg-white border border-zinc-300 rounded-xl text-xs font-black text-zinc-900 hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      +৳{addVal}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput(String(netPayable))}
                    className="px-3 py-1.5 bg-zinc-950 text-white rounded-xl text-xs font-black hover:bg-black transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    Exact (৳{netPayable})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashReceivedInput('')}
                    className="px-3 py-1.5 bg-white border border-zinc-300 text-zinc-600 rounded-xl text-xs font-bold hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                {/* Cash Received Input Field & Keypad Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Input Box & Real-Time Change / Due Calculation */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-600 mb-1.5">
                        Cash Received from Guest (৳)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        value={cashReceivedInput}
                        onChange={e => setCashReceivedInput(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-zinc-300 focus:border-zinc-950 rounded-2xl text-2xl font-black text-zinc-950 focus:outline-hidden"
                      />
                    </div>

                    {/* Change to Return / Remaining Due Display (Never simultaneously) */}
                    {cashReceivedInput ? (
                      cashReceivedNumber >= netPayable ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 flex items-center justify-between shadow-2xs">
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block">
                              Change to Return
                            </span>
                            <span className="text-[10px] text-emerald-600">
                              Received ৳{cashReceivedNumber} − Net ৳{netPayable}
                            </span>
                          </div>
                          <span className="text-2xl font-black text-emerald-700">
                            ৳{changeToReturn}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-400 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <div>
                              <span className="text-xs font-black uppercase tracking-wider text-red-800 block">
                                Remaining Due
                              </span>
                              <span className="text-[10px] text-red-600">
                                Net ৳{netPayable} − Received ৳{cashReceivedNumber}
                              </span>
                            </div>
                          </div>
                          <span className="text-xl font-black text-red-600">
                            ৳{remainingCashDue}
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="p-3 rounded-2xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-500 text-center">
                        Tap numeric keys or quick presets to record cash received.
                      </div>
                    )}
                  </div>

                  {/* Right: Touchscreen POS Numeric Keypad (Clean Black & White) */}
                  <div className="grid grid-cols-3 gap-2">
                    {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '00'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleKeypadPress(num)}
                        className="py-3 bg-white hover:bg-zinc-100 active:bg-zinc-200 border-2 border-zinc-200 text-zinc-900 rounded-xl font-black text-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('BACKSPACE')}
                      className="py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl font-black text-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Backspace"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKeypadPress('CLEAR')}
                      className="py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-black text-sm transition-all cursor-pointer shadow-2xs col-span-2"
                    >
                      CLEAR (C)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PHYSICAL CARD POS TERMINAL WORKFLOW */}
            {paymentMethod === 'Card / Physical POS Terminal' && (
              <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/70 border-2 border-blue-200 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-blue-900">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Physical Card POS Terminal Integration</span>
                </div>

                <p className="text-[11px] text-blue-800 leading-snug">
                  Swipe, insert, or tap guest card on the physical device. Enter the Approval Code from the printed merchant slip.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">
                      Terminal Machine
                    </label>
                    <select
                      value={cardTerminalName}
                      onChange={e => setCardTerminalName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden"
                    >
                      <option value="Terminal #1 (Ingenico Desk 3500)">Terminal #1 (Ingenico)</option>
                      <option value="Terminal #2 (Pax A920 Pro)">Terminal #2 (Pax A920)</option>
                      <option value="Terminal #3 (Verifone V200c)">Terminal #3 (Verifone)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-900 mb-1">
                      Terminal Status *
                    </label>
                    <select
                      value={cardPosStatus}
                      onChange={e => setCardPosStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-zinc-800 focus:outline-hidden"
                    >
                      <option value="APPROVED">APPROVED (Transaction Success)</option>
                      <option value="PENDING">PENDING</option>
                      <option value="DECLINED">DECLINED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-blue-900 mb-1">
                    Approval Code / RRN / Slip Ref *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. APP-849201 or RRN-99214"
                    value={cardApprovalCode}
                    onChange={e => setCardApprovalCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold text-blue-950 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-blue-700 mt-0.5">
                    Printed at the top of the physical card slip.
                  </p>
                </div>
              </div>
            )}

            {/* MOBILE WALLETS (bKash / Nagad / NFC Tap) */}
            {(paymentMethod === 'bKash' || paymentMethod === 'Nagad' || paymentMethod === 'NFC / Contactless') && (
              <div className="p-4 sm:p-5 rounded-3xl bg-zinc-50 border-2 border-zinc-200 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-black text-zinc-900">
                  <Smartphone className="w-4 h-4 text-brand-600" />
                  <span>{paymentMethod} Transaction Verification</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 mb-1">
                    TrxID / Reference Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9B384A91KD"
                    value={mobileTrxRef}
                    onChange={e => setMobileTrxRef(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                  />
                </div>
              </div>
            )}

            {/* Error Message Banner */}
            {submitError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Final Action Buttons (Clean Black & White Design) */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setCurrentStep('SELECT_FOOD')}
                className="py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-900 border-2 border-zinc-900 shadow-xs cursor-pointer active:scale-[0.99]"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Edit Order</span>
              </button>

              <button
                type="button"
                disabled={submitting || (paymentMethod === 'CASH' && cashReceivedNumber < netPayable)}
                onClick={handleSubmitOrder}
                className={`py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                  submitting || (paymentMethod === 'CASH' && cashReceivedNumber < netPayable)
                    ? 'bg-zinc-200 text-zinc-400 border-2 border-zinc-200 cursor-not-allowed shadow-none'
                    : 'bg-zinc-950 hover:bg-black text-white border-2 border-zinc-950 active:scale-[0.99]'
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
                    <span>Confirm Payment & Print Memo (৳{netPayable})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ITEM CUSTOMIZATION MODAL (Variants, Add-Ons, Notes)
         ========================================================================= */}
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

            {/* Variants Selector */}
            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 block">Select Portion / Size:</span>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.variants.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setTempVariant(v)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        tempVariant?.id === v.id
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="truncate">{v.name}</div>
                      <div className="font-mono text-xs">৳{v.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-Ons Multi-Select */}
            {customizingItem.addOns && customizingItem.addOns.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 block">Optional Add-ons:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {customizingItem.addOns.map(addon => {
                    const isSelected = tempAddOns.some(a => a.id === addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setTempAddOns(prev => prev.filter(a => a.id !== addon.id));
                          } else {
                            setTempAddOns(prev => [...prev, addon]);
                          }
                        }}
                        className={`w-full p-2 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <span>{addon.name}</span>
                        <span className="font-mono text-[11px]">+৳{addon.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 block">Special Kitchen Notes:</label>
              <input
                type="text"
                placeholder="e.g. Less spicy, extra sauce, no mayo"
                value={tempNotes}
                onChange={e => setTempNotes(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Modal Actions (Clean Black and White) */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setCustomizingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomization}
                className="px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-black text-white text-xs font-black shadow-md cursor-pointer transition-all"
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RECEIPT MODAL (Guest Memo & KOT Print after Payment Confirmation)
         ========================================================================= */}
      {showReceiptModal && createdOrder && (
        <ReceiptModal
          order={createdOrder}
          onClose={() => {
            setShowReceiptModal(false);
            setCreatedOrder(null);
          }}
        />
      )}
    </div>
  );
};
