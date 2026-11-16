import React, { useState } from 'react';
import { Order, VoidRequestType, VoidItemCorrection, VoidItemRemoval } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  X, AlertTriangle, ShieldAlert, CheckCircle, Ban,
  HelpCircle, User, Clock, ArrowRight, Minus, Plus
} from 'lucide-react';

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmitVoidRequestModal: React.FC<Props> = ({
  order,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser } = useAuth();
  const [requestType, setRequestType] = useState<VoidRequestType>('FULL_CANCELLATION');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Quantity correction state: item id -> new quantity
  const [corrections, setCorrections] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    (order.items || []).forEach(it => {
      init[it.id || it.menuItemId] = it.quantity;
    });
    return init;
  });

  // Selected item cancellation state: set of item ids to cancel
  const [selectedItemsToCancel, setSelectedItemsToCancel] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const quickReasons = [
    'Guest mistakenly ordered wrong quantity',
    'Customer cancelled at counter before preparation',
    'Accidental duplicate entry by cashier',
    'Customer changed their mind on selected dish',
    'Guest unable to wait for cooking time'
  ];

  // Calculate live financial impact
  let liveNewSubtotal = order.subtotal;
  let liveDifference = 0;

  if (requestType === 'FULL_CANCELLATION') {
    liveNewSubtotal = 0;
    liveDifference = order.grandTotal;
  } else if (requestType === 'ITEM_CANCELLATION') {
    let cancelSum = 0;
    (order.items || []).forEach(it => {
      const itId = it.id || it.menuItemId;
      if (selectedItemsToCancel.has(itId)) {
        cancelSum += it.price * it.quantity;
      }
    });
    liveNewSubtotal = Math.max(0, order.subtotal - cancelSum);
    const isTable = order.serviceType === 'TABLE_SERVICE';
    const waiter = isTable ? Math.round(liveNewSubtotal * 0.05) : 0;
    const newGrand = Math.max(0, liveNewSubtotal - (order.discount || 0) + waiter);
    liveDifference = Math.max(0, order.grandTotal - newGrand);
  } else if (requestType === 'QUANTITY_CORRECTION') {
    let reductionSum = 0;
    (order.items || []).forEach(it => {
      const itId = it.id || it.menuItemId;
      const newQty = corrections[itId] ?? it.quantity;
      const diff = Math.max(0, it.quantity - newQty);
      reductionSum += diff * it.price;
    });
    liveNewSubtotal = Math.max(0, order.subtotal - reductionSum);
    const isTable = order.serviceType === 'TABLE_SERVICE';
    const waiter = isTable ? Math.round(liveNewSubtotal * 0.05) : 0;
    const newGrand = Math.max(0, liveNewSubtotal - (order.discount || 0) + waiter);
    liveDifference = Math.max(0, order.grandTotal - newGrand);
  }

  const isTableService = order.serviceType === 'TABLE_SERVICE';
  const liveWaiterCharge = isTableService ? Math.round(liveNewSubtotal * 0.05) : 0;
  const liveNewGrandTotal = requestType === 'FULL_CANCELLATION'
    ? 0
    : Math.max(0, liveNewSubtotal - (order.discount || 0) + liveWaiterCharge);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a specific reason for this void/cancellation request.');
      return;
    }

    let requestDetails: any = {};

    if (requestType === 'FULL_CANCELLATION') {
      requestDetails = { cancelEntireOrder: true };
    } else if (requestType === 'ITEM_CANCELLATION') {
      if (selectedItemsToCancel.size === 0) {
        setError('Please select at least one item to cancel.');
        return;
      }
      const itemsToRemove: VoidItemRemoval[] = (order.items || [])
        .filter(it => selectedItemsToCancel.has(it.id || it.menuItemId))
        .map(it => ({
          menuItemId: it.menuItemId,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          stallId: it.stallId
        }));
      requestDetails = { itemsToRemove };
    } else if (requestType === 'QUANTITY_CORRECTION') {
      const corrList: VoidItemCorrection[] = [];
      let hasChanges = false;
      (order.items || []).forEach(it => {
        const itId = it.id || it.menuItemId;
        const newQty = corrections[itId] ?? it.quantity;
        if (newQty !== it.quantity) {
          hasChanges = true;
          corrList.push({
            menuItemId: it.menuItemId,
            name: it.name,
            oldQuantity: it.quantity,
            newQuantity: newQty,
            unitPrice: it.price,
            stallId: it.stallId
          });
        }
      });

      if (!hasChanges || corrList.length === 0) {
        setError('No quantities were modified. Please decrease quantity on at least one item.');
        return;
      }
      requestDetails = { corrections: corrList };
    } else if (requestType === 'ORDER_MODIFICATION') {
      requestDetails = { notes: reason };
    }

    setSubmitting(true);
    try {
      await api.createVoidRequest({
        orderId: order.id,
        requestType,
        reason: reason.trim(),
        cashierId: currentUser?.id || 'usr-cashier',
        cashierName: currentUser?.name || 'Counter Cashier',
        cashierRole: currentUser?.role || 'CASHIER',
        requestDetails
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit void request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-black">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Request Order Void / Correction</h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Manager Approval Required
                </span>
              </div>
              <p className="text-xs text-white/80">
                Cashiers can submit requests only. Manager or Chief Admin will review &amp; approve.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Details Banner */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Order Token</span>
            <p className="font-black text-brand-600 text-sm">#{order.token}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Invoice No</span>
            <p className="font-bold text-zinc-800">{order.invoiceNo || order.token}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Destination</span>
            <p className="font-bold text-zinc-800">
              {order.tableId ? `Table ${order.tableId}` : 'Takeaway / Parcel'}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400">Grand Total</span>
            <p className="font-black text-zinc-900">৳{order.grandTotal.toLocaleString()}</p>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
              order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Request Type Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-2">
              Select Void Request Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRequestType('FULL_CANCELLATION')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  requestType === 'FULL_CANCELLATION'
                    ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/30'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="font-black text-zinc-900 flex items-center justify-between">
                  <span>Full Order Cancellation</span>
                  {requestType === 'FULL_CANCELLATION' && <span className="text-red-600 font-bold">●</span>}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Void entire bill. Orders and kitchen prep will be cancelled.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('QUANTITY_CORRECTION')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  requestType === 'QUANTITY_CORRECTION'
                    ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/30'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="font-black text-zinc-900 flex items-center justify-between">
                  <span>Quantity Correction</span>
                  {requestType === 'QUANTITY_CORRECTION' && <span className="text-red-600 font-bold">●</span>}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  E.g. guest mistakenly ordered 22 items instead of 2.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('ITEM_CANCELLATION')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  requestType === 'ITEM_CANCELLATION'
                    ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/30'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="font-black text-zinc-900 flex items-center justify-between">
                  <span>Selected Item Cancellation</span>
                  {requestType === 'ITEM_CANCELLATION' && <span className="text-red-600 font-bold">●</span>}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Remove specific dishes while keeping remainder of order.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRequestType('ORDER_MODIFICATION')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  requestType === 'ORDER_MODIFICATION'
                    ? 'border-red-500 bg-red-50/60 ring-2 ring-red-500/30'
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <div className="font-black text-zinc-900 flex items-center justify-between">
                  <span>Order Modification</span>
                  {requestType === 'ORDER_MODIFICATION' && <span className="text-red-600 font-bold">●</span>}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Special customer notes, allergy instructions, or dining type.
                </p>
              </button>
            </div>
          </div>

          {/* Detail Editor: Quantity Correction */}
          {requestType === 'QUANTITY_CORRECTION' && (
            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-zinc-800">
                <span>Adjust Ordered Quantities</span>
                <span className="text-[10px] text-zinc-500">Only reductions permitted</span>
              </div>
              <div className="divide-y divide-zinc-200">
                {(order.items || []).map((it) => {
                  const itId = it.id || it.menuItemId;
                  const currentQty = corrections[itId] ?? it.quantity;
                  return (
                    <div key={itId} className="py-2 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-black text-zinc-900 truncate">{it.name}</p>
                        <p className="text-[10px] text-zinc-500">
                          Original: <strong className="text-zinc-800">{it.quantity}×</strong> @ ৳{it.price} = ৳{it.price * it.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setCorrections(prev => ({
                              ...prev,
                              [itId]: Math.max(0, currentQty - 1)
                            }));
                          }}
                          disabled={currentQty <= 0}
                          className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center font-bold text-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={it.quantity}
                          value={currentQty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setCorrections(prev => ({
                              ...prev,
                              [itId]: isNaN(val) ? 0 : Math.min(it.quantity, Math.max(0, val))
                            }));
                          }}
                          className="w-12 text-center py-1 border border-zinc-300 rounded-lg font-black text-zinc-900 text-xs bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCorrections(prev => ({
                              ...prev,
                              [itId]: Math.min(it.quantity, currentQty + 1)
                            }));
                          }}
                          disabled={currentQty >= it.quantity}
                          className="w-7 h-7 rounded-lg bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center font-bold text-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detail Editor: Selected Item Cancellation */}
          {requestType === 'ITEM_CANCELLATION' && (
            <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-zinc-800">
                <span>Select Dishes to Cancel</span>
                <span className="text-[10px] text-zinc-500">Unselected dishes remain active</span>
              </div>
              <div className="space-y-1.5">
                {(order.items || []).map((it) => {
                  const itId = it.id || it.menuItemId;
                  const isChecked = selectedItemsToCancel.has(itId);
                  return (
                    <label
                      key={itId}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                        isChecked ? 'bg-red-50/70 border-red-300 font-bold' : 'bg-white border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const next = new Set(selectedItemsToCancel);
                            if (e.target.checked) next.add(itId);
                            else next.delete(itId);
                            setSelectedItemsToCancel(next);
                          }}
                          className="w-4 h-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                        />
                        <span className="text-zinc-900">{it.name}</span>
                      </div>
                      <span className="text-zinc-600">
                        {it.quantity}× (৳{it.price * it.quantity})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-zinc-700 mb-1">
              Reason for Void / Cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Detailed reason required for manager audit (e.g. customer ordered 22 instead of 2 by mistake)..."
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-2xl text-xs focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition-colors cursor-pointer"
                >
                  + {qr}
                </button>
              ))}
            </div>
          </div>

          {/* Live Impact Preview Card */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-zinc-600">
              <span>Original Amount:</span>
              <span className="font-bold text-zinc-800">৳{order.grandTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-zinc-600">
              <span>Proposed New Total:</span>
              <span className="font-bold text-zinc-800">৳{liveNewGrandTotal.toLocaleString()}</span>
            </div>
            {order.paymentStatus === 'PAID' && liveDifference > 0 && (
              <div className="pt-1.5 border-t border-amber-200 flex items-center justify-between font-black text-rose-700">
                <span>Customer Refund Due (Upon Approval):</span>
                <span>৳{liveDifference.toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Cashier Metadata Footer */}
          <div className="p-3 bg-zinc-100/70 rounded-2xl text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-2 border border-zinc-200/60">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Requested by: <strong>{currentUser?.name || 'Counter Cashier'}</strong> ({currentUser?.role || 'CASHIER'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Submitting Request...' : 'Submit to Manager for Approval'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
