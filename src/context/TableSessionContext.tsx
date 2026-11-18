import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order } from '../types';
import { realtime } from '../services/events';

interface TableSessionContextType {
  tableId: string | null;
  setTableId: (id: string | null) => void;
  activeOrders: Order[];
  refreshActiveOrders: () => Promise<void>;
  isTakeaway: boolean;
  setIsTakeaway: (val: boolean) => void;
}

const TableSessionContext = createContext<TableSessionContextType | null>(null);

export const TableSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check URL pathname for /t/TXX or retrieve stored table session
  const getInitialTable = (): string | null => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/t\/([A-Za-z0-9]+)/i);
      if (match && match[1]) {
        const scanned = match[1].toUpperCase();
        try {
          sessionStorage.setItem('vivacity_table_id', scanned);
          localStorage.setItem('vivacity_table_id', scanned);
        } catch {}
        return scanned;
      }
      const sessionSaved = sessionStorage.getItem('vivacity_table_id');
      if (sessionSaved) return sessionSaved.toUpperCase();
      const localSaved = localStorage.getItem('vivacity_table_id');
      if (localSaved) return localSaved.toUpperCase();
    }
    return null;
  };

  const [tableId, setTableState] = useState<string | null>(getInitialTable);
  const [isTakeaway, setIsTakeaway] = useState<boolean>(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  const setTableId = (id: string | null) => {
    const formatted = id ? id.trim().toUpperCase() : null;
    setTableState(formatted);
    if (typeof window !== 'undefined') {
      if (formatted) {
        setIsTakeaway(false);
        try {
          sessionStorage.setItem('vivacity_table_id', formatted);
          localStorage.setItem('vivacity_table_id', formatted);
        } catch {}
      } else {
        try {
          sessionStorage.removeItem('vivacity_table_id');
          localStorage.removeItem('vivacity_table_id');
        } catch {}
      }
    }
    // Update real-time connection subscription
    realtime.subscribe({ tableId: formatted || undefined });
  };

  const refreshActiveOrders = async () => {
    try {
      if (tableId) {
        const orders = await api.getOrders({ tableId });
        const now = Date.now();
        // Fresh table scan defaults to zero active orders unless placed in the current session (last 3 hours)
        const currentActive = orders.filter(o => {
          if (['COMPLETED', 'CANCELLED'].includes(o.status)) return false;
          if (o.createdAt) {
            const time = new Date(o.createdAt).getTime();
            if (!isNaN(time) && now - time > 3 * 60 * 60 * 1000) {
              return false; // older order, do not show on fresh scan
            }
          }
          return true;
        });
        setActiveOrders(currentActive);
      } else {
        setActiveOrders([]);
      }
    } catch (e) {
      console.error('Error fetching table active orders:', e);
      setActiveOrders([]);
    }
  };

  useEffect(() => {
    refreshActiveOrders();

    const unsubUpdated = realtime.on('order_updated', (updated?: Order | null) => {
      if (!updated || updated.tableId === tableId) {
        refreshActiveOrders();
      }
    });

    const unsubReset = realtime.on('all_orders_reset', () => {
      setActiveOrders([]);
      refreshActiveOrders();
    });

    return () => {
      unsubUpdated();
      unsubReset();
    };
  }, [tableId]);

  return (
    <TableSessionContext.Provider
      value={{
        tableId,
        setTableId,
        activeOrders,
        refreshActiveOrders,
        isTakeaway,
        setIsTakeaway
      }}
    >
      {children}
    </TableSessionContext.Provider>
  );
};

export const useTableSession = () => {
  const ctx = useContext(TableSessionContext);
  if (!ctx) throw new Error('useTableSession must be used within TableSessionProvider');
  return ctx;
};
