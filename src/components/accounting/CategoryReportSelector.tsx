import React from 'react';
import { ShoppingBag, Receipt, ShoppingCart, Boxes, BarChart3, ChevronRight, Check, ShieldAlert } from 'lucide-react';

export type ReportCategoryKey = 'ORDER_SALES' | 'EXPENSE' | 'PURCHASE' | 'INVENTORY' | 'VOID';

export interface ReportDefinition {
  id: string;
  category: ReportCategoryKey;
  title: string;
  description: string;
  badge?: string;
}

export const REPORT_DEFINITIONS: Record<ReportCategoryKey, ReportDefinition[]> = {
  ORDER_SALES: [
    { id: 'top-selling', category: 'ORDER_SALES', title: 'Top-Selling Items', description: 'Best-performing foods, recipes, margins & volume' },
    { id: 'sales-summary', category: 'ORDER_SALES', title: 'Sales Summary', description: 'Gross vs net sales, taxes, collections & previous period trends' },
    { id: 'sales-details', category: 'ORDER_SALES', title: 'Sales Details', description: 'Transaction-level order register with unit prices & timestamps' },
    { id: 'sales-by-user', category: 'ORDER_SALES', title: 'Sales By User', description: 'Cashier & manager order handling, payments & discounts' },
    { id: 'order-type', category: 'ORDER_SALES', title: 'Order Type Summary', description: 'Dine-in vs takeaway, self-service vs table-service breakdown' },
    { id: 'stall-wise', category: 'ORDER_SALES', title: 'Stall-Wise Sales', description: 'All 7 culinary kitchen stalls, revenue share & 15% commissions' },
    { id: 'category-wise', category: 'ORDER_SALES', title: 'Category-Wise Sales', description: 'Burgers, momos, steaks, coffee & beverage category stats' },
    { id: 'hourly-sales', category: 'ORDER_SALES', title: 'Hourly Sales Report', description: 'Peak rush periods & slowest trading hours in Asia/Dhaka' },
    { id: 'payment-methods', category: 'ORDER_SALES', title: 'Payment Method Report', description: 'Cash, bKash, Nagad, Cards & NFC reconciliation' },
    { id: 'discounts-refunds', category: 'ORDER_SALES', title: 'Discounts, Refunds & Cancellations', description: 'Audit trail of promo discounts, refunds & cancelled tickets' }
  ],
  EXPENSE: [
    { id: 'exp-by-category', category: 'EXPENSE', title: 'Expense By Category', description: 'Utilities, labor, rent, supplies, maintenance breakdown' },
    { id: 'exp-by-supplier', category: 'EXPENSE', title: 'Expense By Supplier', description: 'Vendor & payee payments, balances and recent outlays' },
    { id: 'due-expenses', category: 'EXPENSE', title: 'Due Expenses', description: 'Unpaid bills, partial settlements & overdue obligations', badge: 'Actionable' },
    { id: 'exp-list', category: 'EXPENSE', title: 'Expense List', description: 'Complete chronological expense ledger & search' },
    { id: 'exp-summary', category: 'EXPENSE', title: 'Expense Summary', description: 'Aggregate burn rates, daily trends & category distribution' }
  ],
  PURCHASE: [
    { id: 'pur-order-list', category: 'PURCHASE', title: 'Purchase Order List', description: 'Draft, ordered, partially received & received PO register', badge: 'Workflow' },
    { id: 'pur-by-supplier', category: 'PURCHASE', title: 'Purchase By Supplier', description: 'Supplier accounts payable, invoice totals & outstanding dues' },
    { id: 'pur-item-details', category: 'PURCHASE', title: 'Purchase Item Details', description: 'Itemized ingredient receipts, unit costs & supplier invoices' },
    { id: 'pur-summary', category: 'PURCHASE', title: 'Purchase Summary', description: 'Total commitments, received goods value & vendor metrics' }
  ],
  INVENTORY: [
    { id: 'inv-valuation', category: 'INVENTORY', title: 'Inventory Valuation', description: 'Stock on hand financial valuation at unit cost' },
    { id: 'stock-summary', category: 'INVENTORY', title: 'Stock Summary', description: 'Real-time prepared, sold, reserved & available stock levels' },
    { id: 'stock-movements', category: 'INVENTORY', title: 'Stock Movement Ledger', description: 'Complete stock audit: In, Out, Consumption, Balance & Notes' },
    { id: 'stock-in', category: 'INVENTORY', title: 'Stock In Report', description: 'Goods received notes (GRN), PO deliveries & receipts' },
    { id: 'stock-out', category: 'INVENTORY', title: 'Stock Out Report', description: 'Kitchen issues, recipe consumption & production usage' },
    { id: 'low-stock', category: 'INVENTORY', title: 'Low Stock & Reorder', description: 'Critical stock breaches, suggested purchase quantities & lead times', badge: 'Alerts' },
    { id: 'wastage-report', category: 'INVENTORY', title: 'Wastage & Damage Report', description: 'Track kitchen spoilage, write-offs & financial loss value', badge: 'Losses' },
    { id: 'ingredient-consumption', category: 'INVENTORY', title: 'Ingredient Consumption (Recipe BOM)', description: 'Bill of Materials calculations from sold menu items' },
    { id: 'stock-adjustment', category: 'INVENTORY', title: 'Stock Adjustment Report', description: 'Physical count variances, count reconciliations & audit logs' },
    { id: 'inv-forecast', category: 'INVENTORY', title: 'Inventory Forecast', description: '7, 15, 30 & 60-day demand estimates based on burn rate' }
  ],
  VOID: [
    { id: 'void-summary', category: 'VOID', title: 'Void & Cancellation Reports', description: 'Real-time audit log of void requests, approvals, refunds & net sales loss (Manager Only)', badge: 'Manager Only' },
    { id: 'reset-history', category: 'VOID', title: 'Delete Report / Reset History', description: 'Audit log of order restarts, archived datasets & historical financial snapshots (Manager Only)', badge: 'Audit Trail' }
  ]
};

