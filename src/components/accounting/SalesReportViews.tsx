import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  TopSellingItem,
  SalesSummaryReport,
  SalesDetailTransaction,
  SalesByUserItem,
  OrderTypeSummaryItem,
  StallWiseSaleItem,
  CategoryWiseSaleItem,
  HourlySaleItem,
  PaymentMethodItem
} from '../../types';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface Props {
  reportId: string;
  dateFrom: string;
  dateTo: string;
  onOpenOrderModal?: (orderId: string) => void;
}

export const SalesReportViews: React.FC<Props> = ({ reportId, dateFrom, dateTo, onOpenOrderModal }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [stallId, setStallId] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('quantity');
  const [page, setPage] = useState(1);

  const userContext = { name: currentUser.name, role: currentUser.role, stallId: currentUser.stallId || null };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { dateFrom, dateTo, stallId, search };
      if (reportId === 'top-selling') {
        params.category = categoryFilter;
        params.sortBy = sortBy;
        const res = await api.getTopSellingItems(params, userContext);
        setData(res);
      } else if (reportId === 'sales-summary') {
        const res = await api.getSalesSummary(params, userContext);
        setData(res);
      } else if (reportId === 'sales-details') {
        params.page = page;
        params.limit = 50;
        const res = await api.getSalesDetails(params, userContext);
        setData(res);
      } else if (reportId === 'sales-by-user') {
        const res = await api.getSalesByUser(params, userContext);
        setData(res);
      } else if (reportId === 'order-type') {
        const res = await api.getOrderTypeSummary(params, userContext);
        setData(res);
      } else if (reportId === 'stall-wise') {
        const res = await api.getStallWiseSales(params, userContext);
        setData(res);
      } else if (reportId === 'category-wise') {
        const res = await api.getCategoryWiseSales(params, userContext);
        setData(res);
      } else if (reportId === 'hourly-sales') {
        const res = await api.getHourlySales(params, userContext);
        setData(res);
      } else if (reportId === 'payment-methods') {
        const res = await api.getPaymentMethodReport(params, userContext);
        setData(res);
      } else if (reportId === 'discounts-refunds') {
        const res = await api.getDiscountsRefundsReport(params, userContext);
        setData(res);
      }
    } catch (e) {
      console.error('Error fetching sales report:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [reportId, dateFrom, dateTo, stallId, categoryFilter, sortBy, page]);

  const exportCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
    rows.forEach(r => {
      csvContent += r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}-${dateFrom}-to-${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = (title: string, headers: string[], rows: (string | number)[][], summary?: { label: string; value: string }[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const summaryHtml = summary && summary.length > 0 ? `
      <div style="display:flex;gap:20px;margin-bottom:14px;padding:10px;background:#f8f9fa;border-radius:6px;border:1px solid #e9ecef;">
        ${summary.map(s => `<div><span style="font-size:10px;color:#6c757d;text-transform:uppercase;font-weight:bold;">${s.label}: </span><strong style="font-size:13px;color:#212529;">${s.value}</strong></div>`).join('')}
      </div>` : '';

    const tableHeaders = headers.map(h => `<th style="padding:6px 10px;border:1px solid #dee2e6;background:#f1f3f5;font-size:10px;text-transform:uppercase;font-weight:bold;text-align:left;">${h}</th>`).join('');
    const tableRows = rows.map((r, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fcfcfc'};">
        ${r.map(cell => `<td style="padding:6px 10px;border:1px solid #dee2e6;font-size:11px;color:#212529;">${cell ?? '-'}</td>`).join('')}
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - Vivacity Food Court</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 12px; color: #212529; }
            .header { border-bottom: 2px solid #212529; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 18px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
            .subtitle { font-size: 11px; color: #495057; margin-top: 4px; }
            .meta { font-size: 10px; color: #6c757d; margin-top: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">VIVACITY FOOD COURT</h1>
            <div class="subtitle"><strong>${title}</strong></div>
            <div class="meta">Date Period: <strong>${dateFrom}</strong> to <strong>${dateTo}</strong> &bull; Generated: <strong>${new Date().toLocaleString()}</strong></div>
          </div>
          ${summaryHtml}
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/90 shadow-2xs space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
        <p className="font-bold text-zinc-500 text-xs">Querying actual transactional records...</p>
      </div>
    );
  }

  // ========================================================
  // A. TOP-SELLING ITEMS
  // ========================================================
  if (reportId === 'top-selling') {
    const items: TopSellingItem[] = data?.items || [];
    const handleExport = () => {
      exportCSV(
        'Vivacity-Top-Selling-Items',
        ['Item Name', 'Stall', 'Category', 'Quantity Sold', 'Gross Sales (BDT)', 'Discounts (BDT)', 'Net Sales (BDT)', 'Recipe COGS', 'Gross Profit (BDT)', 'Margin (%)', '% Contribution'],
        items.map(i => [
          i.name,
          i.stallName,
          i.category,
          i.quantitySold,
          i.grossSales,
          i.discounts,
          i.netSales,
          i.hasRecipe ? i.totalCost || 0 : 'Recipe Not Configured',
          i.hasRecipe ? i.grossProfit || 0 : 'Recipe Not Configured',
          i.hasRecipe ? `${i.profitMargin}%` : '-',
          `${i.contributionPercent}%`
        ])
      );
    };

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Top-Selling Food &amp; Beverage Items</h2>
            <p className="text-[11px] text-zinc-500">
              Quantity sold, gross/net revenue, recipe food cost &amp; percentage contribution
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="p-2 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50"
            >
              <option value="quantity">Sort by Qty Sold</option>
              <option value="revenue">Sort by Revenue</option>
              <option value="profit">Sort by Gross Profit</option>
              <option value="margin">Sort by Profit Margin</option>
            </select>

            <select
              value={stallId}
              onChange={e => setStallId(e.target.value)}
              className="p-2 border border-zinc-200 rounded-xl text-xs font-bold bg-zinc-50"
            >
              <option value="ALL">All Stalls</option>
              <option value="fusion-cafe">Coffee Buzz Fusion Cafe</option>
              <option value="top-town">Top Town</option>
              <option value="momo-buzz">Momo Buzz</option>
              <option value="waffle-city">Waffle City</option>
              <option value="live-station">Live Station</option>
              <option value="burger-bar">Burger Bar</option>
              <option value="drinks">Drinks &amp; Beverage</option>
            </select>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => printReport(
                'Top-Selling Food & Beverage Items',
                ['Item Name', 'Stall', 'Category', 'Qty Sold', 'Gross Sales', 'Discounts', 'Net Sales', 'COGS', 'Gross Profit', '% Share'],
                items.map(i => [
                  i.name,
                  i.stallName,
                  i.category,
                  i.quantitySold,
                  `৳${Number(i.grossSales || 0).toLocaleString()}`,
                  `৳${Number(i.discounts || 0).toLocaleString()}`,
                  `৳${Number(i.netSales || 0).toLocaleString()}`,
                  i.hasRecipe ? `৳${Number(i.totalCost || 0).toLocaleString()}` : 'No Recipe',
                  i.hasRecipe ? `৳${Number(i.grossProfit || 0).toLocaleString()}` : 'No Recipe',
                  `${i.contributionPercent}%`
                ])
              )}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Item Details</th>
                <th className="p-3">Stall &amp; Category</th>
                <th className="p-3 text-right">Qty Sold</th>
                <th className="p-3 text-right">Avg Price</th>
                <th className="p-3 text-right">Gross Sales</th>
                <th className="p-3 text-right">Net Sales</th>
                <th className="p-3 text-right">Recipe COGS</th>
                <th className="p-3 text-right">Gross Profit</th>
                <th className="p-3 text-right">% Sales Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">
                    No confirmed sales recorded for this filter range.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.itemId} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-bold text-zinc-400">{idx + 1}</td>
                    <td className="p-3 font-black text-zinc-900">
                      <div>{item.name}</div>
                      <span className="text-[10px] text-zinc-400 font-mono">{item.itemId}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-800">{item.stallName}</div>
                      <span className="text-[10px] text-zinc-400">{item.category}</span>
                    </td>
                    <td className="p-3 text-right font-black text-brand-600">
                      {item.quantitySold} <span className="text-[10px] font-normal text-zinc-400">{item.unit}s</span>
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-700">৳{item.avgSellingPrice}</td>
                    <td className="p-3 text-right font-bold text-zinc-500">৳{item.grossSales.toLocaleString()}</td>
                    <td className="p-3 text-right font-black text-emerald-600">৳{item.netSales.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold text-zinc-600">
                      {item.hasRecipe ? `৳${item.totalCost?.toLocaleString()}` : (
                        <span className="text-[10px] text-zinc-400 italic">Recipe Not Configured</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-black">
                      {item.hasRecipe ? (
                        <span className="text-emerald-700">
                          ৳{item.grossProfit?.toLocaleString()} ({item.profitMargin}%)
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-400 italic">Recipe Not Configured</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-600">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200">
                        {item.contributionPercent}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // B. SALES SUMMARY
  // ========================================================
  if (reportId === 'sales-summary') {
    const s: SalesSummaryReport = data;
    return (
      <div className="space-y-4">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-zinc-200/90 shadow-2xs">
          <div>
            <h2 className="text-base font-black text-zinc-900">Executive Sales Summary</h2>
            <p className="text-[11px] text-zinc-500">Gross sales, net revenue, taxes, actual collections &amp; spend metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCSV('Vivacity-Sales-Summary', ['Metric', 'Value'], [
                ['Total Orders', s?.totalOrders || 0],
                ['Completed Orders', s?.completedOrders || 0],
                ['Cancelled Orders', s?.cancelledOrders || 0],
                ['Total Quantity Sold', s?.totalQuantitySold || 0],
                ['Gross Item Sales (BDT)', s?.grossItemSales || 0],
                ['Total Discounts (BDT)', s?.totalDiscounts || 0],
                ['Net Sales (BDT)', s?.netSales || 0],
                ['VAT Tax (BDT)', s?.vatTaxCollected || 0],
                ['Service Charges (BDT)', s?.serviceChargesCollected || 0],
                ['Total Collections (BDT)', s?.totalCollections || 0],
                ['Average Order Value (BDT)', s?.averageOrderValue || 0]
              ])}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Executive Sales Summary', ['KPI Metric', 'Value'], [
                ['Total Orders', s?.totalOrders || 0],
                ['Completed Orders', s?.completedOrders || 0],
                ['Cancelled Orders', s?.cancelledOrders || 0],
                ['Total Portions / Food Items Sold', s?.totalQuantitySold || 0],
                ['Gross Item Sales', `৳${Number(s?.grossItemSales || 0).toLocaleString()}`],
                ['Total Customer Discounts', `৳${Number(s?.totalDiscounts || 0).toLocaleString()}`],
                ['Net Sales', `৳${Number(s?.netSales || 0).toLocaleString()}`],
                ['VAT / Mushak Tax', `৳${Number(s?.vatTaxCollected || 0).toLocaleString()}`],
                ['Service Charges', `৳${Number(s?.serviceChargesCollected || 0).toLocaleString()}`],
                ['Total Actual Collections', `৳${Number(s?.totalCollections || 0).toLocaleString()}`],
                ['Average Ticket / Order Value', `৳${Number(s?.averageOrderValue || 0).toLocaleString()}`]
              ], [
                { label: 'Net Sales', value: `৳${Number(s?.netSales || 0).toLocaleString()}` },
                { label: 'Total Collections', value: `৳${Number(s?.totalCollections || 0).toLocaleString()}` }
              ])}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Total Orders</span>
            <div className="text-xl font-black text-zinc-900">{s?.totalOrders || 0}</div>
            <p className="text-[10px] text-zinc-500">{s?.completedOrders || 0} completed</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Food Items Sold</span>
            <div className="text-xl font-black text-brand-600">{s?.totalQuantitySold || 0}</div>
            <p className="text-[10px] text-zinc-500">Total portions served</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Gross Sales</span>
            <div className="text-xl font-black text-zinc-800">৳{(s?.grossItemSales || 0).toLocaleString()}</div>
            <p className="text-[10px] text-rose-500">-৳{(s?.totalDiscounts || 0)} discounts</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Net Sales</span>
            <div className="text-xl font-black text-emerald-600">৳{(s?.netSales || 0).toLocaleString()}</div>
            <p className="text-[10px] text-zinc-500">After discounts/refunds</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Actual Collections</span>
            <div className="text-xl font-black text-zinc-900">৳{(s?.totalCollections || 0).toLocaleString()}</div>
            <p className="text-[10px] text-emerald-600">Settled &amp; confirmed</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Avg Order Value</span>
            <div className="text-xl font-black text-blue-600">৳{s?.averageOrderValue || 0}</div>
            <p className="text-[10px] text-zinc-500">Per ticket spend</p>
          </div>
        </div>

        {/* Comparison Banner */}
        {s?.comparison && (
          <div className="bg-zinc-900 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="font-bold">Prior Equivalent Period Comparison ({s.comparison.prevDateFrom} to {s.comparison.prevDateTo}):</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Prior Revenue: <strong>৳{s.comparison.prevRevenue.toLocaleString()}</strong></span>
              {s.comparison.revenueChange !== null && (
                <span className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                  s.comparison.revenueChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {s.comparison.revenueChange >= 0 ? '+' : ''}{s.comparison.revenueChange}% Revenue
                </span>
              )}
            </div>
          </div>
        )}

        {/* Collections Breakdown by Payment Method */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800">
            Payment Method Collections Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {Object.entries(s?.paymentMethods || {}).map(([method, amount]) => (
              <div key={method} className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                <span className="text-[10px] font-bold text-zinc-400 uppercase block">{method}</span>
                <span className="text-base font-black text-zinc-900">৳{amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // C. SALES DETAILS (Transaction Register)
  // ========================================================
  if (reportId === 'sales-details') {
    const txns: SalesDetailTransaction[] = data?.transactions || [];
    const totalCount = data?.totalCount || 0;
    const totalPages = data?.totalPages || 1;

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Sales Details Register</h2>
            <p className="text-[11px] text-zinc-500">
              Transaction-level order lines preserving historical menu prices ({totalCount} total items)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search token, guest, item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs"
              />
            </div>
            <button
              onClick={() => {
                exportCSV('Vivacity-Sales-Details', ['Invoice', 'Token', 'Date', 'Time', 'Guest', 'Table', 'Stall', 'Item', 'Qty', 'Unit Price', 'Total', 'Payment Method', 'Status', 'Cashier'],
                  txns.map(t => [t.invoiceNo, t.token, t.date, t.time, t.guestName, t.tableNumber, t.stallName, t.itemName, t.quantity, t.unitPrice, t.totalAmount, t.paymentMethod, t.paymentStatus, t.cashier])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => {
                printReport('Sales Details Register', ['Invoice', 'Token', 'Date/Time', 'Guest/Table', 'Stall/Item', 'Qty', 'Unit Price', 'Total', 'Payment', 'Cashier'],
                  txns.map(t => [t.invoiceNo, t.token, `${t.date} ${t.time}`, `${t.guestName} (${t.tableNumber})`, `${t.stallName} - ${t.itemName}`, t.quantity, `৳${t.unitPrice}`, `৳${Number(t.totalAmount || 0).toLocaleString()}`, t.paymentMethod, t.cashier]),
                  [{ label: 'Total Records', value: `${totalCount}` }]
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Invoice &amp; Token</th>
                <th className="p-3">Date &amp; Time</th>
                <th className="p-3">Customer &amp; Table</th>
                <th className="p-3">Stall &amp; Item</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Line Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Cashier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {txns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-zinc-400">No transactions found for filter criteria.</td>
                </tr>
              ) : (
                txns.map(t => (
                  <tr key={`${t.orderId}-${t.itemId}`} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono font-bold">
                      <span className="text-zinc-900">#{t.token}</span>
                      <div className="text-[10px] text-zinc-400">INV-{t.invoiceNo}</div>
                    </td>
                    <td className="p-3">
                      <div>{t.date}</div>
                      <div className="text-[10px] text-zinc-400">{t.time}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-800">{t.guestName}</div>
                      <span className="text-[10px] text-zinc-500">{t.tableNumber} • {t.orderType}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-900">{t.itemName}</div>
                      <span className="text-[10px] text-brand-600">{t.stallName}</span>
                    </td>
                    <td className="p-3 text-right font-black">{t.quantity}</td>
                    <td className="p-3 text-right">৳{t.unitPrice}</td>
                    <td className="p-3 text-right font-black text-emerald-600">৳{t.totalAmount}</td>
                    <td className="p-3 font-bold text-zinc-700">{t.paymentMethod}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3 text-[11px] text-zinc-500">{t.cashier}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs">
          <span className="text-zinc-500">Showing page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // G. STALL-WISE SALES (All 7 Stalls)
  // ========================================================
  if (reportId === 'stall-wise') {
    const stalls: StallWiseSaleItem[] = data || [];
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Stall-Wise Sales &amp; Settlement Performance</h2>
            <p className="text-[11px] text-zinc-500">
              All 7 food hall kitchens, standard 15% management commission &amp; net merchant payouts
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCSV('Vivacity-Stall-Sales', ['Stall', 'Orders', 'Qty Sold', 'Gross Sales', 'Discounts', 'Net Sales', 'Commission (15%)', 'Net Merchant Payout', 'Best Selling Item'],
                stalls.map(s => [s.stallName, s.orderCount, s.quantitySold, s.grossSales, s.discounts, s.netSales, s.managementCommission, s.merchantPayout, s.bestSellingItem])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Stall-Wise Sales & Settlement Performance', ['Stall Name', 'Orders', 'Qty Sold', 'Gross Sales', 'Discounts', 'Net Sales', 'Commission (15%)', 'Merchant Payout', 'Best Seller'],
                stalls.map(s => [s.stallName, s.orderCount, s.quantitySold, `৳${Number(s.grossSales || 0).toLocaleString()}`, `৳${Number(s.discounts || 0).toLocaleString()}`, `৳${Number(s.netSales || 0).toLocaleString()}`, `৳${Number(s.managementCommission || 0).toLocaleString()}`, `৳${Number(s.merchantPayout || 0).toLocaleString()}`, s.bestSellingItem]),
                [
                  { label: 'Total Net Sales', value: `৳${stalls.reduce((sum: number, s) => sum + (s.netSales || 0), 0).toLocaleString()}` },
                  { label: 'Food Court Commission (15%)', value: `৳${stalls.reduce((sum: number, s) => sum + (s.managementCommission || 0), 0).toLocaleString()}` }
                ]
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Culinary Stall</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Qty Sold</th>
                <th className="p-3 text-right">Gross Sales</th>
                <th className="p-3 text-right">Discounts</th>
                <th className="p-3 text-right">Net Sales</th>
                <th className="p-3 text-right">Commission (15%)</th>
                <th className="p-3 text-right">Merchant Payout</th>
                <th className="p-3">Best-Selling Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stalls.map(s => (
                <tr key={s.stallId} className="hover:bg-zinc-50/70">
                  <td className="p-3 font-black text-zinc-900">
                    <div>{s.stallName}</div>
                    <span className="text-[10px] text-zinc-400 font-bold">{s.badge}</span>
                  </td>
                  <td className="p-3 text-right font-bold">{s.orderCount}</td>
                  <td className="p-3 text-right font-bold text-brand-600">{s.quantitySold}</td>
                  <td className="p-3 text-right text-zinc-500">৳{s.grossSales.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-500">-৳{s.discounts}</td>
                  <td className="p-3 text-right font-black text-zinc-900">৳{s.netSales.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold text-brand-600">৳{s.managementCommission.toLocaleString()}</td>
                  <td className="p-3 text-right font-black text-emerald-600">৳{s.merchantPayout.toLocaleString()}</td>
                  <td className="p-3 font-bold text-zinc-700">{s.bestSellingItem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // I. HOURLY SALES REPORT
  // ========================================================
  if (reportId === 'hourly-sales') {
    const hours: HourlySaleItem[] = data?.hours || [];
    const peak = data?.peakSalesHour;
    const slowest = data?.slowestBusinessHour;

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Hourly Trading Curve &amp; Peak Hour Analysis</h2>
            <p className="text-[11px] text-zinc-500">
              24-hour business day performance tracked in Asia/Dhaka standard time
            </p>
          </div>
        </div>

        {/* Peak & Slowest Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-700">Peak Rush Period</span>
              <div className="text-lg font-black text-emerald-900">{peak?.label || 'N/A'}</div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-700">৳{(peak?.sales || 0).toLocaleString()}</span>
              <div className="text-[10px] text-emerald-600 font-bold">{peak?.orders || 0} orders</div>
            </div>
          </div>

          <div className="bg-zinc-100 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500">Slowest Service Hour</span>
              <div className="text-lg font-black text-zinc-800">{slowest?.label || 'N/A'}</div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-zinc-700">৳{(slowest?.sales || 0).toLocaleString()}</span>
              <div className="text-[10px] text-zinc-500 font-bold">{slowest?.orders || 0} orders</div>
            </div>
          </div>
        </div>

        {/* Hourly Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Time Window</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Items Sold</th>
                <th className="p-3 text-right">Sales Collected</th>
                <th className="p-3 text-right">Average Ticket Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {hours.map(h => (
                <tr key={h.hour} className={h.sales > 0 ? 'bg-white hover:bg-zinc-50/70' : 'text-zinc-400'}>
                  <td className="p-3 font-mono font-bold">{h.label}</td>
                  <td className="p-3 text-right font-bold">{h.orders}</td>
                  <td className="p-3 text-right">{h.itemsSold}</td>
                  <td className="p-3 text-right font-black text-zinc-900">৳{h.sales.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">৳{h.averageOrderValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // D. SALES BY USER
  // ========================================================
  if (reportId === 'sales-by-user') {
    const users: any[] = Array.isArray(data) ? data : [];
    const totalSales = users.reduce((s, u) => s + u.salesProcessed, 0);
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Sales By User / Cashier</h2>
            <p className="text-[11px] text-zinc-500">Employee-wise order handling, payment confirmations, discounts & refunds</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportCSV('Vivacity-Sales-By-User', ['User Name', 'Role', 'Orders Handled', 'Sales Processed (BDT)', 'Payments Confirmed', 'Discounts', 'Refunds', 'Cancelled', 'Avg Transaction (BDT)'],
                users.map(u => [u.userName, u.role, u.ordersHandled, u.salesProcessed, u.paymentsConfirmed, u.discountsAuthorized, u.refundsProcessed, u.cancelledOrders, u.averageTransactionValue])
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => printReport('Sales By User / Cashier', ['User Name', 'Role', 'Orders Handled', 'Sales Processed', 'Payments Confirmed', 'Discounts', 'Refunds', 'Cancelled', 'Avg Ticket'],
                users.map(u => [u.userName, u.role, u.ordersHandled, `৳${Number(u.salesProcessed || 0).toLocaleString()}`, u.paymentsConfirmed, `৳${Number(u.discountsAuthorized || 0).toLocaleString()}`, `৳${Number(u.refundsProcessed || 0).toLocaleString()}`, u.cancelledOrders, `৳${Number(u.averageTransactionValue || 0).toLocaleString()}`]),
                [
                  { label: 'Active Cashiers', value: `${users.length}` },
                  { label: 'Total Sales Processed', value: `৳${totalSales.toLocaleString()}` }
                ]
              )}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-black uppercase text-brand-700">Total Staff</div>
            <div className="text-xl font-black text-brand-900 mt-0.5">{users.length}</div>
            <div className="text-[10px] text-brand-600">Active cashiers</div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-black uppercase text-emerald-700">Total Sales Processed</div>
            <div className="text-xl font-black text-emerald-900 mt-0.5">৳{totalSales.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-600">Combined collections</div>
          </div>
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-black uppercase text-zinc-700">Total Orders</div>
            <div className="text-xl font-black text-zinc-900 mt-0.5">{users.reduce((s, u) => s + u.ordersHandled, 0)}</div>
            <div className="text-[10px] text-zinc-500">Handled by all staff</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
            <div className="text-[10px] font-black uppercase text-rose-700">Total Refunds</div>
            <div className="text-xl font-black text-rose-900 mt-0.5">{users.reduce((s, u) => s + u.refundsProcessed, 0)}</div>
            <div className="text-[10px] text-rose-600">Processed by staff</div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">User Name</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Sales (৳)</th>
                <th className="p-3 text-right">Payments</th>
                <th className="p-3 text-right">Discounts</th>
                <th className="p-3 text-right">Refunds</th>
                <th className="p-3 text-right">Cancelled</th>
                <th className="p-3 text-right">Avg Ticket</th>
                <th className="p-3 text-right">Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-zinc-400">No staff sales records found for this period.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.userName} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-black text-zinc-900">{u.userName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">{u.role}</span>
                    </td>
                    <td className="p-3 text-right font-black text-brand-600">{u.ordersHandled}</td>
                    <td className="p-3 text-right font-black text-emerald-700">৳{u.salesProcessed.toLocaleString()}</td>
                    <td className="p-3 text-right font-bold">{u.paymentsConfirmed}</td>
                    <td className="p-3 text-right font-bold text-amber-600">{u.discountsAuthorized}</td>
                    <td className="p-3 text-right font-bold text-rose-600">{u.refundsProcessed}</td>
                    <td className="p-3 text-right font-bold text-zinc-500">{u.cancelledOrders}</td>
                    <td className="p-3 text-right font-bold text-zinc-700">৳{u.averageTransactionValue.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 font-bold">
                        {totalSales > 0 ? Math.round((u.salesProcessed / totalSales) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // E. ORDER TYPE SUMMARY
  // ========================================================
  if (reportId === 'order-type') {
    const rows: any[] = Array.isArray(data) ? data : [];
    const dineIn = rows.find(r => r.key === 'DINE_IN');
    const takeaway = rows.find(r => r.key === 'TAKEAWAY');
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Order Type Summary</h2>
            <p className="text-[11px] text-zinc-500">Dine-in vs Takeaway and Self-service vs Table-service breakdown</p>
          </div>
          <button
            onClick={() => exportCSV('Vivacity-Order-Type', ['Type', 'Orders', 'Qty Sold', 'Gross Sales', 'Discounts', 'Refunds', 'Net Sales', 'Avg Order Value'],
              rows.map(r => [r.name, r.count, r.quantity, r.gross, r.discount, r.refund, r.net, r.averageOrderValue])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Dine-in vs Takeaway visual comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[dineIn, takeaway].filter(Boolean).map(r => (
            <div key={r.key} className={`rounded-2xl p-4 border ${r.key === 'DINE_IN' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`text-[10px] font-black uppercase mb-1 ${r.key === 'DINE_IN' ? 'text-blue-700' : 'text-amber-700'}`}>{r.name}</div>
              <div className={`text-2xl font-black ${r.key === 'DINE_IN' ? 'text-blue-900' : 'text-amber-900'}`}>{r.count} orders</div>
              <div className="text-xs font-bold text-zinc-700 mt-1">৳{r.net.toLocaleString()} net sales</div>
              <div className="text-[10px] text-zinc-500">{r.quantity} items • Avg ৳{r.averageOrderValue}</div>
              <div className="mt-2 flex gap-2 flex-wrap text-[10px]">
                {Object.entries(r.payments || {}).filter(([, v]) => (v as number) > 0).map(([method, amount]) => (
                  <span key={method} className="bg-white/70 border border-zinc-200 rounded-lg px-2 py-0.5 font-bold">{method}: ৳{(amount as number).toLocaleString()}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Full table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Order Type</th>
                <th className="p-3 text-right">Orders</th>
                <th className="p-3 text-right">Items Sold</th>
                <th className="p-3 text-right">Gross Sales</th>
                <th className="p-3 text-right">Discounts</th>
                <th className="p-3 text-right">Refunds</th>
                <th className="p-3 text-right">Net Sales</th>
                <th className="p-3 text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map(r => (
                <tr key={r.key} className={`hover:bg-zinc-50/70 ${r.count === 0 ? 'text-zinc-400' : ''}`}>
                  <td className="p-3 font-black text-zinc-900">{r.name}</td>
                  <td className="p-3 text-right font-bold text-brand-600">{r.count}</td>
                  <td className="p-3 text-right font-bold">{r.quantity}</td>
                  <td className="p-3 text-right font-bold text-zinc-600">৳{r.gross.toLocaleString()}</td>
                  <td className="p-3 text-right text-rose-500">-৳{r.discount}</td>
                  <td className="p-3 text-right text-rose-500">-৳{r.refund}</td>
                  <td className="p-3 text-right font-black text-emerald-700">৳{r.net.toLocaleString()}</td>
                  <td className="p-3 text-right font-bold">৳{r.averageOrderValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // H. CATEGORY-WISE SALES
  // ========================================================
  if (reportId === 'category-wise') {
    const cats: any[] = Array.isArray(data) ? data : [];
    const totalNet = cats.reduce((s, c) => s + c.netSales, 0);
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Category-Wise Sales Performance</h2>
            <p className="text-[11px] text-zinc-500">Sales revenue, quantity and percentage contribution by food category</p>
          </div>
          <button
            onClick={() => exportCSV('Vivacity-Category-Sales', ['Category', 'Qty Sold', 'Gross Sales (BDT)', 'Discounts', 'Net Sales (BDT)', '% of Total'],
              cats.map(c => [c.category, c.quantitySold, c.grossSales, c.discounts, c.netSales, `${c.percentage}%`])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Food Category</th>
                <th className="p-3 text-right">Qty Sold</th>
                <th className="p-3 text-right">Gross Sales</th>
                <th className="p-3 text-right">Discounts</th>
                <th className="p-3 text-right">Net Sales</th>
                <th className="p-3">% Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {cats.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-400">No category sales recorded for this period.</td></tr>
              ) : (
                cats.map((c, idx) => {
                  const barW = totalNet > 0 ? Math.round((c.netSales / totalNet) * 100) : 0;
                  return (
                    <tr key={c.category} className="hover:bg-zinc-50/70">
                      <td className="p-3 font-bold text-zinc-400">{idx + 1}</td>
                      <td className="p-3 font-black text-zinc-900">{c.category}</td>
                      <td className="p-3 text-right font-black text-brand-600">{c.quantitySold}</td>
                      <td className="p-3 text-right text-zinc-500">৳{c.grossSales.toLocaleString()}</td>
                      <td className="p-3 text-right text-rose-500">{c.discounts > 0 ? `-৳${c.discounts}` : '—'}</td>
                      <td className="p-3 text-right font-black text-emerald-700">৳{c.netSales.toLocaleString()}</td>
                      <td className="p-3 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-zinc-200 rounded-full h-2 overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{ width: `${barW}%` }} />
                          </div>
                          <span className="font-black text-zinc-700 text-[10px] w-10 text-right">{c.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {cats.length > 0 && (
              <tfoot className="bg-zinc-100 font-black text-zinc-900 text-xs border-t-2 border-zinc-300">
                <tr>
                  <td className="p-3" colSpan={2}>TOTAL</td>
                  <td className="p-3 text-right">{cats.reduce((s, c) => s + c.quantitySold, 0)}</td>
                  <td className="p-3 text-right">৳{cats.reduce((s, c) => s + c.grossSales, 0).toLocaleString()}</td>
                  <td className="p-3 text-right">-৳{cats.reduce((s, c) => s + c.discounts, 0)}</td>
                  <td className="p-3 text-right text-emerald-700">৳{totalNet.toLocaleString()}</td>
                  <td className="p-3 text-right">100%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // K. PAYMENT METHOD REPORT
  // ========================================================
  if (reportId === 'payment-methods') {
    const methods: any[] = data?.methods || [];
    const total = data?.totalCollections || 0;
    const methodColors: Record<string, string> = {
      CASH: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      bKash: 'bg-pink-100 text-pink-800 border-pink-200',
      Nagad: 'bg-orange-100 text-orange-800 border-orange-200',
      'Online Card': 'bg-blue-100 text-blue-800 border-blue-200',
      'NFC / Contactless': 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900">Payment Method Report & Reconciliation</h2>
            <p className="text-[11px] text-zinc-500">Cash, bKash, Nagad, Card and NFC collections audit with pending reconciliation</p>
          </div>
          <button
            onClick={() => exportCSV('Vivacity-Payment-Methods', ['Payment Method', 'Transactions', 'Collections (BDT)', 'Pending', 'Refunds', 'Net Collected (BDT)', '% Share'],
              methods.map(m => [m.name, m.transactions, m.successfulCollections, m.pendingAmount, m.refunds, m.netCollected, `${m.percentage}%`])
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Total collected banner */}
        <div className="bg-zinc-900 text-white rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-zinc-400">Total Net Collections</div>
            <div className="text-2xl font-black mt-0.5">৳{total.toLocaleString()}</div>
          </div>
          <div className="text-right text-[11px] text-zinc-400">{methods.filter(m => m.transactions > 0).length} payment methods used</div>
        </div>

        {/* Method cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {methods.map(m => (
            <div key={m.key} className={`rounded-2xl p-3.5 border text-xs ${methodColors[m.key] || 'bg-zinc-50 border-zinc-200 text-zinc-800'}`}>
              <div className="text-[10px] font-black uppercase mb-1 opacity-70">{m.name}</div>
              <div className="text-lg font-black">৳{m.netCollected.toLocaleString()}</div>
              <div className="text-[10px] mt-1 opacity-80">{m.transactions} txn{m.transactions !== 1 ? 's' : ''} • {m.percentage}%</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Payment Method</th>
                <th className="p-3 text-right">Transactions</th>
                <th className="p-3 text-right">Gross Collections</th>
                <th className="p-3 text-right">Pending</th>
                <th className="p-3 text-right">Failed</th>
                <th className="p-3 text-right">Refunds</th>
                <th className="p-3 text-right">Net Collected</th>
                <th className="p-3 text-right">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {methods.map(m => (
                <tr key={m.key} className={`hover:bg-zinc-50/70 ${m.transactions === 0 ? 'text-zinc-400' : ''}`}>
                  <td className="p-3 font-black text-zinc-900">{m.name}</td>
                  <td className="p-3 text-right font-bold">{m.transactions}</td>
                  <td className="p-3 text-right font-bold text-zinc-700">৳{m.successfulCollections.toLocaleString()}</td>
                  <td className="p-3 text-right text-amber-600">{m.pendingAmount > 0 ? `৳${m.pendingAmount}` : '—'}</td>
                  <td className="p-3 text-right text-rose-500">{m.failedAmount > 0 ? `৳${m.failedAmount}` : '—'}</td>
                  <td className="p-3 text-right text-rose-500">{m.refunds > 0 ? `-৳${m.refunds}` : '—'}</td>
                  <td className="p-3 text-right font-black text-emerald-700">৳{m.netCollected.toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 font-bold">{m.percentage}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-100 font-black text-zinc-900 text-xs border-t-2 border-zinc-300">
              <tr>
                <td className="p-3">TOTAL</td>
                <td className="p-3 text-right">{methods.reduce((s, m) => s + m.transactions, 0)}</td>
                <td className="p-3 text-right">৳{methods.reduce((s, m) => s + m.successfulCollections, 0).toLocaleString()}</td>
                <td className="p-3 text-right text-amber-600">৳{methods.reduce((s, m) => s + m.pendingAmount, 0)}</td>
                <td className="p-3 text-right text-rose-500">৳{methods.reduce((s, m) => s + m.failedAmount, 0)}</td>
                <td className="p-3 text-right text-rose-500">-৳{methods.reduce((s, m) => s + m.refunds, 0)}</td>
                <td className="p-3 text-right text-emerald-700">৳{total.toLocaleString()}</td>
                <td className="p-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  // ========================================================
  // L. DISCOUNTS, REFUNDS & CANCELLATIONS
  // ========================================================
  if (reportId === 'discounts-refunds') {
    const totalDiscounts = data?.totalDiscounts || 0;
    const totalRefunds = data?.totalRefunds || 0;
    const totalCancelledValue = data?.totalCancelledValue || 0;
    const discountsList: any[] = data?.discountsList || [];
    const refundsList: any[] = data?.refundsList || [];
    const cancellationsList: any[] = data?.cancellationsList || [];
    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs">
            <div className="text-[10px] font-black uppercase text-amber-700">Total Discounts Given</div>
            <div className="text-2xl font-black text-amber-900 mt-0.5">৳{totalDiscounts.toLocaleString()}</div>
            <div className="text-[10px] text-amber-600 mt-1">{discountsList.length} discount records</div>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs">
            <div className="text-[10px] font-black uppercase text-rose-700">Total Refunds Issued</div>
            <div className="text-2xl font-black text-rose-900 mt-0.5">৳{totalRefunds.toLocaleString()}</div>
            <div className="text-[10px] text-rose-600 mt-1">{refundsList.length} refund records</div>
          </div>
          <div className="bg-zinc-100 border border-zinc-200 rounded-2xl p-4 text-xs">
            <div className="text-[10px] font-black uppercase text-zinc-600">Cancelled Order Value</div>
            <div className="text-2xl font-black text-zinc-900 mt-0.5">৳{totalCancelledValue.toLocaleString()}</div>
            <div className="text-[10px] text-zinc-500 mt-1">{cancellationsList.length} cancelled orders</div>
          </div>
        </div>

        {/* Discounts Table */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 space-y-3">
          <h3 className="text-sm font-black text-zinc-900">Discount Audit Log</h3>
          {discountsList.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No discounts applied during this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Stall</th>
                    <th className="p-3 text-right">Discount (৳)</th><th className="p-3">Authorized By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {discountsList.map((d: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-50/70">
                      <td className="p-3 font-mono font-bold">#{d.token}</td>
                      <td className="p-3 text-zinc-500">{d.date}</td>
                      <td className="p-3">{d.stallName || '—'}</td>
                      <td className="p-3 text-right font-black text-amber-700">-৳{d.discount}</td>
                      <td className="p-3 text-zinc-600">{d.authorizedBy || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Refunds Table */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 space-y-3">
          <h3 className="text-sm font-black text-zinc-900">Refund Register</h3>
          {refundsList.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No refunds issued during this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Reason</th>
                    <th className="p-3 text-right">Refund Amount</th><th className="p-3">Processed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {refundsList.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-50/70">
                      <td className="p-3 font-mono font-bold">#{r.token}</td>
                      <td className="p-3 text-zinc-500">{r.date}</td>
                      <td className="p-3 text-zinc-700">{r.reason || 'Not specified'}</td>
                      <td className="p-3 text-right font-black text-rose-700">-৳{r.refundAmount}</td>
                      <td className="p-3 text-zinc-600">{r.processedBy || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cancellations Table */}
        <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 space-y-3">
          <h3 className="text-sm font-black text-zinc-900">Cancellations Register</h3>
          {cancellationsList.length === 0 ? (
            <p className="text-xs text-zinc-400 py-4 text-center">No order cancellations in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="p-3">Order</th><th className="p-3">Date</th><th className="p-3">Reason</th>
                    <th className="p-3 text-right">Cancelled Value</th><th className="p-3">Cancelled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {cancellationsList.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-zinc-50/70">
                      <td className="p-3 font-mono font-bold">#{c.token}</td>
                      <td className="p-3 text-zinc-500">{c.date}</td>
                      <td className="p-3 text-zinc-700">{c.reason || 'Not specified'}</td>
                      <td className="p-3 text-right font-black text-zinc-700">৳{c.orderValue}</td>
                      <td className="p-3 text-zinc-600">{c.cancelledBy || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Should not reach here
  return null;
};
