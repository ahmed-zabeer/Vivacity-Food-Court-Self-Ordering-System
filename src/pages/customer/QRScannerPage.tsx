import React, { useState, useEffect, useRef } from 'react';
import { useTableSession } from '../../context/TableSessionContext';
import { useCart } from '../../context/CartContext';
import { useLocation } from 'wouter';
import { Camera, QrCode, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export const QRScannerPage: React.FC = () => {
  const { tableId, setTableId } = useTableSession();
  const { clearCart, clearCustomerDetails } = useCart();
  const [, setLocation] = useLocation();

  const [manualCode, setManualCode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Attempt camera initialization
    const html5QrCode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        (errorMessage) => {
          // ignore frame errors
        }
      )
      .then(() => {
        setCameraActive(true);
      })
      .catch((err) => {
        setCameraActive(false);
        setScanError('Camera access not granted or not supported on this browser.');
      });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleDetectedCode = (text: string) => {
    // Look for T01 - T55 in scanned string or URL
    const match = text.match(/(T\d{2})/i) || text.match(/\/t\/([A-Za-z0-9]+)/i);
    if (match) {
      const code = (match[1] || match[0]).toUpperCase();
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      clearCart();
      clearCustomerDetails();
      setTableId(code);
      setLocation(`/t/${code}`);
    } else {
      setScanError(`Scanned code "${text}" did not match a valid table (T01 - T55).`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;

    // Format as TXX if user enters just a number like 17
    let formatted = clean;
    if (/^\d{1,2}$/.test(clean)) {
      formatted = `T${clean.padStart(2, '0')}`;
    }

    clearCart();
    clearCustomerDetails();
    setTableId(formatted);
    setLocation(`/t/${formatted}`);
  };

  return (
    <div className="max-w-md mx-auto w-full p-4 pb-4 sm:pb-6 space-y-5 flex flex-col">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
          Table QR Scanner
        </h1>
        <p className="text-xs text-zinc-500">
          Point your device camera at any dining table QR code (T01 – T55)
        </p>
      </div>

      {/* Camera Box */}
      <div className="bg-black rounded-3xl overflow-hidden aspect-square relative border-2 border-zinc-900 shadow-xl flex items-center justify-center">
        <div id="qr-reader" className="w-full h-full" />

        {!cameraActive && (
          <div className="absolute inset-0 bg-zinc-900 p-6 flex flex-col items-center justify-center text-center text-white space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Camera Feed Inactive</h3>
              <p className="text-[11px] text-zinc-400 max-w-xs mt-1">
                {scanError || 'Please allow camera permissions or enter your table code manually below.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Fallback: Enter Table Code */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-brand-600" />
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Manual Table Entry Fallback
          </h3>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Table Code (e.g. T17, T05, T42)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-sm font-black uppercase tracking-wider text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black text-xs shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Connect to Table</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Table Pills */}
        <div className="pt-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
            Quick Demo Shortcuts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['T01', 'T05', 'T12', 'T17', 'T24', 'T35', 'T55'].map(t => (
              <button
                key={t}
                onClick={() => {
                  clearCart();
                  clearCustomerDetails();
                  setTableId(t);
                  setLocation(`/t/${t}`);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-100 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
