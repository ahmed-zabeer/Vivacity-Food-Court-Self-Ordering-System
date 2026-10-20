import React, { useEffect } from 'react';
import { useTableSession } from '../../context/TableSessionContext';
import { useLocation } from 'wouter';
import { ShoppingBag, ArrowRight, Package } from 'lucide-react';

export const ParcelOrderPage: React.FC = () => {
  const { setIsTakeaway, setTableId } = useTableSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setIsTakeaway(true);
    setTableId(null);
  }, []);

  return (
    <div className="max-w-md mx-auto w-full p-4 pb-4 sm:pb-6 space-y-4">
      {/* Parcel Hero Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-6 shadow-md space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">
            Vivacity Food Court
          </span>
          <h1 className="text-2xl font-black text-white leading-tight">
            Takeaway &amp; Parcel Orders
          </h1>
          <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
            Order across all 6 stalls without occupying a table. Receive a parcel token (e.g. P001) and pick up your packed meal at the central counter!
          </p>
        </div>

        <button
          onClick={() => setLocation('/')}
          className="w-full py-3.5 px-4 rounded-xl bg-white text-emerald-900 font-extrabold text-xs shadow-md flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
        >
          <span>Browse All Kitchens for Takeaway</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200 shadow-2xs space-y-3 text-xs text-zinc-700">
        <h3 className="font-black uppercase tracking-wider text-zinc-900">
          How Parcel Ordering Works:
        </h3>
        <ol className="list-decimal pl-4 space-y-2 text-zinc-600">
          <li>Select dishes from any stall into your unified tray.</li>
          <li>Choose your payment method and submit the parcel order.</li>
          <li>You will be assigned a <strong>Parcel Token (e.g. P001)</strong>.</li>
          <li>Our central counter expedites packaging from all stalls into one unified bag.</li>
          <li>When status shows <strong>READY</strong>, collect your order at the counter!</li>
        </ol>
      </div>
    </div>
  );
};
