import React, { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useTableSession } from '../../context/TableSessionContext';
import { api } from '../../services/api';
import { sound } from '../../services/sound';
import { PaymentMethod, Order, ServiceType, CustomerOrderType } from '../../types';
import { useLocation } from 'wouter';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Wifi,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Lock,
  User,
  Phone,
  MapPin,
  UtensilsCrossed,
  Store,
  Package
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const {
    items, subtotal, discount, couponCode, clearCart, clearCustomerDetails,
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    customerAddress, setCustomerAddress,
    orderType, setOrderType,
    hasUnavailableItems, unavailableCartItems,
    sessionId
  } = useCart();
  const { tableId, isTakeaway } = useTableSession();
  const [, setLocation] = useLocation();

  // Order Type validation error state (Dine-in / Takeaway selection is required)
  const [orderTypeError, setOrderTypeError] = useState<string | null>(null);

  // Service Type: SELF_SERVICE (৳0) or TABLE_SERVICE (5% waiter charge) - starts unselected (null), preserved across reloads if selected
  const [serviceType, setServiceType] = useState<ServiceType | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('vivacity_selected_service_type');
      if (saved === 'SELF_SERVICE' || saved === 'TABLE_SERVICE') {
        return saved;
      }
    }
    return null;
  });
  const [serviceTypeError, setServiceTypeError] = useState<string | null>(null);

  // Validation Error States
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Payment Method: starts null (unselected), customer must explicitly choose
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('vivacity_customer_notes') || '';
    }
    return '';
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulated Payment Modal State (for bKash / Card / NFC)
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState<boolean>(false);
  const [bkashPin, setBkashPin] = useState<string>('12345');

  // Preserve selected service type across reloads
  useEffect(() => {
    if (serviceType) {
      sessionStorage.setItem('vivacity_selected_service_type', serviceType);
    } else {
      sessionStorage.removeItem('vivacity_selected_service_type');
    }
  }, [serviceType]);

  // Preserve customer notes across reloads
  useEffect(() => {
    if (customerNotes) {
      sessionStorage.setItem('vivacity_customer_notes', customerNotes);
    } else {
      sessionStorage.removeItem('vivacity_customer_notes');
    }
  }, [customerNotes]);

  // Calculate Waiter Service Charge (5% on subtotal only for TABLE_SERVICE)
  const waiterServiceCharge = serviceType === 'TABLE_SERVICE' ? Math.round(subtotal * 0.05) : 0;
  const grandTotal = Math.max(0, subtotal - discount + waiterServiceCharge);

  if (items.length === 0 && !pendingOrder) {
    return (
      <div className="max-w-md mx-auto w-full p-6 pb-4 text-center">
        <h2 className="text-base font-bold text-zinc-900">Your Tray is empty</h2>
        <button
          onClick={() => setLocation('/')}
          className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-full text-xs font-bold hover:bg-brand-600 transition-colors cursor-pointer"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // Validate Bangladesh phone number: 013-019 (11 digits, optional +88 / 88)
  const validatePhone = (phone: string): boolean => {
    const clean = phone.replace(/[\s\-]/g, '');
    return /^(?:\+?88)?01[3-9]\d{8}$/.test(clean);
  };

  const validateFields = (): boolean => {
    let valid = true;
    setNameError(null);
    setPhoneError(null);
    setOrderTypeError(null);
    setServiceTypeError(null);
    setPaymentMethodError(null);

    if (!orderType) {
      setOrderTypeError('Please select Dine-in or Takeaway to continue.');
      valid = false;
    }

    if (!serviceType) {
      setServiceTypeError('Please select Self-Service or Table Service to continue.');
      valid = false;
    }

    if (!paymentMethod) {
      setPaymentMethodError('Please select a payment method to continue.');
      valid = false;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Customer Name is required (at least 2 characters).');
      valid = false;
    }

    const cleanPhone = customerPhone.trim().replace(/[\s\-]/g, '');
    if (!cleanPhone) {
      setPhoneError('Phone Number is required.');
      valid = false;
    } else if (!validatePhone(cleanPhone)) {
      setPhoneError('Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX).');
      valid = false;
    }

    return valid;
  };

  // Submit Master Order
  const handlePlaceOrder = async () => {
    setErrorMessage(null);
    setOrderTypeError(null);
    setServiceTypeError(null);
    setPaymentMethodError(null);

    if (hasUnavailableItems) {
      setErrorMessage('Some items in your tray are currently out of stock. Please return to your tray and remove them before ordering.');
      return;
    }

    if (!validateFields()) {
      if (!orderType) {
        setErrorMessage('Please select Dine-in or Takeaway to continue.');
        const section = document.getElementById('order-type-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (!serviceType) {
        setErrorMessage('Please select Self-Service or Table Service to continue.');
        const section = document.getElementById('service-type-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (!paymentMethod) {
        setErrorMessage('Please select a payment method to continue.');
        const section = document.getElementById('payment-method-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const rawItems = items.map(i => ({
        menuItemId: i.menuItemId,
        variantId: i.variantId,
        variantName: i.variantName,
        weight: i.weight,
        selectedAddOns: i.selectedAddOns,
        notes: i.notes,
        quantity: i.quantity
      }));

      const newOrder = await api.createOrder({
        tableId: isTakeaway ? null : (tableId || 'T17'),
        type: orderType === 'TAKEAWAY' ? 'PARCEL' : 'DINE_IN',
        customerOrderType: orderType!,
        rawItems,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim().replace(/[\s\-]/g, ''),
        customerAddress: customerAddress.trim(),
        serviceType: serviceType!,
        customerNotes,
        paymentMethod: paymentMethod!,
        couponCode,
        cartSessionId: sessionId
      });

      setPendingOrder(newOrder);

      // Track this device's placed order IDs
      try {
        const existing = JSON.parse(localStorage.getItem('vivacity_customer_orders') || '[]');
        if (!existing.includes(newOrder.id)) {
          existing.push(newOrder.id);
          localStorage.setItem('vivacity_customer_orders', JSON.stringify(existing));
        }
      } catch {}

      // Play soft feedback
      sound.playNewOrderChime();

      if (paymentMethod === 'CASH') {
        // Cash order created in PAYMENT DUE state
        clearCart();
        clearCustomerDetails();
        sessionStorage.removeItem('vivacity_selected_service_type');
        sessionStorage.removeItem('vivacity_customer_notes');
        setLocation(`/orders/${newOrder.id}`);
      } else {
        // Online payment (bKash / Card / NFC) opens secure simulation modal
        setShowPaymentModal(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Online Payment Simulation (Clean, professional - no celebratory burst/confetti)
  const handleCompleteOnlinePayment = async () => {
    if (!pendingOrder) return;
    setPaymentProcessing(true);

    try {
      await new Promise(r => setTimeout(r, 1200)); // simulate gateway processing

      const updated = await api.processPayment(pendingOrder.id, {
        paymentMethod,
        transactionId: `${paymentMethod.toUpperCase().replace(/\s+/g, '')}-${Date.now().toString().slice(-6)}`
      });

      // Professional audio feedback
      sound.playPaymentSuccess();

      clearCart();
      clearCustomerDetails();
      sessionStorage.removeItem('vivacity_selected_service_type');
      sessionStorage.removeItem('vivacity_customer_notes');
      setShowPaymentModal(false);
      setLocation(`/orders/${updated.id}`);
    } catch (e: any) {
      alert('Payment processing failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="max-w-full md:max-w-2xl mx-auto w-full p-4 sm:p-6 pb-4 sm:pb-6 space-y-4">
      <div>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">
          Review &amp; Checkout
        </h1>
        <p className="text-xs text-zinc-500">
          Single master checkout for all dishes across your selected stalls
        </p>
      </div>

      {/* Destination Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-3xl p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-brand-700">
            Delivery Location
          </span>
          <h2 className="text-base font-black text-zinc-900">
            {isTakeaway ? 'Takeaway / Parcel Counter' : `Table ${tableId || 'T17'} (Dine-in)`}
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Your dishes will be prepared hot across our 6 food hall kitchens.
          </p>
        </div>
        <span className="w-8 h-8 rounded-full bg-brand-500 text-white font-black flex items-center justify-center text-xs">
          ✓
        </span>
      </div>

      {/* Out of Stock Warning Banner */}
      {hasUnavailableItems && (
        <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-4 space-y-2.5 text-xs text-red-900 shadow-sm animate-pulse">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-black text-sm text-red-900">
                Item(s) in Tray are Out of Stock!
              </h3>
              <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                {unavailableCartItems.length === 1
                  ? `"${unavailableCartItems[0].name}" is currently out of stock.`
                  : `${unavailableCartItems.length} dishes in your tray are currently out of stock.`
                }{' '}
                Please return to your food tray to remove unavailable items before placing your order.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocation('/cart')}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              Back to Tray
            </button>
          </div>
        </div>
      )}

      {/* ================= ORDER TYPE SELECTION (Dine-in / Takeaway) ================= */}
      <div
        id="order-type-section"
        className={`bg-white rounded-3xl p-4 border transition-all space-y-3 ${
          orderTypeError
            ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50/20'
            : 'border-zinc-200/90 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Order Type
            </h3>
            <span className="text-red-600 font-black">*</span>
          </div>
          <span className={`text-[10px] font-bold ${orderType ? 'text-zinc-500 font-extrabold' : 'text-amber-600'}`}>
            {orderType ? (orderType === 'DINE_IN' ? '✓ Dine-in Selected' : '✓ Takeaway Selected') : 'Selection required'}
          </span>
        </div>

        {orderTypeError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{orderTypeError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: Dine-in */}
          <button
            type="button"
            onClick={() => {
              setOrderType('DINE_IN');
              setOrderTypeError(null);
              if (errorMessage === 'Please select Dine-in or Takeaway to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              orderType === 'DINE_IN'
                ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30 shadow-xs'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    orderType === 'DINE_IN' ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Dine-in</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Eat Here
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Enjoy your dishes right here inside Vivacity Food Court seating area.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-600">
              <span>Hall / Table dining</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                orderType === 'DINE_IN' ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 bg-white'
              }`}>
                {orderType === 'DINE_IN' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </button>

          {/* Option 2: Takeaway */}
          <button
            type="button"
            onClick={() => {
              setOrderType('TAKEAWAY');
              setOrderTypeError(null);
              if (errorMessage === 'Please select Dine-in or Takeaway to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              orderType === 'TAKEAWAY'
                ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30 shadow-xs'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    orderType === 'TAKEAWAY' ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Takeaway</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Parcel
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Dishes packaged hot in takeaway containers for carryout or home.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-zinc-600">
              <span>Carryout parcel box</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                orderType === 'TAKEAWAY' ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 bg-white'
              }`}>
                {orderType === 'TAKEAWAY' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ================= 1. SERVICE TYPE SELECTION ================= */}
      <div
        id="service-type-section"
        className={`bg-white rounded-3xl p-4 border transition-all space-y-3 ${
          serviceTypeError
            ? 'border-red-400 ring-2 ring-red-400/30 bg-red-50/20'
            : 'border-zinc-200/90 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Dining Service Option
            </h3>
            <span className="text-red-600 font-black">*</span>
          </div>
          <span className={`text-[10px] font-bold ${serviceType ? 'text-zinc-400' : 'text-amber-600'}`}>
            {serviceType ? 'Selected' : 'Selection required'}
          </span>
        </div>

        {serviceTypeError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center gap-1.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{serviceTypeError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option A: Self-Service */}
          <button
            type="button"
            onClick={() => {
              setServiceType('SELF_SERVICE');
              setServiceTypeError(null);
              if (errorMessage === 'Please select Self-Service or Table Service to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              serviceType === 'SELF_SERVICE'
                ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/30 shadow-xs'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    serviceType === 'SELF_SERVICE' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Self-Service</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ৳0 Fee
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Collect your prepared food from the pickup counter.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-emerald-700">
              <span>No waiter fee applied</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                serviceType === 'SELF_SERVICE' ? 'border-emerald-600 bg-emerald-600' : 'border-zinc-300 bg-white'
              }`}>
                {serviceType === 'SELF_SERVICE' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </button>

          {/* Option B: Table Service */}
          <button
            type="button"
            onClick={() => {
              setServiceType('TABLE_SERVICE');
              setServiceTypeError(null);
              if (errorMessage === 'Please select Self-Service or Table Service to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
              serviceType === 'TABLE_SERVICE'
                ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/30 shadow-xs'
                : 'border-zinc-200 hover:border-zinc-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                    serviceType === 'TABLE_SERVICE' ? 'bg-brand-500 text-white' : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    <UtensilsCrossed className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-zinc-900">Table Service</span>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                  +5% Waiter Fee
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 leading-snug">
                Have your prepared food delivered to your table by the service staff.
              </p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-bold text-brand-700">
              <span>+৳ {Math.round(subtotal * 0.05)} service fee</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                serviceType === 'TABLE_SERVICE' ? 'border-brand-500 bg-brand-500' : 'border-zinc-300 bg-white'
              }`}>
                {serviceType === 'TABLE_SERVICE' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ================= 2. REQUIRED CUSTOMER DETAILS ================= */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Customer Information
            </h3>
          </div>
          <span className="text-[10px] text-red-600 font-bold">* Required fields</span>
        </div>

        <div className="space-y-3">
          {/* Customer Name * */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-zinc-800 mb-1">
              <User className="w-3.5 h-3.5 text-zinc-500" />
              <span>Customer Name</span>
              <span className="text-red-600 font-black">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Tanvir Ahmed"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (nameError) setNameError(null);
              }}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
                nameError
                  ? 'border-red-400 bg-red-50/30 focus:ring-red-200'
                  : 'border-zinc-200 focus:ring-brand-500/20 focus:border-brand-500'
              }`}
            />
            {nameError && (
              <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          {/* Phone Number * */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-zinc-800 mb-1">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              <span>Phone Number</span>
              <span className="text-red-600 font-black">*</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 017XXXXXXXX"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              className={`w-full px-3.5 py-2.5 rounded-2xl border text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 transition-all ${
                phoneError
                  ? 'border-red-400 bg-red-50/30 focus:ring-red-200'
                  : 'border-zinc-200 focus:ring-brand-500/20 focus:border-brand-500'
              }`}
            />
            {phoneError && (
              <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{phoneError}</span>
              </p>
            )}
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Used for order updates and SMS/counter collection alerts.
            </p>
          </div>

          {/* Address (Optional) */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-zinc-600 mb-1">
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>Address (Optional)</span>
            </label>
            <input
              type="text"
              placeholder="Leave blank for table dining"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
        </div>
      </div>

      {/* ================= 3. PAYMENT METHOD ================= */}
      <div
        id="payment-method-section"
        className={`bg-white rounded-3xl p-4 border transition-all ${
          paymentMethodError
            ? 'border-red-400 bg-red-50/20 ring-2 ring-red-400/20'
            : 'border-zinc-200/90'
        } shadow-2xs space-y-3`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Select Payment Method
          </h3>
          <span className="text-[10px] text-red-600 font-bold">* Required</span>
        </div>

        {paymentMethodError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{paymentMethodError}</span>
          </div>
        )}

        <div className="space-y-2">
          {/* bKash */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('bKash');
              setPaymentMethodError(null);
              if (errorMessage === 'Please select a payment method to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              paymentMethod === 'bKash'
                ? 'border-[#e2136e] bg-pink-50/50 ring-1 ring-[#e2136e]'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#e2136e] text-white flex items-center justify-center font-black text-xs shadow-xs">
                ৳
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900">bKash Mobile Payment</div>
                <div className="text-[10px] text-zinc-500">Fast digital payment via bKash gateway</div>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              paymentMethod === 'bKash' ? 'border-[#e2136e] bg-[#e2136e] text-white' : 'border-zinc-300'
            }`}>
              {paymentMethod === 'bKash' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>

          {/* Online Card */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('Online Card');
              setPaymentMethodError(null);
              if (errorMessage === 'Please select a payment method to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              paymentMethod === 'Online Card'
                ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900">Online Card (Visa / Mastercard)</div>
                <div className="text-[10px] text-zinc-500">Encrypted merchant checkout</div>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              paymentMethod === 'Online Card' ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-300'
            }`}>
              {paymentMethod === 'Online Card' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>

          {/* NFC / Contactless */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('NFC / Contactless');
              setPaymentMethodError(null);
              if (errorMessage === 'Please select a payment method to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              paymentMethod === 'NFC / Contactless'
                ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900">NFC / Contactless Touch</div>
                <div className="text-[10px] text-zinc-500">Tap phone or contactless token</div>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              paymentMethod === 'NFC / Contactless' ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-300'
            }`}>
              {paymentMethod === 'NFC / Contactless' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>

          {/* Cash Payment */}
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('CASH');
              setPaymentMethodError(null);
              if (errorMessage === 'Please select a payment method to continue.') {
                setErrorMessage(null);
              }
            }}
            className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
              paymentMethod === 'CASH'
                ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                : 'border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900">Pay Cash at Central Counter</div>
                <div className="text-[10px] text-zinc-500">Show token at counter to pay with cash</div>
              </div>
            </div>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
              paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-zinc-300'
            }`}>
              {paymentMethod === 'CASH' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </button>
        </div>

        {paymentMethod === 'CASH' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 leading-relaxed font-medium">
            💡 <strong>Cash Policy:</strong> When you submit, your order status will be <strong>PAYMENT DUE</strong>. Please visit the central counter to pay cash. Once our cashier confirms, your Kitchen Order Ticket (KOT) is generated and released to the stalls.
          </div>
        )}
      </div>

      {/* Special Delivery Notes */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/90 shadow-2xs space-y-2">
        <label className="block text-xs font-black uppercase tracking-wider text-zinc-900">
          Order Instructions (Optional)
        </label>
        <textarea
          rows={2}
          placeholder="e.g. Please bring extra cutlery, celebrate a birthday..."
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-2xl border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
        />
      </div>

      {/* ================= 4. ORDER SUMMARY & TOTAL ================= */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200 shadow-2xs space-y-2 text-xs">
        <div className="flex justify-between text-zinc-600">
          <span>Food Subtotal:</span>
          <span className="font-bold text-zinc-800">৳ {subtotal}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Coupon Discount:</span>
            <span>-৳ {discount}</span>
          </div>
        )}
        <div className="flex justify-between text-zinc-600 items-center">
          <span>
            {serviceType === 'TABLE_SERVICE'
              ? 'Waiter Service Charge (5%):'
              : serviceType === 'SELF_SERVICE'
              ? 'Service Fee (Self-Service):'
              : 'Dining Service Fee:'}
          </span>
          <span
            className={`font-bold ${
              serviceType === 'TABLE_SERVICE'
                ? 'text-brand-600'
                : serviceType === 'SELF_SERVICE'
                ? 'text-emerald-600'
                : 'text-zinc-400'
            }`}
          >
            {serviceType === 'TABLE_SERVICE'
              ? `৳ ${waiterServiceCharge}`
              : serviceType === 'SELF_SERVICE'
              ? '৳ 0'
              : 'Select service'}
          </span>
        </div>
        <div className="flex justify-between text-sm font-black text-zinc-900 pt-2 border-t border-zinc-100">
          <span>Total Payable:</span>
          <span className="text-xl font-black text-brand-600">৳ {grandTotal}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={isSubmitting || hasUnavailableItems}
          onClick={handlePlaceOrder}
          className={`w-full py-4 px-6 rounded-2xl font-extrabold text-sm flex items-center justify-between transition-all ${
            hasUnavailableItems
              ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none'
              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-[0_8px_25px_rgba(224,109,36,0.35)] active:scale-[0.99] disabled:opacity-50 cursor-pointer'
          }`}
        >
          <span>
            {hasUnavailableItems
              ? '⚠️ Tray Contains Out-of-Stock Items'
              : isSubmitting
              ? 'Submitting to Food Court...'
              : 'Submit Master Order'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black">৳ {grandTotal}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
        {hasUnavailableItems && (
          <p className="text-center text-[11px] font-bold text-red-600">
            Cannot submit order: Please remove out-of-stock items first.
          </p>
        )}
      </div>

      {/* Security Footer Notice */}
      <div className="text-center text-[10px] text-zinc-400 flex items-center justify-center gap-1.5 pt-1">
        <Lock className="w-3 h-3" />
        <span>PCI-DSS compliant simulated checkout • Never stores raw credentials</span>
      </div>

      {/* ================= SIMULATED PAYMENT GATEWAY MODAL ================= */}
      {showPaymentModal && pendingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`p-4 text-white flex items-center justify-between ${
              paymentMethod === 'bKash' ? 'bg-[#e2136e]' : 'bg-zinc-900'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">
                  {paymentMethod} Gateway
                </span>
              </div>
              <span className="text-xs font-extrabold">৳ {pendingOrder.grandTotal}</span>
            </div>

            <div className="p-6 space-y-4 text-center">
              <div>
                <p className="text-xs text-zinc-500 font-medium">Merchant:</p>
                <h3 className="text-base font-black text-zinc-900">
                  Vivacity Food Court
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Token #{pendingOrder.token} • {pendingOrder.tableId ? `Table ${pendingOrder.tableId}` : 'Takeaway'}
                </p>
                <p className="text-[11px] text-brand-600 font-bold mt-1">
                  Guest: {customerName} ({customerPhone})
                </p>
              </div>

              {paymentMethod === 'bKash' ? (
                <div className="space-y-3 bg-pink-50/70 p-4 rounded-2xl border border-pink-100">
                  <p className="text-xs text-zinc-700 font-semibold">
                    Enter your bKash PIN to authorize payment:
                  </p>
                  <input
                    type="password"
                    maxLength={5}
                    value={bkashPin}
                    onChange={(e) => setBkashPin(e.target.value)}
                    className="w-36 mx-auto px-4 py-2.5 text-center text-lg tracking-widest font-black rounded-xl border border-zinc-300 focus:ring-2 focus:ring-[#e2136e] focus:outline-none bg-white"
                  />
                  <p className="text-[10px] text-zinc-400">Demo sandbox mode: PIN pre-filled</p>
                </div>
              ) : paymentMethod === 'NFC / Contactless' ? (
                <div className="space-y-2 py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto animate-pulse">
                    <Wifi className="w-8 h-8" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800">
                    Ready to Tap Device / Contactless Card
                  </p>
                </div>
              ) : (
                <div className="space-y-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-left text-xs">
                  <div className="flex justify-between text-zinc-500">
                    <span>Card Holder:</span>
                    <strong className="text-zinc-800">{customerName || 'Vivacity Guest'}</strong>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Card Number:</span>
                    <strong className="text-zinc-800">•••• •••• •••• 4242</strong>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={paymentProcessing}
                onClick={handleCompleteOnlinePayment}
                className={`w-full py-3.5 px-4 rounded-xl text-white font-black text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer ${
                  paymentMethod === 'bKash' ? 'bg-[#e2136e] hover:bg-[#c2105e]' : 'bg-zinc-900 hover:bg-black'
                }`}
              >
                {paymentProcessing ? 'Processing Transaction...' : `Confirm & Pay ৳${pendingOrder.grandTotal}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
