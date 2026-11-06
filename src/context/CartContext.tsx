import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem, CustomerOrderType } from '../types';
import { api } from '../services/api';
import { realtime } from '../services/events';

interface AddItemOptions {
  variantId?: string;
  variantName?: string;
  weight?: number;
  selectedAddOns?: string[];
  addOnNames?: string[];
  notes?: string;
  quantity?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, stallName: string, options?: AddItemOptions) => Promise<boolean>;
  updateQuantity: (cartItemId: string, delta: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => void;
  sessionId: string;
  itemCount: number;
  subtotal: number;
  couponCode: string | null;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  discount: number;
  grandTotal: number;
  groupedByStall: { stallId: string; stallName: string; items: CartItem[] }[];
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerAddress: string;
  setCustomerAddress: (val: string) => void;
  orderType: CustomerOrderType | null;
  setOrderType: (val: CustomerOrderType | null) => void;
  clearCustomerDetails: () => void;
  unavailableCartItems: CartItem[];
  hasUnavailableItems: boolean;
  removeUnavailableItems: () => void;
  isMenuItemAvailable: (menuItemId: string) => boolean;
  isCartItemOutOfStock: (item: CartItem) => boolean;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let sid = localStorage.getItem('vivacity_cart_session_id');
      if (!sid) {
        sid = 'csess-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
        localStorage.setItem('vivacity_cart_session_id', sid);
      }
      return sid;
    }
    return 'csess-' + Math.random().toString(36).substring(2, 9);
  });

  const lastActiveRef = React.useRef<number>(Date.now());

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vivacity_cart');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Keep genuine user-added items across active checkout page refreshes,
            // but remove any legacy sample/seed items from previous sessions.
            const genuine = parsed.filter(
              (i: any) =>
                i &&
                i.cartItemId &&
                !String(i.cartItemId).toLowerCase().includes('seed')
            );
            if (genuine.length !== parsed.length) {
              if (genuine.length === 0) {
                localStorage.removeItem('vivacity_cart');
              } else {
                localStorage.setItem('vivacity_cart', JSON.stringify(genuine));
              }
            }
            return genuine;
          }
        } catch (e) {}
      }
    }
    // New guest orders start with an empty cart and ৳0 total
    return [];
  });

  const [couponCode, setCouponCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vivacity_coupon_code');
    }
    return null;
  });
  const [discount, setDiscount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vivacity_discount');
      return saved ? Number(saved) : 0;
    }
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('vivacity_cart', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (couponCode) {
      localStorage.setItem('vivacity_coupon_code', couponCode);
      localStorage.setItem('vivacity_discount', discount.toString());
    } else {
      localStorage.removeItem('vivacity_coupon_code');
      localStorage.removeItem('vivacity_discount');
    }
  }, [couponCode, discount]);

  // Customer information: in-memory state only (blank on reload or QR scan, preserved across checkout navigation)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Explicit Order Type (Dine-in / Takeaway) - default is null (none)
  const [orderType, setOrderType] = useState<CustomerOrderType | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('vivacity_order_type');
      if (saved === 'DINE_IN' || saved === 'TAKEAWAY') {
        return saved;
      }
    }
    return null;
  });

  useEffect(() => {
    if (orderType) {
      sessionStorage.setItem('vivacity_order_type', orderType);
    } else {
      sessionStorage.removeItem('vivacity_order_type');
    }
  }, [orderType]);

  const clearCustomerDetails = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderType(null);
    try {
      sessionStorage.removeItem('vivacity_order_type');
      sessionStorage.removeItem('vivacity_selected_service_type');
      sessionStorage.removeItem('vivacity_customer_notes');
    } catch {}
  };

  // Remove any legacy customer details from localStorage so page refreshes and QR scans always start blank
  useEffect(() => {
    try {
      localStorage.removeItem('vivacity_customer_name');
      localStorage.removeItem('vivacity_customer_phone');
      localStorage.removeItem('vivacity_customer_address');
    } catch {}
  }, []);

  // Inactivity tracking: resets on any user interaction, expires on 1 minute (60s) inactivity
  useEffect(() => {
    const handleActivity = () => {
      lastActiveRef.current = Date.now();
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));

    // Heartbeat every 15s to keep active reservations alive while user is interacting
    const heartbeatTimer = setInterval(() => {
      if (items.length > 0) {
        const inactiveMs = Date.now() - lastActiveRef.current;
        if (inactiveMs < 60000) {
          api.sendCartHeartbeat(sessionId).catch(() => {});
        }
      }
    }, 15000);

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInterval(heartbeatTimer);
    };
  }, [items.length, sessionId]);

  // Real-time menu items availability tracking
  const [menuItemsMap, setMenuItemsMap] = useState<Record<string, MenuItem>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchItems = () => {
      api.getMenuItems().then(list => {
        if (!isMounted) return;
        const map: Record<string, MenuItem> = {};
        list.forEach(m => { map[m.id] = m; });
        setMenuItemsMap(map);
      }).catch(err => {
        console.warn('Failed to fetch menu items for cart stock validation', err);
      });
    };

    fetchItems();

    const unsubItem = realtime.on('menu_item_updated', (updatedItem: MenuItem) => {
      setMenuItemsMap(prev => ({
        ...prev,
        [updatedItem.id]: updatedItem
      }));
    });

    const unsubInv = realtime.on('inventory_updated', () => {
      fetchItems();
    });

    return () => {
      isMounted = false;
      unsubItem();
      unsubInv();
    };
  }, []);

  const isMenuItemAvailable = (menuItemId: string): boolean => {
    const m = menuItemsMap[menuItemId];
    if (!m) return true;
    if (m.isAvailable === false) return false;
    const avail = m.available !== undefined && m.available !== null ? m.available : (m.inv?.available ?? null);
    if (avail !== null && avail <= 0) return false;
    return true;
  };

  const isCartItemOutOfStock = (item: CartItem): boolean => {
    const m = menuItemsMap[item.menuItemId];
    if (!m) return false;
    if (m.inv?.manuallyDisabled) return true;
    if (m.inv && m.inv.preparedQty !== null && m.inv.preparedQty !== undefined) {
      const totalQtyInCartForThisMenu = items
        .filter(x => x.menuItemId === item.menuItemId)
        .reduce((sum, x) => sum + x.quantity, 0);
      const availableToThisGuest = (m.available !== null && m.available !== undefined ? m.available : 0) + totalQtyInCartForThisMenu;
      return availableToThisGuest < totalQtyInCartForThisMenu || availableToThisGuest <= 0;
    }
    return m.isAvailable === false;
  };

  const unavailableCartItems = items.filter(i => isCartItemOutOfStock(i));

  const hasUnavailableItems = unavailableCartItems.length > 0;

  const removeUnavailableItems = () => {
    const toRemove = items.filter(i => isCartItemOutOfStock(i));
    setItems(prev => prev.filter(i => !isCartItemOutOfStock(i)));
    toRemove.forEach(i => {
      api.releaseCartItem(sessionId, i.menuItemId).catch(() => {});
    });
  };

  const addItem = async (item: MenuItem, stallName: string, options: AddItemOptions = {}): Promise<boolean> => {
    lastActiveRef.current = Date.now();
    const qty = options.quantity || 1;
    const currentTotalQtyForMenu = items
      .filter(i => i.menuItemId === item.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    const newTotalQtyForMenu = currentTotalQtyForMenu + qty;

    try {
      await api.reserveCartItem(sessionId, item.id, newTotalQtyForMenu);
    } catch (err: any) {
      alert(err.message || 'Unable to reserve item');
      return false;
    }

    let finalPrice = item.price;
    if (options.variantId && item.variants) {
      const v = item.variants.find(varItem => varItem.id === options.variantId);
      if (v) finalPrice = v.price;
    }
    if (item.isWeightBased && options.weight) {
      finalPrice = (item.price / 100) * options.weight;
    }
    let addOnsSum = 0;
    if (options.selectedAddOns && item.addOns) {
      for (const aId of options.selectedAddOns) {
        const matched = item.addOns.find(a => a.id === aId);
        if (matched) addOnsSum += matched.price;
      }
    }
    const unitPrice = finalPrice + addOnsSum;

    // Generate unique key based on customisations
    const cartItemId = `${item.id}-${options.variantId || 'base'}-${options.weight || 'std'}-${(options.selectedAddOns || []).sort().join(',')}`;

    setItems(prev => {
      const existing = prev.find(i => i.cartItemId === cartItemId);
      if (existing) {
        return prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [
        ...prev,
        {
          cartItemId,
          menuItemId: item.id,
          stallId: item.stallId,
          stallName,
          name: item.name,
          price: unitPrice,
          basePrice: item.price,
          quantity: qty,
          variantId: options.variantId,
          variantName: options.variantName,
          weight: options.weight,
          selectedAddOns: options.selectedAddOns,
          addOnNames: options.addOnNames,
          notes: options.notes,
          image: item.image
        }
      ];
    });
    return true;
  };

  const updateQuantity = async (cartItemId: string, delta: number): Promise<void> => {
    lastActiveRef.current = Date.now();
    const targetItem = items.find(i => i.cartItemId === cartItemId);
    if (!targetItem) return;

    const nextQty = targetItem.quantity + delta;
    if (nextQty <= 0) {
      return removeItem(cartItemId);
    }

    const otherVariantsQty = items
      .filter(i => i.menuItemId === targetItem.menuItemId && i.cartItemId !== cartItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const newTotalQty = otherVariantsQty + nextQty;

    try {
      await api.reserveCartItem(sessionId, targetItem.menuItemId, newTotalQty);
      setItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: nextQty } : i));
    } catch (err: any) {
      alert(err.message || 'Unable to update quantity');
    }
  };

  const removeItem = async (cartItemId: string): Promise<void> => {
    lastActiveRef.current = Date.now();
    const targetItem = items.find(i => i.cartItemId === cartItemId);
    if (!targetItem) return;

    const remainingItems = items.filter(i => i.cartItemId !== cartItemId);
    setItems(remainingItems);

    const remainingQtyForMenu = remainingItems
      .filter(i => i.menuItemId === targetItem.menuItemId)
      .reduce((sum, i) => sum + i.quantity, 0);

    try {
      if (remainingQtyForMenu > 0) {
        await api.reserveCartItem(sessionId, targetItem.menuItemId, remainingQtyForMenu);
      } else {
        await api.releaseCartItem(sessionId, targetItem.menuItemId);
      }
    } catch (e) {
      console.warn('Failed to release reservation on remove:', e);
    }
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode(null);
    setDiscount(0);
    setOrderType(null);
    localStorage.removeItem('vivacity_cart');
    localStorage.removeItem('vivacity_coupon_code');
    localStorage.removeItem('vivacity_discount');
    try {
      sessionStorage.removeItem('vivacity_order_type');
    } catch {}

    api.releaseCartSession(sessionId).catch(e => console.warn('Failed to release cart session:', e));
  };

  const applyCoupon = (code: string) => {
    const c = code.trim().toUpperCase();
    if (c === 'VIVA10') {
      setCouponCode(c);
      setDiscount(Math.round(subtotal * 0.10));
      return true;
    } else if (c === 'STEAK50') {
      setCouponCode(c);
      setDiscount(50);
      return true;
    }
    return false;
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setDiscount(0);
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  // Group items by stall
  const stallMap = new Map<string, { stallId: string; stallName: string; items: CartItem[] }>();
  for (const item of items) {
    if (!stallMap.has(item.stallId)) {
      stallMap.set(item.stallId, {
        stallId: item.stallId,
        stallName: item.stallName,
        items: []
      });
    }
    stallMap.get(item.stallId)!.items.push(item);
  }
  const groupedByStall = Array.from(stallMap.values());

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        sessionId,
        itemCount,
        subtotal,
        couponCode,
        applyCoupon,
        removeCoupon,
        discount,
        grandTotal,
        groupedByStall,
        customerName,
        setCustomerName,
        customerPhone,
        setCustomerPhone,
        customerAddress,
        setCustomerAddress,
        orderType,
        setOrderType,
        clearCustomerDetails,
        unavailableCartItems,
        hasUnavailableItems,
        removeUnavailableItems,
        isMenuItemAvailable,
        isCartItemOutOfStock
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
