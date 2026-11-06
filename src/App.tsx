import React, { useState } from 'react';
import { Route, Switch, useRoute, useLocation } from 'wouter';
import { TableSessionProvider, useTableSession } from './context/TableSessionContext';
import { CartProvider, useCart } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { BrandSplash } from './components/common/BrandSplash';

import { GlobalFooter } from './components/common/GlobalFooter';
import { FoodReadyModal } from './components/customer/FoodReadyModal';
import { StallReadyConfirmedEvent } from './types';
import { realtime } from './services/events';
import { AlertTriangle } from 'lucide-react';

// Customer Pages
import { HomePage } from './pages/customer/HomePage';
import { StallPage } from './pages/customer/StallPage';
import { AllStallsPage } from './pages/customer/AllStallsPage';
import { SearchPage } from './pages/customer/SearchPage';
import { CartPage } from './pages/customer/CartPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage';
import { MyOrdersPage } from './pages/customer/MyOrdersPage';
import { QRScannerPage } from './pages/customer/QRScannerPage';
import { ParcelOrderPage } from './pages/customer/ParcelOrderPage';

// Admin & Staff Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OrdersManager } from './pages/admin/OrdersManager';
import { TableManager } from './pages/admin/TableManager';
import { QRCodesManager } from './pages/admin/QRCodesManager';
import { MenuManager } from './pages/admin/MenuManager';
import { KitchenDisplay } from './pages/admin/KitchenDisplay';
import { RunnerDashboard } from './pages/admin/RunnerDashboard';
import { StallDashboard } from './pages/admin/StallDashboard';
import { ReportsAnalytics } from './pages/admin/ReportsAnalytics';
import { AuditLogViewer } from './pages/admin/AuditLogViewer';
import { AccountingPage } from './pages/admin/AccountingPage';
import { InventoryManager } from './pages/admin/InventoryManager';

// Route handler for table scans /t/:tableId
const TableRouteHandler: React.FC = () => {
  const [, params] = useRoute<{ tableId: string }>('/t/:tableId');
  const { setTableId } = useTableSession();
  const { clearCart, clearCustomerDetails } = useCart();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (params && params.tableId) {
      const scannedTable = params.tableId.toUpperCase();
      // Scanning any table QR code (T01–T55) starts a fresh session with an empty cart
      clearCart();
      clearCustomerDetails();
      setTableId(scannedTable);
      // Cleanly transition to home page so that subsequent page refreshes during checkout preserve the active cart
      setLocation('/', { replace: true });
    }
  }, [params?.tableId, setTableId, clearCart, clearCustomerDetails, setLocation]);

  return <HomePage />;
};

const MainContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { tableId } = useTableSession();
  const [introKey, setIntroKey] = useState(0);
  const [splashFinished, setSplashFinished] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ connected: boolean; attempts: number }>({ connected: true, attempts: 0 });
  const [dismissConnectionWarning, setDismissConnectionWarning] = useState(false);

  // Global food ready reminder queue (FIFO) for independent multi-stall alarms
  const [reminderQueue, setReminderQueue] = useState<StallReadyConfirmedEvent[]>([]);
  const activeReadyReminder = reminderQueue[0] || null;
  const seenEventIds = React.useRef<Set<string>>(new Set());

  // Listen for real-time stall_ready_confirmed and connection status events
  React.useEffect(() => {
    const unsubConn = realtime.on('connection_status', (status: any) => {
      setConnectionStatus(status);
      if (status && status.connected) {
        setDismissConnectionWarning(false);
      }
    });
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('vivacity_played_notifications');
        if (stored) {
          const list: string[] = JSON.parse(stored);
          list.forEach(id => seenEventIds.current.add(id));
        }
      } catch {}
    }

    // Register Service Worker for push & lock-screen notifications
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.warn('Service Worker registration skipped or unsupported:', err);
      });
    }

    // Request Notification permission quietly if customer has active orders
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const askPermission = () => {
        Notification.requestPermission().catch(() => {});
      };
      window.addEventListener('click', askPermission, { once: true });
    }

    const unsub = realtime.on('stall_ready_confirmed', (evt: StallReadyConfirmedEvent) => {
      if (!evt || !evt.notificationEventId) return;
      if (seenEventIds.current.has(evt.notificationEventId)) return;

      // 1. Filter out staff on management, kitchen, and stall dashboard screens
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isStaffScreen =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/kitchen') ||
        pathname.includes('/dashboard');

      if (isStaffScreen) {
        return;
      }

      // 2. Only show alarm on guest phones if this order belongs to this customer/table
      let isForThisGuest = false;
      try {
        const storedOrders = JSON.parse(localStorage.getItem('vivacity_customer_orders') || '[]');
        if (Array.isArray(storedOrders) && (storedOrders.includes(evt.orderId) || storedOrders.includes(evt.token))) {
          isForThisGuest = true;
        }
      } catch {}

      if (!isForThisGuest && tableId && evt.tableId && tableId.toUpperCase() === evt.tableId.toUpperCase()) {
        isForThisGuest = true;
      }

      try {
        const localTable = localStorage.getItem('vivacity_table_id');
        if (!isForThisGuest && localTable && evt.tableId && localTable.toUpperCase() === evt.tableId.toUpperCase()) {
          isForThisGuest = true;
        }
      } catch {}

      const cleanPath = pathname.replace(/\/+$/, '');
      if (!isForThisGuest && (cleanPath === `/orders/${evt.orderId}` || cleanPath === `/orders/${evt.token}`)) {
        isForThisGuest = true;
      }

      // If this order has no association with this guest's phone, do not popup or alarm
      if (!isForThisGuest) {
        return;
      }

      // If document is hidden/backgrounded, trigger system/lock-screen Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const isTable = evt.serviceType === 'TABLE_SERVICE';
          const attemptPrefix = evt.attempt && evt.attempt > 1 ? `[Call #${evt.attempt}] ` : '';
          const notifTitle = `${attemptPrefix}Food Ready! ${evt.stallName} (Token #${evt.token})`;
          const notifBody = isTable
            ? `Your meal is ready! Our service staff is bringing it to ${evt.tableId || 'your table'}.`
            : `Your meal is ready! Please collect it from the ${evt.stallName} counter.`;

          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: notifTitle,
              options: {
                body: notifBody,
                icon: '/assets/vivacity-chili-icon.png',
                tag: `ready-${evt.notificationEventId}`,
                data: { url: `/orders/${evt.orderId}` }
              }
            });
          } else {
            new Notification(notifTitle, {
              body: notifBody,
              icon: '/assets/vivacity-chili-icon.png',
              tag: `ready-${evt.notificationEventId}`,
              requireInteraction: true
            });
          }
        } catch (e) {
          console.warn('System notification error:', e);
        }
      }

      seenEventIds.current.add(evt.notificationEventId);
      setReminderQueue(prev => {
        // If an existing reminder for this stall in this order is already in queue, update with new attempt
        const existingIdx = prev.findIndex(item => item.orderId === evt.orderId && item.stallId === evt.stallId);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = evt;
          return next;
        }
        return [...prev, evt];
      });
    });

    return () => {
      unsub();
      unsubConn();
    };
  }, []);

  const handleDismissReminder = () => {
    setReminderQueue(prev => prev.slice(1));
  };

  const isLocalHostClient = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const showDisconnectedWarning = !isLocalHostClient && !connectionStatus.connected && connectionStatus.attempts >= 2 && !dismissConnectionWarning;

  return (
    <div className="min-h-screen flex flex-col bg-surface text-charcoal font-sans selection:bg-brand-500 selection:text-white w-full overflow-x-hidden">
      {/* Full-screen Cinematic Brand Splash */}
      <BrandSplash
        key={introKey}
        forceShow={introKey > 0}
        onFinish={() => setSplashFinished(true)}
      />

      {/* Reconnecting / AP Isolation Warning Banner */}
      {showDisconnectedWarning && (
        <div className="bg-amber-500 text-zinc-950 px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-3 shadow-md z-50 sticky top-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-950" />
            <span>
              <strong>Connecting to Laptop Server...</strong> If your phone cannot load, the restaurant Wi-Fi may have <em>Client/AP Isolation</em> enabled. 
              <strong> Alternative:</strong> Turn on your phone's <strong>Personal Hotspot</strong> and connect your laptop to it.
            </span>
          </div>
          <button
            onClick={() => setDismissConnectionWarning(true)}
            className="text-xs px-2 py-0.5 rounded-lg bg-black/10 hover:bg-black/20 font-black cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Persistent Header & Menu Bar */}
      <Header onReplayIntro={() => {
        setSplashFinished(false);
        setIntroKey(prev => prev + 1);
      }} />

      {/* Main Routed Content */}
      <main className="w-full flex flex-col">
        <Switch>
          {/* Customer Dine-in & QR Routes */}
          <Route path="/" component={HomePage} />
          <Route path="/t/:tableId" component={TableRouteHandler} />
          <Route path="/stalls" component={AllStallsPage} />
          <Route path="/stall/:slug" component={StallPage} />
          <Route path="/search" component={SearchPage} />
          <Route path="/cart" component={CartPage} />
          <Route path="/checkout" component={CheckoutPage} />
          <Route path="/orders" component={MyOrdersPage} />
          <Route path="/orders/:id" component={OrderTrackingPage} />
          <Route path="/scan" component={QRScannerPage} />
          <Route path="/parcel" component={ParcelOrderPage} />

          {/* Admin & Operations Routes */}
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/accounting" component={AccountingPage} />
          <Route path="/admin/inventory" component={InventoryManager} />
          <Route path="/admin/orders" component={OrdersManager} />
          <Route path="/admin/tables" component={TableManager} />
          <Route path="/admin/qr-codes" component={QRCodesManager} />
          <Route path="/admin/menu" component={MenuManager} />
          <Route path="/admin/kitchen" component={KitchenDisplay} />
          <Route path="/kitchen" component={KitchenDisplay} />
          <Route path="/admin/runners" component={RunnerDashboard} />
          <Route path="/admin/reports" component={ReportsAnalytics} />
          <Route path="/admin/settlements" component={ReportsAnalytics} />
          <Route path="/admin/audit-log" component={AuditLogViewer} />
          <Route path="/stall/:slug/dashboard" component={StallDashboard} />

          {/* Fallback */}
          <Route component={HomePage} />
        </Switch>
      </main>

      {/* Global Branding Footer on Every Page Except Intro */}
      {splashFinished && (
        <GlobalFooter className="pb-20 md:pb-4" />
      )}

      {/* Customer Mobile Sticky Bottom Navigation */}
      <BottomNav />

      {/* Dedicated Full-Screen Food Ready Alarm Modal */}
      {activeReadyReminder && (
        <FoodReadyModal
          key={activeReadyReminder.notificationEventId}
          notification={activeReadyReminder}
          onDismiss={handleDismissReminder}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TableSessionProvider>
        <CartProvider>
          <MainContent />
        </CartProvider>
      </TableSessionProvider>
    </AuthProvider>
  );
};

export default App;