interface Props {
  selectedCategory: ReportCategoryKey | null;
  selectedReportId: string | null;
  onSelectCategory: (category: ReportCategoryKey | null) => void;
  onSelectReport: (reportId: string) => void;
}

export const CategoryReportSelector: React.FC<Props> = ({
  selectedCategory,
  selectedReportId,
  onSelectCategory,
  onSelectReport
}) => {
  const categories: Array<{
    key: ReportCategoryKey;
    label: string;
    sublabel: string;
    icon: any;
    color: string;
    activeBg: string;
    badgeCount: number;
  }> = [
    {
      key: 'ORDER_SALES',
      label: 'ORDER / SALES',
      sublabel: '10 Reports • Live Orders & Revenue',
      icon: ShoppingBag,
      color: 'text-brand-600',
      activeBg: 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 border-brand-600 ring-2 ring-brand-500/20',
      badgeCount: REPORT_DEFINITIONS.ORDER_SALES.length
    },
    {
      key: 'EXPENSE',
      label: 'EXPENSE',
      sublabel: '5 Reports • Operating Outlays',
      icon: Receipt,
      color: 'text-amber-600',
      activeBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 border-amber-600 ring-2 ring-amber-500/20',
      badgeCount: REPORT_DEFINITIONS.EXPENSE.length
    },
    {
      key: 'PURCHASE',
      label: 'PURCHASE',
      sublabel: '4 Reports • POs & Supplier Accounts',
      icon: ShoppingCart,
      color: 'text-blue-600',
      activeBg: 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 border-blue-700 ring-2 ring-blue-500/20',
      badgeCount: REPORT_DEFINITIONS.PURCHASE.length
    },
    {
      key: 'INVENTORY',
      label: 'INVENTORY',
      sublabel: '10 Reports • Stock, Recipes & Losses',
      icon: Boxes,
      color: 'text-emerald-600',
      activeBg: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 border-emerald-700 ring-2 ring-emerald-500/20',
      badgeCount: REPORT_DEFINITIONS.INVENTORY.length
    },
    {
      key: 'VOID',
      label: 'VOID & AUDIT',
      sublabel: '2 Reports • Voids & Reset History',
      icon: ShieldAlert,
      color: 'text-rose-600',
      activeBg: 'bg-rose-600 text-white shadow-lg shadow-rose-600/25 border-rose-700 ring-2 ring-rose-500/20',
      badgeCount: REPORT_DEFINITIONS.VOID.length
    }
  ];

  return (
    <div className="space-y-4">
      {/* PART 2: FIVE MAIN ROUNDED CATEGORY BUTTONS */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-zinc-200/90 shadow-2xs">
        <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 px-2 pb-2">
          Restaurant Reporting Suites • Select Category
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onSelectCategory(null); // toggle off
                  } else {
                    onSelectCategory(cat.key);
                    // auto-select first report in category if none chosen
                    const firstReport = REPORT_DEFINITIONS[cat.key][0];
                    if (firstReport) onSelectReport(firstReport.id);
                  }
                }}
                className={`relative group flex flex-col items-start text-left p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? cat.activeBg
                    : 'bg-zinc-50/80 hover:bg-white text-zinc-800 border-zinc-200/90 hover:border-zinc-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-white shadow-2xs text-zinc-700'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200/60 text-zinc-600'
                  }`}>
                    {cat.badgeCount}
                  </span>
                </div>
                <div className="font-black text-xs tracking-tight">{cat.label}</div>
                <div className={`text-[10px] mt-0.5 line-clamp-1 ${
                  isSelected ? 'text-white/80' : 'text-zinc-500'
                }`}>
                  {cat.sublabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-REPORT SELECTION PILLS / CARDS WHEN A CATEGORY IS ACTIVE */}
      {selectedCategory && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-900">
                {selectedCategory.replace('_', ' / ')} REPORTS
              </span>
              <span className="text-[10px] font-bold text-zinc-400">
                • {REPORT_DEFINITIONS[selectedCategory].length} available reports
              </span>
            </div>
            <button
              onClick={() => onSelectCategory(null)}
              className="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              Hide Report Shelf ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
            {REPORT_DEFINITIONS[selectedCategory].map(rep => {
              const isActive = selectedReportId === rep.id;
              return (
                <button
                  key={rep.id}
                  onClick={() => onSelectReport(rep.id)}
                  className={`flex flex-col items-start text-left p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-900/10'
                      : 'bg-zinc-50/70 hover:bg-zinc-100/70 text-zinc-800 border-zinc-200/80 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-black text-[11px] truncate">{rep.title}</span>
                    {rep.badge && (
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-brand-50 text-brand-600 border border-brand-200'
                      }`}>
                        {rep.badge}
                      </span>
                    )}
                  </div>
                  <p className={`text-[10px] mt-1 line-clamp-2 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {rep.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
