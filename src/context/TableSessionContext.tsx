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
  // Check URL pathname for /t/TXX or default to T17 for demo experience
  const getInitialTable = (): string | null => {
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/t\/([A-Za-z0-9]+)/i);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
      const saved = localStorage.getItem('vivacity_table_id');
      if (saved) return saved;
    }
    return 'T17'; // Default food hall table for showcase
  };

  const [tableId, setTableState] = useState<string | null>(getInitialTable);
  const [isTakeaway, setIsTakeaway] = useState<boolean>(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  const setTableId = (id: string | null) => {
    setTableState(id);
    if (id) {
      setIsTakeaway(false);
      localStorage.setItem('vivacity_table_id', id);
    } else {
      localStorage.removeItem('vivacity_table_id');
    }
  };

  const refreshActiveOrders = async () => {
    try {
      if (tableId) {
        const orders = await api.getOrders({ tableId });
        setActiveOrders(orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)));
      } else {
        const all = await api.getOrders();
        setActiveOrders(all.slice(0, 3));
      }
    } catch (e) {
      console.error('Error fetching table active orders:', e);
    }
  };

  useEffect(() => {
    refreshActiveOrders();

    const unsub = realtime.on('order_updated', (updated: Order) => {
      if (updated.tableId === tableId) {
        refreshActiveOrders();
      }
    });

    return () => unsub();
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
