import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  FileSpreadsheet,
  Printer,
  Search,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  Archive,
  DollarSign,
  UserCheck
} from 'lucide-react';

interface Props {
  reportId: string;
  dateFrom: string;
  dateTo: string;
}

export const VoidReportViews: React.FC<Props> = ({ reportId, dateFrom, dateTo }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const isManagerOrAdmin = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'].includes(
    currentUser?.role || ''
  );

  const userContext = {
    name: currentUser?.name || 'Manager',
    role: currentUser?.role || 'MANAGER'
  };

  const fetchVoidData = async () => {
    setLoading(true);
    try {
      if (reportId === 'void-summary') {
        const res = await api.getVoidSummaryReport(
          { dateFrom, dateTo, search },
          userContext
        );
        setData(res);
      } else if (reportId === 'reset-history') {
        const res = await api.getResetHistoryReport(
          { dateFrom, dateTo, search },
          userContext
        );
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load void/reset report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchVoidData();
    } else {
      setLoading(false);
    }
  }, [reportId, dateFrom, dateTo, search, currentUser?.role]);

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

  const printReport = (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    summary?: { label: string; value: string }[]
  ) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const summaryHtml = summary && summary.length > 0
      ? `
      <div style="display:flex;flex-wrap:wrap;gap:16px;margin-bottom:14px;padding:10px;background:#f8f9fa;border-radius:6px;border:1px solid #e9ecef;">
        ${summary.map(s => `<div><span style="font-size:10px;color:#6c757d;text-transform:uppercase;font-weight:bold;">${s.label}: </span><strong style="font-size:13px;color:#212529;">${s.value}</strong></div>`).join('')}
      </div>`
      : '';

    const tableHeaders = headers
      .map(
        h =>
          `<th style="padding:6px 10px;border:1px solid #dee2e6;background:#f1f3f5;font-size:10px;text-transform:uppercase;font-weight:bold;text-align:left;">${h}</th>`
      )
      .join('');
    const tableRows = rows
      .map(
        (r, idx) => `
      <tr style="background:${idx % 2 === 0 ? '#fff' : '#fcfcfc'};">
        ${r.map(cell => `<td style="padding:6px 10px;border:1px solid #dee2e6;font-size:11px;color:#212529;">${cell ?? '-'}</td>`).join('')}
      </tr>
    `
      )
      .join('');

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

  if (!isManagerOrAdmin) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-zinc-200 shadow-2xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-black text-zinc-900">Restricted Administrative Access</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Void Summary Reports and Order Reset History contain sensitive financial audit logs and are restricted to Food Court Managers and Chief Administrators only.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/90 shadow-2xs space-y-3">
        <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
        <p className="font-bold text-zinc-500 text-xs">Querying void register &amp; reset history...</p>
      </div>
    );
  }

  // =========================================================================
  // 1. VOID SUMMARY REPORT
  // =========================================================================
  if (reportId === 'void-summary') {
    const rawRequests = data?.requests || [];
    const filteredRequests = rawRequests.filter((r: any) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      return true;
    });

    const summaryCards = [
      { label: 'Total Void Requests', value: data?.totalRequests || 0, color: 'text-zinc-900 bg-zinc-50' },
      { label: 'Pending Requests', value: data?.pendingRequests || 0, color: 'text-amber-600 bg-amber-50' },
      { label: 'Approved Voids', value: data?.approvedVoids || 0, color: 'text-emerald-600 bg-emerald-50' },
      { label: 'Rejected Requests', value: data?.rejectedRequests || 0, color: 'text-rose-600 bg-rose-50' },
      { label: 'Full Order Voids', value: data?.fullOrderVoids || 0, color: 'text-purple-600 bg-purple-50' },
      { label: 'Partial Item Voids', value: data?.partialItemVoids || 0, color: 'text-blue-600 bg-blue-50' },
      { label: 'Quantity Corrections', value: data?.quantityCorrections || 0, color: 'text-indigo-600 bg-indigo-50' },
      { label: 'Total Voided Sales', value: `৳${Number(data?.totalVoidedSales || 0).toLocaleString()}`, color: 'text-rose-600 bg-rose-50' },
      { label: 'Refunds Issued', value: `৳${Number(data?.totalRefundsIssued || 0).toLocaleString()}`, color: 'text-amber-700 bg-amber-50' }
    ];

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Header with Title and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                Manager &amp; Chief Admin Only
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">100% Real Database Transactions</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 mt-0.5">
              Void &amp; Cancellation Reports
            </h2>
            <p className="text-[11px] text-zinc-500">
              Audit log of void requests, approvals, refunds &amp; net sales deductions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                exportCSV(
                  'Vivacity-Void-Reports',
                  [
                    'Date & Time',
                    'Token',
                    'Invoice No',
                    'Order ID',
                    'Void Type',
                    'Requested By',
                    'Reason',
                    'Estimated Impact (BDT)',
                    'Status',
                    'Resolved By',
                    'Resolution Note / Rejection',
                    'Refund Issued (BDT)'
                  ],
                  filteredRequests.map((r: any) => [
                    r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-',
                    r.token || '-',
                    r.invoiceNo || '-',
                    r.orderId || '-',
                    r.type || '-',
                    `${r.requestedBy?.name || 'Staff'} (${r.requestedBy?.role || ''})`,
                    r.reason || '-',
                    r.estimatedImpact || 0,
                    r.status || '-',
                    r.resolvedBy ? `${r.resolvedBy.name} (${r.resolvedBy.role})` : '-',
                    r.approvalNote || r.rejectionReason || '-',
                    r.refundIssued || 0
                  ])
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() =>
                printReport(
                  'Void & Cancellation Reports',
                  [
                    'Date & Time',
                    'Token / Inv',
                    'Void Type',
                    'Requested By',
                    'Reason',
                    'Void Value',
                    'Status',
                    'Approved / Resolved By',
                    'Refund'
                  ],
                  filteredRequests.map((r: any) => [
                    r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '-',
                    `${r.token || '-'} / ${r.invoiceNo || '-'}`,
                    r.type || '-',
                    `${r.requestedBy?.name || 'Staff'} (${r.requestedBy?.role || ''})`,
                    r.reason || '-',
                    `৳${Number(r.estimatedImpact || 0).toLocaleString()}`,
                    r.status || '-',
                    r.resolvedBy ? `${r.resolvedBy.name} (${r.resolvedBy.role})` : 'Pending Review',
                    r.refundIssued ? `৳${r.refundIssued}` : '৳0.00'
                  ]),
                  [
                    { label: 'Total Void Requests', value: `${data?.totalRequests || 0}` },
                    { label: 'Approved Voids', value: `${data?.approvedVoids || 0}` },
                    { label: 'Total Voided Sales', value: `৳${Number(data?.totalVoidedSales || 0).toLocaleString()}` },
                    { label: 'Refunds Issued', value: `৳${Number(data?.totalRefundsIssued || 0).toLocaleString()}` }
                  ]
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* 9 Summary Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {summaryCards.map((c, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border border-zinc-200/90 flex flex-col justify-between ${c.color}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                {c.label}
              </span>
              <div className="text-xl font-black mt-1">{c.value}</div>
            </div>
          ))}
        </div>

        {/* Filters and Search Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500">Status:</span>
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  statusFilter === st
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search token, invoice, cashier, reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Void Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Requested At</th>
                <th className="p-3">Token &amp; Invoice</th>
                <th className="p-3">Void Type</th>
                <th className="p-3">Cashier</th>
                <th className="p-3">Reason / Details</th>
                <th className="p-3 text-right">Value (৳)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Approved / Rejected By</th>
                <th className="p-3 text-right">Refund</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-zinc-400">
                    No void or cancellation requests recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((r: any) => (
                  <tr key={r.id} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono text-[11px] text-zinc-600">
                      <div>{r.requestedAt ? new Date(r.requestedAt).toLocaleDateString() : '-'}</div>
                      <div className="text-[10px] text-zinc-400">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-black text-zinc-900">{r.token || 'No Token'}</div>
                      <div className="text-[10px] font-mono text-zinc-500">{r.invoiceNo || r.orderId}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-zinc-100 text-zinc-800 border border-zinc-200">
                        {(r.type || 'VOID').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-zinc-800">{r.requestedBy?.name || 'Cashier'}</div>
                      <div className="text-[9px] text-zinc-400 uppercase">{r.requestedBy?.role || 'Staff'}</div>
                    </td>
                    <td className="p-3 text-zinc-600 max-w-xs">
                      <div className="font-semibold">{r.reason}</div>
                      {r.voidItems && r.voidItems.length > 0 && (
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {r.voidItems.map((vi: any) => `${vi.name} × ${vi.voidQuantity}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-black text-rose-600">
                      ৳{Number(r.estimatedImpact || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status === 'APPROVED' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {r.status === 'REJECTED' && <XCircle className="w-3 h-3 text-rose-600" />}
                        {r.status === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      {r.resolvedBy ? (
                        <div>
                          <div className="font-bold text-zinc-800 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>{r.resolvedBy.name}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 italic">
                            {r.approvalNote || r.rejectionReason || 'Resolved'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full">
                          Awaiting Manager
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-700">
                      {r.refundIssued ? `৳${r.refundIssued}` : '৳0.00'}
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

  // =========================================================================
  // 2. DELETE REPORT / RESET HISTORY
  // =========================================================================
  if (reportId === 'reset-history') {
    const historyList = data?.history || [];

    return (
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                Immutable Audit Trail
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">Archive &amp; Snapshots Preserved</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 mt-0.5">
              Delete Report / Reset History
            </h2>
            <p className="text-[11px] text-zinc-500">
              Audit log of all order restart operations performed by Managers &amp; Chief Administrators
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                exportCSV(
                  'Vivacity-Reset-History',
                  [
                    'Timestamp',
                    'Performed By',
                    'Role',
                    'Audit Reason',
                    'Orders Archived',
                    'Daily Revenue Snapshot',
                    'Monthly Revenue Snapshot',
                    'Yearly Revenue Snapshot',
                    'Archived Tokens Sample'
                  ],
                  historyList.map((h: any) => [
                    h.timestamp ? new Date(h.timestamp).toLocaleString() : '-',
                    h.performedBy?.name || 'Manager',
                    h.performedBy?.role || 'MANAGER',
                    h.reason || 'Manual Reset',
                    h.affectedOrdersCount || 0,
                    h.affectedRevenue?.daily || 0,
                    h.affectedRevenue?.monthly || 0,
                    h.affectedRevenue?.yearly || 0,
                    (h.sampleOrderTokens || []).join('; ')
                  ])
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() =>
                printReport(
                  'Delete Report / Reset History',
                  [
                    'Timestamp',
                    'Performed By',
                    'Audit Reason',
                    'Orders Archived',
                    'Daily Rev Snapshot',
                    'Monthly Rev Snapshot',
                    'Yearly Rev Snapshot'
                  ],
                  historyList.map((h: any) => [
                    h.timestamp ? new Date(h.timestamp).toLocaleString() : '-',
                    `${h.performedBy?.name || 'Manager'} (${h.performedBy?.role || ''})`,
                    h.reason || 'Manual Reset',
                    `${h.affectedOrdersCount || 0} orders`,
                    `৳${Number(h.affectedRevenue?.daily || 0).toLocaleString()}`,
                    `৳${Number(h.affectedRevenue?.monthly || 0).toLocaleString()}`,
                    `৳${Number(h.affectedRevenue?.yearly || 0).toLocaleString()}`
                  ]),
                  [
                    { label: 'Total Order Restarts', value: `${data?.totalResets || 0}` },
                    {
                      label: 'Total Orders Archived',
                      value: `${historyList.reduce((sum: number, h: any) => sum + (h.affectedOrdersCount || 0), 0)} orders`
                    }
                  ]
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500">Total Restart Operations</span>
              <div className="text-xl font-black text-zinc-900 mt-0.5">{data?.totalResets || 0}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500">Total Orders Archived</span>
              <div className="text-xl font-black text-purple-700 mt-0.5">
                {historyList.reduce((sum: number, h: any) => sum + (h.affectedOrdersCount || 0), 0)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Archive className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase text-zinc-500">Audit Storage Status</span>
              <div className="text-xl font-black text-emerald-600 mt-0.5">100% Traceable</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex justify-end pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by reason, manager, token..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-zinc-200 rounded-xl text-xs w-full focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="p-3">Timestamp &amp; Date</th>
                <th className="p-3">Manager / Initiator</th>
                <th className="p-3">Audit Reason</th>
                <th className="p-3 text-right">Archived Orders</th>
                <th className="p-3 text-right">Daily Rev Snapshot</th>
                <th className="p-3 text-right">Monthly Rev Snapshot</th>
                <th className="p-3 text-right">Yearly Rev Snapshot</th>
                <th className="p-3">Archived Tokens Sample</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {historyList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-zinc-400">
                    No order restarts or delete events recorded in the audit history.
                  </td>
                </tr>
              ) : (
                historyList.map((h: any) => (
                  <tr key={h.id} className="hover:bg-zinc-50/70">
                    <td className="p-3 font-mono text-[11px] text-zinc-600">
                      <div>{h.timestamp ? new Date(h.timestamp).toLocaleDateString() : '-'}</div>
                      <div className="text-[10px] text-zinc-400">
                        {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-black text-zinc-900">{h.performedBy?.name || 'Manager'}</div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-100 text-purple-800">
                        {h.performedBy?.role || 'MANAGER'}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-700 font-medium max-w-xs">
                      {h.reason || 'Manual Reset'}
                    </td>
                    <td className="p-3 text-right font-black text-purple-700">
                      {h.affectedOrdersCount || 0}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-800">
                      ৳{Number(h.affectedRevenue?.daily || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-800">
                      ৳{Number(h.affectedRevenue?.monthly || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-zinc-800">
                      ৳{Number(h.affectedRevenue?.yearly || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-zinc-500 font-mono text-[10px] max-w-xs truncate">
                      {(h.sampleOrderTokens || []).join(', ') || 'None'}
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

  return null;
};
