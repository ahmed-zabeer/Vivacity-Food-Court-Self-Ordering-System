import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Delete,
  UtensilsCrossed,
  Zap,
  Wallet,
  Percent,
  X
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
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

type POSStep = 'ORDER' | 'PAYMENT';
type DiscountType = 'NONE' | '5' | '10' | '15' | 'CUSTOM';
type PaymentMethodId = 'CASH' | 'bKash' | 'Nagad' | 'Card / Physical POS Terminal' | 'NFC / Contactless';

// ─── Stall colour palette ─────────────────────────────────────────────────────
const STALL_COLORS: Record<string, string> = {
  'fusion-cafe':     '#f97316',
  'top-town':        '#8b5cf6',
  'momo-buzz':       '#10b981',
  'waffle-city':     '#ec4899',
  'live-station':    '#ef4444',
  'burger-bar':      '#f59e0b',
  'drinks-beverage': '#06b6d4',
  ALL:               '#6b7280',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const ManualPOSPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();

  // Master data
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation & filters
  const [selectedStallId, setSelectedStallId] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Order details
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY' | null>(null);
  const [tableId, setTableId] = useState<string>('');
  const [serviceType, setServiceType] = useState<'SELF_SERVICE' | 'TABLE_SERVICE' | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Discount
  const [discountType, setDiscountType] = useState<DiscountType>('NONE');
  const [customDiscountMode, setCustomDiscountMode] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [customDiscountPercent, setCustomDiscountPercent] = useState<string>('');
  const [customDiscountAmount, setCustomDiscountAmount] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showDiscountPanel, setShowDiscountPanel] = useState(false);

  // Payment
  const [step, setStep] = useState<POSStep>('ORDER');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('CASH');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [mobileTrxRef, setMobileTrxRef] = useState<string>('');
  const [cardTerminalName, setCardTerminalName] = useState<string>('Terminal #1 (Ingenico Desk 3500)');
  const [cardApprovalCode, setCardApprovalCode] = useState<string>('');
  const [cardPosStatus, setCardPosStatus] = useState<'APPROVED' | 'PENDING' | 'DECLINED'>('APPROVED');

  // Customisation modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [tempVariant, setTempVariant] = useState<MenuVariant | null>(null);
  const [tempAddOns, setTempAddOns] = useState<MenuAddOn[]>([]);
  const [tempNotes, setTempNotes] = useState<string>('');

  // Receipt / status
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Live clock
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const update = () =>
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Tables
  const allTables = useMemo(() =>
    Array.from({ length: 55 }, (_, i) => `T${(i + 1).toString().padStart(2, '0')}`), []);

  // Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all([api.getStalls().catch(() => []), api.getMenuItems().catch(() => [])])
      .then(([s, m]) => { setStalls(s || []); setMenuItems(m || []); })
      .finally(() => setLoading(false));
  }, []);

  // Derived
  const availableCategories = useMemo(() => {
    const src = selectedStallId === 'ALL' ? menuItems : menuItems.filter(i => i.stallId === selectedStallId);
    const cats = new Set<string>();
    src.forEach(i => { if (i.category) cats.add(i.category); });
    return Array.from(cats);
  }, [selectedStallId, menuItems]);

  const filteredMenuItems = useMemo(() =>
    menuItems.filter(item => {
      if (selectedStallId !== 'ALL' && item.stallId !== selectedStallId) return false;
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name.toLowerCase().includes(q) &&
            !item.category?.toLowerCase().includes(q) &&
            !item.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    }), [menuItems, selectedStallId, selectedCategory, searchQuery]);

  // Financials
  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.totalPrice, 0), [cart]);
  const serviceCharge = useMemo(() => serviceType === 'TABLE_SERVICE' ? Math.round(subtotal * 0.05) : 0, [serviceType, subtotal]);
  const effectiveDiscountPercent = useMemo(() => {
    if (discountType === '5') return 5;
    if (discountType === '10') return 10;
    if (discountType === '15') return 15;
    if (discountType === 'CUSTOM') {
      if (customDiscountMode === 'PERCENT') {
        const v = parseFloat(customDiscountPercent);
        return !isNaN(v) && v > 0 ? Math.min(100, v) : 0;
      } else {
        const a = parseFloat(customDiscountAmount);
        if (!isNaN(a) && a > 0 && subtotal > 0) return Math.min(100, Math.round((a / subtotal) * 100));
      }
    }
    return 0;
  }, [discountType, customDiscountMode, customDiscountPercent, customDiscountAmount, subtotal]);

  const discountAmount = useMemo(() => {
    if (subtotal <= 0 || discountType === 'NONE') return 0;
    if (discountType === 'CUSTOM' && customDiscountMode === 'FIXED') {
      const a = parseFloat(customDiscountAmount);
      return !isNaN(a) && a > 0 ? Math.min(subtotal, Math.round(a)) : 0;
    }
    return effectiveDiscountPercent > 0 ? Math.round((subtotal * effectiveDiscountPercent) / 100) : 0;
  }, [subtotal, discountType, customDiscountMode, customDiscountAmount, effectiveDiscountPercent]);

  const requiresManagerApproval = useMemo(() => {
    const isHigh = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'].includes(currentUser.role);
    return !isHigh && effectiveDiscountPercent > 10;
  }, [currentUser.role, effectiveDiscountPercent]);

  const netPayable = useMemo(() => Math.max(0, subtotal - discountAmount + serviceCharge), [subtotal, discountAmount, serviceCharge]);
  const cashReceived = useMemo(() => { const n = parseFloat(cashReceivedInput); return isNaN(n) ? 0 : n; }, [cashReceivedInput]);
  const changeToReturn = useMemo(() => paymentMethod === 'CASH' && cashReceived >= netPayable ? cashReceived - netPayable : 0, [paymentMethod, cashReceived, netPayable]);
  const remainingDue = useMemo(() => paymentMethod === 'CASH' && cashReceived < netPayable ? netPayable - cashReceived : 0, [paymentMethod, cashReceived, netPayable]);
  const totalItems = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  // Cart handlers
  const handleAddToCart = useCallback((item: MenuItem) => {
    if (item.isAvailable === false) return;
    if ((item.variants?.length ?? 0) > 0 || (item.addOns?.length ?? 0) > 0) {
      setCustomizingItem(item);
      setTempVariant(item.variants ? item.variants[0] : null);
      setTempAddOns([]);
      setTempNotes('');
      return;
    }
    setCart(prev => {
      const idx = prev.findIndex(c => c.menuItem.id === item.id && !c.selectedVariant && c.selectedAddOns.length === 0);
      if (idx > -1) {
        const u = [...prev];
        u[idx] = { ...u[idx], quantity: u[idx].quantity + 1, totalPrice: (u[idx].quantity + 1) * u[idx].unitPrice };
        return u;
      }
      return [...prev, { cartId: `${item.id}-std-${Date.now()}`, menuItem: item, quantity: 1, selectedAddOns: [], unitPrice: item.price, totalPrice: item.price }];
    });
  }, []);

  const handleConfirmCustomization = useCallback(() => {
    if (!customizingItem) return;
    let unitPrice = customizingItem.price;
    if (tempVariant) unitPrice = tempVariant.price;
    unitPrice += tempAddOns.reduce((s, a) => s + a.price, 0);
    const cartId = `${customizingItem.id}-${tempVariant?.id || 'base'}-${Date.now()}`;
    setCart(prev => [...prev, { cartId, menuItem: customizingItem, quantity: 1, selectedVariant: tempVariant || undefined, selectedAddOns: tempAddOns, notes: tempNotes.trim() || undefined, unitPrice, totalPrice: unitPrice }]);
    setCustomizingItem(null);
  }, [customizingItem, tempVariant, tempAddOns, tempNotes]);

  const handleQty = useCallback((cartId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.cartId !== cartId) return i;
      const q = i.quantity + delta;
      return q <= 0 ? null! : { ...i, quantity: q, totalPrice: q * i.unitPrice };
    }).filter(Boolean) as CartItem[]);
  }, []);

  const handleRemove = useCallback((cartId: string) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId));
  }, []);

  const resetPOSForm = useCallback(() => {
    setCart([]); setOrderType(null); setTableId(''); setServiceType(null);
    setCustomerName(''); setCustomerPhone(''); setCustomerNotes('');
    setDiscountType('NONE'); setCustomDiscountMode('PERCENT');
    setCustomDiscountPercent(''); setCustomDiscountAmount('');
    setDiscountReason(''); setManagerPin(''); setManagerApproved(false);
    setPinError(null); setPaymentMethod('CASH'); setCashReceivedInput('');
    setMobileTrxRef(''); setCardApprovalCode(''); setCardPosStatus('APPROVED');
    setSubmitError(null); setStep('ORDER'); setShowDiscountPanel(false);
  }, []);

  const handleClearCart = useCallback(() => {
    if (window.confirm('Clear cart and start fresh?')) resetPOSForm();
  }, [resetPOSForm]);

  const handleKeypadPress = useCallback((val: string) => {
    if (val === 'C') { setCashReceivedInput(''); return; }
    if (val === '⌫') { setCashReceivedInput(p => p.slice(0, -1)); return; }
    if (val === '.') { setCashReceivedInput(p => p.includes('.') ? p : (p ? p + '.' : '0.')); return; }
    if (val === '00') { setCashReceivedInput(p => (p && p !== '0') ? p + '00' : p); return; }
    setCashReceivedInput(p => p === '0' ? val : p + val);
  }, []);

  const handleProceedToPayment = useCallback(() => {
    setSubmitError(null);
    if (cart.length === 0) { setSubmitError('Cart is empty. Add food items first.'); return; }
    if (!orderType) { setSubmitError('Select Dine-in or Takeaway.'); return; }
    if (orderType === 'DINE_IN' && !tableId) { setSubmitError('Select a dining table (T01–T55).'); return; }
    if (orderType === 'DINE_IN' && !serviceType) { setSubmitError('Select Service Style.'); return; }
    setStep('PAYMENT');
  }, [cart, orderType, tableId, serviceType]);

  const handleSubmitOrder = async () => {
    if (submitting) return;
    if (cart.length === 0) { setSubmitError('Cart is empty.'); return; }
    if (!orderType) { setSubmitError('Select Dine-in or Takeaway.'); return; }
    if (orderType === 'DINE_IN' && !tableId) { setSubmitError('Select a dining table.'); return; }
    if (orderType === 'DINE_IN' && !serviceType) { setSubmitError('Select Service Style.'); return; }
    if (requiresManagerApproval && !managerApproved) { setSubmitError('Discount > 10% requires Manager PIN.'); return; }
    if (paymentMethod === 'CASH' && cashReceived < netPayable) { setSubmitError(`Cash insufficient. Remaining: ৳${remainingDue}.`); return; }
    if (paymentMethod === 'Card / Physical POS Terminal' && !cardApprovalCode.trim()) { setSubmitError('Enter Card Approval Code.'); return; }
    if (paymentMethod === 'Card / Physical POS Terminal' && cardPosStatus !== 'APPROVED') { setSubmitError('Card terminal must be APPROVED.'); return; }

    try {
      setSubmitting(true); setSubmitError(null);
      const rawItems = cart.map(c => ({
        menuItemId: c.menuItem.id, quantity: c.quantity,
        variantId: c.selectedVariant?.id, variantName: c.selectedVariant?.name,
        selectedAddOns: c.selectedAddOns.map(a => a.id), notes: c.notes || ''
      }));
      const payload = {
        tableId: orderType === 'DINE_IN' ? tableId : null,
        type: orderType === 'TAKEAWAY' ? ('PARCEL' as const) : ('DINE_IN' as const),
        customerOrderType: orderType, rawItems,
        customerName: customerName.trim() || 'Counter Guest',
        customerPhone: customerPhone.trim(),
        serviceType: (orderType === 'DINE_IN' && serviceType) ? serviceType : 'SELF_SERVICE',
        customerNotes: customerNotes.trim(), paymentMethod,
        discountType, discountPercent: effectiveDiscountPercent, discountAmount,
        discountReason: discountReason.trim() || (discountAmount > 0 ? 'Counter Discount' : ''),
        discountAppliedBy: currentUser.name,
        discountApprovedBy: requiresManagerApproval ? 'Manager (PIN)' : (discountAmount > 0 ? currentUser.name : ''),
        cashReceived: paymentMethod === 'CASH' ? cashReceived : null,
        changeReturned: paymentMethod === 'CASH' ? changeToReturn : null,
        cardPosTerminal: paymentMethod === 'Card / Physical POS Terminal' ? cardTerminalName : null,
        cardPosRef: paymentMethod === 'Card / Physical POS Terminal' ? cardApprovalCode.trim() : (mobileTrxRef.trim() || null),
        cardPosStatus: paymentMethod === 'Card / Physical POS Terminal' ? cardPosStatus : null,
        cashierName: currentUser.name, cashierId: currentUser.id
      };
      const result = await api.createManualOrder(payload);
      setCreatedOrder(result);
      setShowReceiptModal(true);
      resetPOSForm();
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit order. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen h-[100dvh] bg-[#1a1a2e] flex flex-col font-sans select-none overflow-hidden">

      {/* ── TOP BAR ───────────────────────────────────────────────────────── */}
      <header className="h-14 bg-[#16213e] border-b border-white/[0.06] px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/admin')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer border border-white/[0.08]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Central Counter</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-white leading-none">Manual POS Terminal</div>
              <div className="text-[10px] text-white/40 mt-0.5 hidden sm:block">Vivacity Food Court · Central Counter</div>
            </div>
          </div>
        </div>

        {/* Center: Step pills */}
        <div className="hidden md:flex items-center gap-1 bg-white/[0.05] border border-white/[0.08] p-1 rounded-2xl">
          {(['ORDER', 'PAYMENT'] as const).map((s, idx) => (
            <button
              key={s}
              onClick={() => {
                if (s === 'ORDER') setStep('ORDER');
                else handleProceedToPayment();
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer
                ${step === s ? 'bg-white text-zinc-900 shadow-sm' : 'text-white/50 hover:text-white/80'}`}
            >
              <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black ${step === s ? 'bg-zinc-900 text-white' : 'bg-white/10 text-white/60'}`}>{idx + 1}</span>
              <span>{s === 'ORDER' ? 'Select Food' : 'Payment'}</span>
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.07]">
            <User className="w-3.5 h-3.5 text-white/40" />
            <div>
              <div className="text-[11px] font-black text-white/90 leading-none">{currentUser.name}</div>
              <div className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">{currentUser.role}</div>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.07] text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-white/30" />
            <span className="hidden sm:inline">{currentTime || '--:--:-- --'}</span>
          </div>
          {(cart.length > 0 || orderType) && (
            <button
              onClick={handleClearCart}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/[0.15] hover:bg-red-500/[0.25] text-red-400 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-red-500/20"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN BODY ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ════ COLUMN A: FOOD BROWSER (ORDER step only) ══════════════════ */}
        {step === 'ORDER' && (
          <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden min-h-0 border-r border-white/[0.05]">

            {/* Stall tabs */}
            <div className="bg-[#0d1526] border-b border-white/[0.05] px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <button
                onClick={() => { setSelectedStallId('ALL'); setSelectedCategory('ALL'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer border ${
                  selectedStallId === 'ALL' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gray-500" />
                All Stalls
              </button>
              {stalls.map(stall => {
                const color = STALL_COLORS[stall.id] || '#6b7280';
                const isActive = selectedStallId === stall.id;
                return (
                  <button
                    key={stall.id}
                    onClick={() => { setSelectedStallId(stall.id); setSelectedCategory('ALL'); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer border ${
                      isActive ? 'border-white/20 text-white' : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                    }`}
                    style={{ background: isActive ? `${color}22` : undefined }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="truncate max-w-[80px]">{stall.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Search + category bar */}
            <div className="bg-[#0d1526] border-b border-white/[0.05] px-3 py-2 flex items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text" placeholder="Search food…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-6 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                <button onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 cursor-pointer transition-all ${selectedCategory === 'ALL' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>
                  All
                </button>
                {availableCategories.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Food grid — ONLY THIS SCROLLS */}
            <div className="flex-1 overflow-y-auto min-h-0 p-3">
              {loading ? (
                <div className="h-full flex items-center justify-center text-white/30 text-xs">Loading menu…</div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/25 text-xs space-y-2">
                  <AlertCircle className="w-7 h-7 opacity-40" />
                  <span>No items found</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                  {filteredMenuItems.map(item => {
                    const oos = item.isAvailable === false;
                    const stallObj = stalls.find(s => s.id === item.stallId);
                    const color = STALL_COLORS[item.stallId] || '#6b7280';
                    const cartItem = cart.find(c => c.menuItem.id === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => !oos && handleAddToCart(item)}
                        className={`group relative rounded-2xl border flex flex-col transition-all cursor-pointer overflow-hidden ${
                          oos
                            ? 'opacity-40 cursor-not-allowed border-white/[0.05] bg-white/[0.03]'
                            : 'border-white/[0.07] bg-white/[0.05] hover:bg-white/[0.09] hover:border-white/15'
                        }`}
                      >
                        {/* Image */}
                        <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/30">
                          <img
                            src={item.image || '/assets/vivacity-chili-icon.png'}
                            alt={item.name}
                            className={`w-full h-full ${item.id === 'db-fanta' ? 'object-contain p-1' : 'object-cover'} transition-transform group-hover:scale-105 ${oos ? 'grayscale' : ''}`}
                            onError={e => { (e.target as HTMLImageElement).src = '/assets/vivacity-chili-icon.png'; }}
                          />
                          <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white truncate max-w-[90%]" style={{ background: `${color}cc` }}>
                            {stallObj?.name || item.stallId}
                          </span>
                          {oos && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase">Out of Stock</span>
                            </div>
                          )}
                          {cartItem && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-zinc-900 text-[9px] font-black flex items-center justify-center shadow-md">
                              {cartItem.quantity}
                            </span>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2.5 flex flex-col gap-1">
                          <h3 className="text-[11px] font-black text-white/90 leading-tight line-clamp-2">{item.name}</h3>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-sm font-black text-amber-400">৳{item.price}</span>
                            {!oos && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleAddToCart(item); }}
                                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 border border-white/10"
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
        )}

        {/* ════ COLUMN B: ORDER / CART PANEL ═══════════════════════════════ */}
        <div className={`${step === 'ORDER' ? 'w-full lg:w-[380px] xl:w-[420px]' : 'w-full lg:w-[440px] xl:w-[500px]'} bg-[#16213e] flex flex-col shrink-0 border-r border-white/[0.05] overflow-hidden min-h-0`}>

          {/* Order config */}
          <div className="p-3 border-b border-white/[0.05] space-y-2.5 shrink-0 bg-[#0f172a]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Order Setup</span>
              {step === 'PAYMENT' && (
                <button onClick={() => setStep('ORDER')} className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-white/70 cursor-pointer transition-colors">
                  <ArrowLeft className="w-3 h-3" /> Edit Order
                </button>
              )}
            </div>

            {/* Dine-in / Takeaway */}
            <div className="grid grid-cols-2 gap-2">
              {(['DINE_IN', 'TAKEAWAY'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => {
                    setOrderType(t);
                    if (t === 'TAKEAWAY') { setTableId(''); setServiceType('SELF_SERVICE'); }
                    else if (!serviceType) setServiceType('SELF_SERVICE');
                  }}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    orderType === t
                      ? 'bg-white text-zinc-900 border-white shadow-md'
                      : 'bg-white/[0.05] border-white/[0.07] text-white/50 hover:text-white/80 hover:bg-white/[0.08]'
                  }`}
                >
                  {t === 'DINE_IN' ? '🍽️ Dine-In' : '🥡 Takeaway'}
                </button>
              ))}
            </div>

            {/* Table + Service */}
            {orderType === 'DINE_IN' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Table *</label>
                  <select value={tableId} onChange={e => setTableId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer">
                    <option value="">-- Table --</option>
                    {allTables.map(t => <option key={t} value={t}>Table {t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">Service *</label>
                  <select value={serviceType || ''} onChange={e => setServiceType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer">
                    <option value="">-- Service --</option>
                    <option value="SELF_SERVICE">Self-Service</option>
                    <option value="TABLE_SERVICE">Table Service +5%</option>
                  </select>
                </div>
              </div>
            )}

            {/* Guest info */}
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Guest Name" value={customerName} onChange={e => setCustomerName(e.target.value)}
                className="px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-white/20 focus:outline-none" />
              <input type="text" placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                className="px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-white/20 focus:outline-none" />
            </div>
          </div>

          {/* Cart items — SCROLLABLE */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/20 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-xs font-bold">Cart is empty</p>
                <p className="text-[11px]">Select food from the menu</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={item.cartId} className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-white/50 text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black text-white/90 truncate leading-snug">{item.menuItem.name}</div>
                    {item.selectedVariant && <div className="text-[9px] text-white/40">{item.selectedVariant.name}</div>}
                    {item.selectedAddOns.length > 0 && <div className="text-[9px] text-white/35">+{item.selectedAddOns.map(a => a.name).join(', ')}</div>}
                    {item.notes && <div className="text-[9px] text-amber-400/70 italic truncate">"{item.notes}"</div>}
                    <div className="text-[9px] text-white/35 font-mono mt-0.5">৳{item.unitPrice} each</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleQty(item.cartId, -1)} className="w-6 h-6 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/70 flex items-center justify-center cursor-pointer border border-white/[0.08] transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-black text-white">{item.quantity}</span>
                    <button onClick={() => handleQty(item.cartId, 1)} className="w-6 h-6 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-white/70 flex items-center justify-center cursor-pointer border border-white/[0.08] transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-sm font-black text-amber-400">৳{item.totalPrice}</span>
                    <button onClick={() => handleRemove(item.cartId)} className="text-white/20 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill summary footer */}
          <div className="p-3 border-t border-white/[0.05] bg-[#0f172a] space-y-2 shrink-0">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-white/40">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-bold text-white/70">৳{subtotal}</span>
              </div>
              {serviceCharge > 0 && (
                <div className="flex justify-between text-[11px] text-white/40">
                  <span>Table Service (5%)</span>
                  <span className="font-bold text-white/70">+৳{serviceCharge}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-[11px] text-emerald-400/80">
                  <span>Discount ({effectiveDiscountPercent}%)</span>
                  <span className="font-bold">-৳{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-white/[0.07]">
                <span className="text-xs font-black text-white/70 uppercase tracking-wider">Total</span>
                <span className="text-xl font-black text-amber-400">৳{netPayable}</span>
              </div>
            </div>

            {submitError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {step === 'ORDER' ? (
              <button
                onClick={handleProceedToPayment}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  cart.length === 0 ? 'bg-white/[0.05] text-white/20 cursor-not-allowed' : 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-lg active:scale-[0.99]'
                }`}
              >
                <span>Confirm Order</span>
                {cart.length > 0 && <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-black flex items-center justify-center">{totalItems}</span>}
              </button>
            ) : (
              <button
                onClick={handleSubmitOrder}
                disabled={submitting || (paymentMethod === 'CASH' && cashReceived < netPayable)}
                className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  submitting || (paymentMethod === 'CASH' && cashReceived < netPayable)
                    ? 'bg-white/[0.05] text-white/20 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/40 active:scale-[0.99]'
                }`}
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Processing…</span></>
                ) : (
                  <><CheckCircle className="w-4 h-4" /><span>Confirm Payment · ৳{netPayable}</span></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* ════ COLUMN C: ACTION / PAYMENT SIDEBAR ═════════════════════════ */}
        <div className="w-14 sm:w-[72px] lg:w-56 xl:w-64 bg-[#0d1526] flex flex-col border-l border-white/[0.04] shrink-0 overflow-y-auto overflow-x-hidden">
          {step === 'ORDER' ? (
            /* ORDER sidebar: discount + info */
            <div className="flex flex-col h-full p-2 lg:p-3 gap-2">
              <div className="hidden lg:block text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Quick Actions</div>

              {/* Discount toggle */}
              <button
                onClick={() => setShowDiscountPanel(p => !p)}
                className={`flex flex-col lg:flex-row items-center lg:items-center gap-1 lg:gap-2 p-2 lg:px-3 lg:py-2.5 rounded-xl transition-all cursor-pointer border ${
                  discountAmount > 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-white/[0.05] border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.08]'
                }`}
              >
                <Percent className="w-4 h-4 shrink-0" />
                <span className="hidden lg:block text-[11px] font-black">{discountAmount > 0 ? `${effectiveDiscountPercent}% OFF` : 'Discount'}</span>
              </button>

              {showDiscountPanel && (
                <div className="hidden lg:block p-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/30">Discount (Optional)</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['NONE', '5', '10', '15', 'CUSTOM'] as const).map(dt => (
                      <button key={dt}
                        onClick={() => { setDiscountType(dt); if (dt !== '15' && dt !== 'CUSTOM') setManagerApproved(false); }}
                        className={`py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-all ${discountType === dt ? 'bg-white text-zinc-900' : 'bg-white/[0.07] text-white/50 hover:bg-white/[0.12] hover:text-white/80'}`}>
                        {dt === 'NONE' ? '0%' : dt === 'CUSTOM' ? 'Custom' : `${dt}%`}
                      </button>
                    ))}
                  </div>
                  {discountType === 'CUSTOM' && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {(['PERCENT', 'FIXED'] as const).map(m => (
                          <button key={m} onClick={() => setCustomDiscountMode(m)}
                            className={`flex-1 py-1 rounded-lg text-[9px] font-black cursor-pointer ${customDiscountMode === m ? 'bg-white text-zinc-900' : 'bg-white/[0.07] text-white/40'}`}>
                            {m === 'PERCENT' ? '%' : '৳'}
                          </button>
                        ))}
                      </div>
                      <input type="number" min="0"
                        placeholder={customDiscountMode === 'PERCENT' ? 'e.g. 20' : 'e.g. 100'}
                        value={customDiscountMode === 'PERCENT' ? customDiscountPercent : customDiscountAmount}
                        onChange={e => customDiscountMode === 'PERCENT' ? setCustomDiscountPercent(e.target.value) : setCustomDiscountAmount(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-lg text-xs font-bold text-white placeholder-white/20 focus:outline-none" />
                    </div>
                  )}
                  {requiresManagerApproval && !managerApproved && (
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400"><Lock className="w-3 h-3" /> Manager PIN</div>
                      <div className="flex gap-1.5">
                        <input type="password" placeholder="PIN" value={managerPin} onChange={e => setManagerPin(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white/[0.07] border border-amber-500/20 rounded-lg text-xs font-mono text-white focus:outline-none" />
                        <button onClick={() => { if (managerPin === '1234') { setManagerApproved(true); setPinError(null); } else setPinError('Invalid'); }}
                          className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black rounded-lg cursor-pointer">OK</button>
                      </div>
                      {pinError && <p className="text-[9px] text-red-400 font-bold">{pinError}</p>}
                    </div>
                  )}
                  {requiresManagerApproval && managerApproved && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-1.5">
                      <CheckCircle className="w-3 h-3" /> Manager Approved
                    </div>
                  )}
                  <input type="text" placeholder="Discount reason (optional)" value={discountReason} onChange={e => setDiscountReason(e.target.value)}
                    className="w-full px-2.5 py-1 bg-white/[0.07] border border-white/[0.08] rounded-lg text-[10px] text-white placeholder-white/20 focus:outline-none" />
                </div>
              )}

              {/* Info preview */}
              <div className="mt-auto hidden lg:block p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-1">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Receipt Preview</div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/30">Cashier</span>
                  <span className="font-bold text-white/60 truncate max-w-[80px]">{currentUser.name}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/30">Type</span>
                  <span className="font-bold text-white/60">{orderType ?? '—'}</span>
                </div>
                {orderType === 'DINE_IN' && tableId && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/30">Table</span>
                    <span className="font-bold text-amber-400">{tableId}</span>
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* PAYMENT sidebar: methods + keypad */
            <div className="flex flex-col p-2 lg:p-3 gap-2 overflow-y-auto">
              <div className="hidden lg:block text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Payment Method</div>

              {([
                { id: 'CASH', label: 'Cash', Icon: DollarSign, color: '#10b981' },
                { id: 'Card / Physical POS Terminal', label: 'Card POS', Icon: CreditCard, color: '#3b82f6' },
                { id: 'bKash', label: 'bKash', Icon: Smartphone, color: '#e11d48' },
                { id: 'Nagad', label: 'Nagad', Icon: Wallet, color: '#f97316' },
                { id: 'NFC / Contactless', label: 'NFC Tap', Icon: Zap, color: '#8b5cf6' },
              ] as const).map(({ id, label, Icon, color }) => {
                const sel = paymentMethod === id;
                return (
                  <button key={id} onClick={() => setPaymentMethod(id as PaymentMethodId)}
                    className={`flex flex-col lg:flex-row items-center lg:items-center gap-1 lg:gap-2.5 p-2 lg:px-3.5 lg:py-3 rounded-xl transition-all cursor-pointer border ${
                      sel ? 'border-white/20 text-white' : 'bg-white/[0.04] border-white/[0.05] text-white/35 hover:text-white/60 hover:bg-white/[0.07]'
                    }`}
                    style={sel ? { background: `${color}22`, borderColor: `${color}55` } : undefined}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: sel ? color : undefined }} />
                    <span className="hidden lg:block text-[11px] font-black">{label}</span>
                    {sel && <span className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                  </button>
                );
              })}

              {/* Discount (compact) */}
              <div className="mt-1 hidden lg:block">
                <div className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1.5">Discount</div>
                <div className="grid grid-cols-5 gap-1">
                  {(['NONE', '5', '10', '15', 'CUSTOM'] as const).map(dt => (
                    <button key={dt} onClick={() => { setDiscountType(dt); if (dt !== '15' && dt !== 'CUSTOM') setManagerApproved(false); }}
                      className={`py-1.5 rounded-lg text-[9px] font-black cursor-pointer transition-all ${discountType === dt ? 'bg-white text-zinc-900' : 'bg-white/[0.06] text-white/40 hover:bg-white/[0.10] hover:text-white/70'}`}>
                      {dt === 'NONE' ? '0%' : dt === 'CUSTOM' ? '…' : `${dt}%`}
                    </button>
                  ))}
                </div>
                {discountType === 'CUSTOM' && (
                  <input type="number" min="0" placeholder={customDiscountMode === 'PERCENT' ? '% discount' : '৳ amount'}
                    value={customDiscountMode === 'PERCENT' ? customDiscountPercent : customDiscountAmount}
                    onChange={e => customDiscountMode === 'PERCENT' ? setCustomDiscountPercent(e.target.value) : setCustomDiscountAmount(e.target.value)}
                    className="mt-1.5 w-full px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-lg text-xs font-bold text-white placeholder-white/20 focus:outline-none" />
                )}
                {requiresManagerApproval && !managerApproved && (
                  <div className="mt-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <div className="flex items-center gap-1 text-[9px] font-bold text-amber-400"><Lock className="w-3 h-3" /> Manager PIN</div>
                    <div className="flex gap-1">
                      <input type="password" placeholder="PIN" value={managerPin} onChange={e => setManagerPin(e.target.value)}
                        className="flex-1 px-2 py-1 bg-white/[0.07] border border-amber-500/20 rounded-lg text-[10px] font-mono text-white focus:outline-none" />
                      <button onClick={() => { if (managerPin === '1234') { setManagerApproved(true); setPinError(null); } else setPinError('Invalid'); }}
                        className="px-2 py-1 bg-amber-500 text-white text-[9px] font-black rounded-lg cursor-pointer">OK</button>
                    </div>
                    {pinError && <p className="text-[9px] text-red-400">{pinError}</p>}
                  </div>
                )}
                {requiresManagerApproval && managerApproved && (
                  <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-emerald-400"><CheckCircle className="w-3 h-3" /> Manager Approved</div>
                )}
              </div>

              {/* Card POS extra fields */}
              {paymentMethod === 'Card / Physical POS Terminal' && (
                <div className="hidden lg:block space-y-1.5 mt-1 p-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/20">
                  <div className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Card POS Terminal</div>
                  <select value={cardPosStatus} onChange={e => setCardPosStatus(e.target.value as any)}
                    className="w-full px-2 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-lg text-[10px] font-bold text-white focus:outline-none cursor-pointer">
                    <option value="APPROVED">APPROVED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="DECLINED">DECLINED</option>
                  </select>
                  <input type="text" placeholder="Approval Code *" value={cardApprovalCode} onChange={e => setCardApprovalCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-lg text-[10px] font-mono font-bold text-white placeholder-white/20 focus:outline-none" />
                </div>
              )}

              {/* Mobile wallet ref */}
              {(paymentMethod === 'bKash' || paymentMethod === 'Nagad' || paymentMethod === 'NFC / Contactless') && (
                <div className="hidden lg:block mt-1">
                  <input type="text" placeholder="TrxID (Optional)" value={mobileTrxRef} onChange={e => setMobileTrxRef(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white/[0.07] border border-white/[0.08] rounded-lg text-[10px] font-mono font-bold text-white placeholder-white/20 focus:outline-none" />
                </div>
              )}

              {/* Cash keypad */}
              {paymentMethod === 'CASH' && (
                <div className="hidden lg:block mt-1 space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/20">Cash Received</div>

                  <div className={`px-3 py-2.5 rounded-xl border text-right font-mono font-black text-xl transition-colors ${
                    cashReceivedInput
                      ? cashReceived >= netPayable ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                      : 'bg-white/[0.05] border-white/[0.08] text-white/40'
                  }`}>
                    {cashReceivedInput ? `৳${cashReceivedInput}` : '৳0'}
                  </div>

                  {cashReceivedInput && (
                    cashReceived >= netPayable ? (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] font-bold text-emerald-300">Change</span>
                        <span className="text-lg font-black text-emerald-400">৳{changeToReturn}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        <span className="text-[10px] font-bold text-red-300">Still Due</span>
                        <span className="text-lg font-black text-red-400">৳{remainingDue}</span>
                      </div>
                    )
                  )}

                  {/* Presets */}
                  <div className="grid grid-cols-3 gap-1">
                    {[100, 500, 1000, 2000, 5000].map(v => (
                      <button key={v} onClick={() => setCashReceivedInput(String((cashReceived || 0) + v))}
                        className="py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-[10px] font-black text-white/60 hover:text-white transition-all cursor-pointer border border-white/[0.05]">
                        +{v}
                      </button>
                    ))}
                    <button onClick={() => setCashReceivedInput(String(netPayable))}
                      className="py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-[10px] font-black text-amber-400 transition-all cursor-pointer border border-amber-500/20">
                      Exact
                    </button>
                  </div>

                  {/* Numeric keypad */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {['7','8','9','4','5','6','1','2','3','.','0','00'].map(k => (
                      <button key={k} onClick={() => handleKeypadPress(k)}
                        className="py-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] active:bg-white/[0.18] text-white/80 font-black text-base transition-all cursor-pointer border border-white/[0.05] active:scale-95">
                        {k}
                      </button>
                    ))}
                    <button onClick={() => handleKeypadPress('⌫')}
                      className="py-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white/60 flex items-center justify-center transition-all cursor-pointer border border-white/[0.05]">
                      <Delete className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleKeypadPress('C')}
                      className="col-span-2 py-3.5 rounded-xl bg-red-500/[0.15] hover:bg-red-500/[0.25] text-red-400 font-black text-sm transition-all cursor-pointer border border-red-500/20">
                      CLEAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── ITEM CUSTOMISATION MODAL ──────────────────────────────────────── */}
      {customizingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#16213e] border border-white/10 rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">Customise</div>
                <h3 className="text-base font-black text-white">{customizingItem.name}</h3>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-white/30 hover:text-white/70 cursor-pointer p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {customizingItem.variants && customizingItem.variants.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-white/60">Size / Portion:</span>
                <div className="grid grid-cols-2 gap-2">
                  {customizingItem.variants.map(v => (
                    <button key={v.id} onClick={() => setTempVariant(v)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        tempVariant?.id === v.id ? 'bg-white text-zinc-900 border-white' : 'bg-white/[0.07] border-white/[0.08] text-white/70 hover:bg-white/[0.12]'
                      }`}>
                      <div className="truncate">{v.name}</div>
                      <div className="font-mono text-amber-400">৳{v.price}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {customizingItem.addOns && customizingItem.addOns.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-white/60">Add-ons:</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {customizingItem.addOns.map(addon => {
                    const sel = tempAddOns.some(a => a.id === addon.id);
                    return (
                      <button key={addon.id}
                        onClick={() => setTempAddOns(p => sel ? p.filter(a => a.id !== addon.id) : [...p, addon])}
                        className={`w-full p-2 rounded-xl border text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
                          sel ? 'bg-white text-zinc-900 border-white' : 'bg-white/[0.07] border-white/[0.08] text-white/70 hover:bg-white/[0.12]'
                        }`}>
                        <span>{addon.name}</span>
                        <span className="font-mono text-amber-400">+৳{addon.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-white/60 block mb-1">Special Kitchen Note:</label>
              <input type="text" placeholder="e.g. less spicy, no onion"
                value={tempNotes} onChange={e => setTempNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.07] border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20" />
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/[0.07]">
              <button onClick={() => setCustomizingItem(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white/40 hover:text-white/70 hover:bg-white/[0.07] cursor-pointer transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmCustomization}
                className="flex-1 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-black hover:bg-zinc-100 cursor-pointer transition-all shadow-md">
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ──────────────────────────────────────────────────── */}
      {showReceiptModal && createdOrder && (
        <ReceiptModal
          order={createdOrder}
          onClose={() => { setShowReceiptModal(false); setCreatedOrder(null); }}
        />
      )}
    </div>
  );
};
