import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, MenuItem } from '../types';

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
  addItem: (item: MenuItem, stallName: string, options?: AddItemOptions) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
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
  clearCustomerDetails: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vivacity_cart');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    // Seed sample tray items matching reference UI if first visit
    return [
      {
        cartItemId: "cart-seed-1",
        menuItemId: "cb-stk-1",
        stallId: "fusion-cafe",
        stallName: "Coffee Buzz Fusion Cafe",
        name: "T Bone Steak (300+6M)",
        price: 1450,
        basePrice: 1450,
        quantity: 1,
        notes: "Medium well with homemade sauce",
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80"
      },
      {
        cartItemId: "cart-seed-2",
        menuItemId: "mb-mom-1",
        stallId: "momo-buzz",
        stallName: "Momo Buzz",
        name: "Chicken Momo",
        price: 150,
        basePrice: 150,
        quantity: 2,
        notes: "Extra spicy sauce",
        image: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&q=80"
      },
      {
        cartItemId: "cart-seed-3",
        menuItemId: "bb-bgr-3",
        stallId: "burger-bar",
        stallName: "Burger Bar",
        name: "Chicken Cheese Delight",
        price: 249,
        basePrice: 249,
        quantity: 1,
        notes: "No onions",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80"
      }
    ];
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

  const clearCustomerDetails = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
  };

  // Remove any legacy customer details from localStorage so page refreshes and QR scans always start blank
  useEffect(() => {
    try {
      localStorage.removeItem('vivacity_customer_name');
      localStorage.removeItem('vivacity_customer_phone');
      localStorage.removeItem('vivacity_customer_address');
    } catch {}
  }, []);

  const addItem = (item: MenuItem, stallName: string, options: AddItemOptions = {}) => {
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
    const qty = options.quantity || 1;

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
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems(prev => {
      return prev
        .map(i => {
          if (i.cartItemId === cartItemId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
    setCouponCode(null);
    setDiscount(0);
    localStorage.removeItem('vivacity_cart');
    localStorage.removeItem('vivacity_coupon_code');
    localStorage.removeItem('vivacity_discount');
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
        clearCustomerDetails
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
