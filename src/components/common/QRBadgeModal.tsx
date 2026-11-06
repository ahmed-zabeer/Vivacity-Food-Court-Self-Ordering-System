import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Printer, Copy, Check, Wifi } from 'lucide-react';
import { api } from '../../services/api';

interface QRBadgeModalProps {
  tableId: string;
  tableName?: string;
  zone?: string;
  baseUrl?: string;
  onClose: () => void;
}

export const QRBadgeModal: React.FC<QRBadgeModalProps> = ({ tableId, tableName, zone, baseUrl, onClose }) => {
  const isLocalHostClient = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const [resolvedBaseUrl, setResolvedBaseUrl] = useState<string>(() => {
    if (baseUrl && !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
      return baseUrl.replace(/\/+$/, '');
    }
    if (!isLocalHostClient && typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  });
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    if (!resolvedBaseUrl || resolvedBaseUrl.includes('localhost') || resolvedBaseUrl.includes('127.0.0.1')) {
      api.getNetworkInfo()
        .then(info => {
          if (!isMounted) return;
          const url = (info.activeQrBaseUrl && !info.activeQrBaseUrl.includes('localhost') && !info.activeQrBaseUrl.includes('127.0.0.1'))
            ? info.activeQrBaseUrl
            : (info.recommendedBaseUrl && !info.recommendedBaseUrl.includes('localhost') && !info.recommendedBaseUrl.includes('127.0.0.1'))
              ? info.recommendedBaseUrl
              : (typeof window !== 'undefined' ? window.location.origin : '');
          if (url) {
            setResolvedBaseUrl(url.replace(/\/+$/, ''));
          }
        })
        .catch(() => {
          if (isMounted && typeof window !== 'undefined') {
            setResolvedBaseUrl(window.location.origin);
          }
        });
    }
    return () => { isMounted = false; };
  }, [baseUrl, resolvedBaseUrl]);

  // When on localhost, do NOT prematurely default to localhost:3000 to avoid generating broken QR codes for phones
  const activeOrigin = resolvedBaseUrl || (!isLocalHostClient && typeof window !== 'undefined' ? window.location.origin : '');
  const tableUrl = activeOrigin ? `${activeOrigin}/t/${tableId}` : '';

  useEffect(() => {
    if (!tableUrl) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(tableUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0f1123',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
  }, [tableUrl]);

  const copyLink = () => {
    navigator.clipboard.writeText(tableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPNG = () => {
    const link = document.createElement('a');
    link.download = `VivaCity-QR-${tableId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Bar */}
        <div className="p-4 bg-zinc-900 text-white flex items-center justify-between no-print">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Table QR Management
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Dining Table Tent Badge Card */}
        <div className="p-6 flex flex-col items-center text-center bg-white space-y-4">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-xl bg-[#0f1123] p-1.5 mx-auto mb-2 flex items-center justify-center">
              <img
                src="/assets/vivacity-logo.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/vivacity-logo.svg';
                }}
                alt="Vivacity Food Court"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-zinc-500 font-sans">
              Vivacity Food Court
            </h2>
            <div className="text-3xl font-black text-zinc-900 tracking-tight">
              TABLE {tableId}
            </div>
            {zone && <p className="text-[11px] text-zinc-400 font-medium">{zone}</p>}
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl border-2 border-zinc-900 shadow-sm flex items-center justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code for ${tableId}`} className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 bg-zinc-100 animate-pulse rounded-xl" />
            )}
          </div>

          <div className="space-y-1">
            <span className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-black uppercase tracking-wider border border-brand-500/20">
              Scan to Order
            </span>
            <p className="text-[10px] text-zinc-400 max-w-xs pt-1">
              Point your camera at this QR code to access all 6 culinary kitchens and order directly to Table {tableId}.
            </p>
            {tableUrl ? (
              <p className="text-[10px] font-mono text-zinc-500 break-all select-all pt-1 font-semibold">
                {tableUrl}
              </p>
            ) : (
              <p className="text-[10px] text-amber-600 font-medium pt-1">
                Resolving Wi-Fi LAN address...
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 grid grid-cols-3 gap-2 no-print">
          <button
            onClick={copyLink}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 mb-1" /> : <Copy className="w-4 h-4 mb-1" />}
            <span>{copied ? 'Copied' : 'Copy URL'}</span>
          </button>

          <button
            onClick={downloadPNG}
            className="flex flex-col items-center justify-center p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-800 text-[11px] font-bold transition-colors"
          >
            <Download className="w-4 h-4 mb-1 text-brand-600" />
            <span>Download</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-[11px] font-bold transition-colors"
          >
            <Printer className="w-4 h-4 mb-1" />
            <span>Print Badge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
