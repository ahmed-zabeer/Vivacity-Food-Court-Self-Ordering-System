import React, { useState, useEffect } from 'react';
import { VoidRequest, VoidRequestStatus } from '../../types';
import { api } from '../../services/api';
import { realtime } from '../../services/events';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldAlert, CheckCircle2, XCircle, Clock, Search,
  Filter, AlertTriangle, ArrowRight, User, RefreshCw,
  UtensilsCrossed, Package, DollarSign, RotateCcw, FileText
} from 'lucide-react';

interface Props {
  onRefreshOrders?: () => void;
}

export const VoidRequestsManager: React.FC<Props> = ({ onRefreshOrders }) => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<VoidRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING');
  const [search, setSearch] = useState<string>('');

  // Action states for approval / rejection modal
  const [activeRequest, setActiveRequest] = useState<VoidRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [actionNote, setActionNote] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAuthorizedManager = ['SUPER ADMIN', 'FOOD COURT OWNER', 'MANAGER'].includes(
    currentUser?.role || ''
  );

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const list = await api.getVoidRequests();
      setRequests(list);
    } catch (e) {
      console.error('Failed to fetch void requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    const unsubCreated = realtime.on('void_request_created', () => {
      fetchRequests();
      if (onRefreshOrders) onRefreshOrders();
    });

    const unsubApproved = realtime.on('void_request_approved', () => {
      fetchRequests();
      if (onRefreshOrders) onRefreshOrders();
    });

    const unsubRejected = realtime.on('void_request_rejected', () => {
      fetchRequests();
      if (onRefreshOrders) onRefreshOrders();
    });

    const unsubUpdated = realtime.on('void_request_updated', () => {
      fetchRequests();
      if (onRefreshOrders) onRefreshOrders();
    });

    return () => {
      unsubCreated();
      unsubApproved();
      unsubRejected();
      unsubUpdated();
    };
  }, []);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  const filtered = requests.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchToken = (r.token || '').toLowerCase().includes(q);
      const matchInvoice = (r.invoiceNo || '').toLowerCase().includes(q);
      const matchCashier = (r.cashierName || '').toLowerCase().includes(q);
      const matchReason = (r.reason || '').toLowerCase().includes(q);
      const matchTable = (r.tableId || '').toLowerCase().includes(q);
      if (!matchToken && !matchInvoice && !matchCashier && !matchReason && !matchTable) {
        return false;
      }
    }
    return true;
  });

  const handleExecuteAction = async () => {
    if (!activeRequest || !actionType) return;
    setActionError(null);

    if (actionType === 'REJECT' && (!actionNote.trim() || actionNote.trim().length < 3)) {
      setActionError('Please state a reason for rejecting this void request.');
      return;
    }

    setProcessing(true);
    try {
      if (actionType === 'APPROVE') {
        await api.approveVoidRequest(activeRequest.id, {
          resolverId: currentUser?.id,
          resolverName: currentUser?.name || 'Food Court Manager',
          resolverRole: currentUser?.role || 'MANAGER',
          approvalNote: actionNote.trim()
        });
      } else {
        await api.rejectVoidRequest(activeRequest.id, {
          resolverId: currentUser?.id,
          resolverName: currentUser?.name || 'Food Court Manager',
          resolverRole: currentUser?.role || 'MANAGER',
          rejectionReason: actionNote.trim() || 'Rejected by Manager'
        });
      }

      setActiveRequest(null);
      setActionType(null);
      setActionNote('');
      fetchRequests();
      if (onRefreshOrders) onRefreshOrders();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed');
    } finally {
      setProcessing(false);
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'FULL_CANCELLATION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-300">Full Cancellation</span>;
      case 'QUANTITY_CORRECTION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">Quantity Correction</span>;
      case 'ITEM_CANCELLATION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-300">Item Cancellation</span>;
      case 'ORDER_MODIFICATION':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-300">Order Modification</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-100 text-zinc-800">{type}</span>;
    }
  };

  const getStatusBadge = (status: VoidRequestStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">Pending Approval</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">Approved ✓</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-zinc-200 text-zinc-700 border border-zinc-300">Rejected ✕</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-black shadow-md">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-zinc-900 tracking-tight">Void &amp; Cancellation Requests</h2>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-black">
                  {pendingCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Strict Manager-Approved Void Workflow • Cashiers submit requests • Manager/Admin review &amp; authorization
            </p>
          </div>
        </div>

        <button
          onClick={fetchRequests}
          className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-2xl">
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'PENDING'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-black">
                {pendingCount}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-400">(0)</span>
            )}
          </button>
          <button
            onClick={() => setFilterStatus('APPROVED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'APPROVED'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Approved</span>
            <span className="text-[10px] text-zinc-400">({approvedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('REJECTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterStatus === 'REJECTED'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>Rejected</span>
            <span className="text-[10px] text-zinc-400">({rejectedCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white text-zinc-900 shadow-2xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <span>All ({requests.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search token, invoice, cashier, reason..."
            className="w-full pl-9 pr-3.5 py-2 border border-zinc-200 rounded-2xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Requests List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-zinc-200/90 shadow-2xs text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-zinc-300 mx-auto" />
          <h3 className="text-sm font-black text-zinc-800">No Void Requests in this view</h3>
          <p className="text-xs text-zinc-500">
            {filterStatus === 'PENDING'
              ? 'No pending requests requiring manager approval.'
              : 'Try changing your filter or search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const isPending = req.status === 'PENDING';
            const originalTotal = req.originalSnapshot?.grandTotal || 0;
            const newTotal = req.proposedImpact?.newGrandTotal ?? 0;
            const refundAmt = req.proposedImpact?.refundAmount || 0;

            return (
              <div
                key={req.id}
                className={`bg-white rounded-3xl border transition-all overflow-hidden shadow-2xs ${
                  isPending
                    ? 'border-amber-300 ring-2 ring-amber-400/20'
                    : req.status === 'APPROVED'
                    ? 'border-emerald-200'
                    : 'border-zinc-200 opacity-90'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 bg-zinc-50 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-base font-black text-brand-600">
                      Token #{req.token}
                    </span>
                    <span className="text-xs font-bold text-zinc-500">
                      (Invoice #{req.invoiceNo})
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700 font-bold">
                      {req.tableId ? `Table ${req.tableId}` : 'Takeaway / Parcel'}
                    </span>
                    {getRequestTypeBadge(req.requestType)}
                  </div>
                  <div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Reason & Submitter */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                        Reason Stated by Cashier
                      </span>
                      <p className="text-xs font-bold text-zinc-900 leading-snug">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/60 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                        Request Details
                      </span>
                      <p className="text-xs text-zinc-700">
                        Submitted by: <strong className="text-zinc-900">{req.cashierName}</strong> ({req.cashierRole})
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        Time: {new Date(req.requestedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Before & After Comparison */}
                  <div className="border border-zinc-200 rounded-2xl p-4 bg-zinc-50/40 space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-700">
                      Proposed Order Adjustment
                    </span>

                    {/* Correction details */}
                    {req.requestType === 'QUANTITY_CORRECTION' && req.requestDetails.corrections && (
                      <div className="space-y-1.5">
                        {req.requestDetails.corrections.map((corr, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-zinc-200 text-xs">
                            <span className="font-bold text-zinc-900">{corr.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 line-through">{corr.oldQuantity}×</span>
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                              <span className="font-black text-rose-600">{corr.newQuantity}×</span>
                              <span className="text-zinc-400">(@ ৳{corr.unitPrice})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Item removal details */}
                    {req.requestType === 'ITEM_CANCELLATION' && req.requestDetails.itemsToRemove && (
                      <div className="space-y-1.5">
                        {req.requestDetails.itemsToRemove.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-red-50 border border-red-200 text-xs">
                            <span className="font-bold text-red-900">Remove: {it.name}</span>
                            <span className="font-black text-red-700">{it.quantity}× (৳{it.price * it.quantity})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Full cancellation banner */}
                    {req.requestType === 'FULL_CANCELLATION' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-bold">
                        ⚠️ Full order cancellation requested. All {(req.originalSnapshot?.items || []).length} dishes will be voided.
                      </div>
                    )}

                    {/* Financial Summary Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-200 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Original Total</span>
                        <p className="font-black text-zinc-900">৳{originalTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Proposed Total</span>
                        <p className="font-black text-zinc-900">৳{newTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Difference</span>
                        <p className="font-black text-rose-600">
                          -৳{(originalTotal - newTotal).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase">Refund Action</span>
                        {refundAmt > 0 ? (
                          <p className="font-black text-emerald-700">Refund ৳{refundAmt.toLocaleString()}</p>
                        ) : (
                          <p className="font-bold text-zinc-500">None (Unpaid bill)</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resolution Audit (If Resolved) */}
                  {!isPending && (
                    <div className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                      req.status === 'APPROVED' ? 'bg-emerald-50/70 border-emerald-200' : 'bg-zinc-100 border-zinc-200'
                    }`}>
                      <div className="flex items-center justify-between font-black">
                        <span className={req.status === 'APPROVED' ? 'text-emerald-900' : 'text-zinc-800'}>
                          {req.status === 'APPROVED' ? '✓ Resolution: Approved & Executed' : '✕ Resolution: Rejected'}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {req.resolvedAt ? new Date(req.resolvedAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-zinc-700">
                        Decided by: <strong>{req.resolvedBy}</strong> ({req.resolverRole})
                      </p>
                      <p className="text-zinc-600">
                        Note: "{req.resolutionReason || 'No note recorded'}"
                      </p>
                      {req.executionResult?.refundRecorded && (
                        <p className="text-emerald-800 font-bold">
                          ✓ Refund of ৳{req.executionResult.refundAmount} recorded. (Ref: {req.executionResult.refundTransactionId})
                        </p>
                      )}
                      {req.executionResult?.inventoryRestored && (
                        <p className="text-emerald-800 font-bold">
                          ✓ Inventory stock returned for {req.executionResult.inventoryItemsAdjusted.length} items.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manager Action Buttons (For Pending) */}
                  {isPending && (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100">
                      {isAuthorizedManager ? (
                        <>
                          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-amber-500" />
                            <span>Action will update order records, adjust inventory, and process refund if paid.</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setActiveRequest(req);
                                setActionType('REJECT');
                                setActionNote('');
                              }}
                              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-black text-xs transition-colors cursor-pointer"
                            >
                              Reject Request
                            </button>
                            <button
                              onClick={() => {
                                setActiveRequest(req);
                                setActionType('APPROVE');
                                setActionNote('');
                              }}
                              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve &amp; Execute</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold w-full flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Awaiting Manager / Chief Administrator approval. Cashiers cannot approve requests.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation & Approval/Rejection Modal */}
      {activeRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  actionType === 'APPROVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {actionType === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900">
                    {actionType === 'APPROVE' ? 'Approve Void Request' : 'Reject Void Request'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Token #{activeRequest.token} • {activeRequest.requestType.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setActiveRequest(null); setActionType(null); }}
                className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {actionError}
              </div>
            )}

            <div className="text-xs text-zinc-600 space-y-2">
              <p>
                {actionType === 'APPROVE'
                  ? 'Approving this request will immediately apply the order changes, reverse stock deductions (if food not prepared), and issue customer refund if already paid.'
                  : 'Rejecting this request will leave the original order completely unchanged. Please state a reason for cashier audit.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                {actionType === 'APPROVE' ? 'Approval Note (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                rows={2}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'APPROVE' ? 'e.g. Approved - refund cash at counter...' : 'e.g. Dishes already cooked and prepared in kitchen...'}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => { setActiveRequest(null); setActionType(null); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleExecuteAction}
                className={`px-5 py-2 rounded-xl text-white text-xs font-black shadow-md cursor-pointer disabled:opacity-50 ${
                  actionType === 'APPROVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processing ? 'Processing...' : actionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
