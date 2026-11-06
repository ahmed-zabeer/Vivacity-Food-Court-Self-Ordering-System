import React, { useState, useEffect } from 'react';
import { useTableSession } from '../../context/TableSessionContext';

interface BrandSplashProps {
  onFinish?: () => void;
  forceShow?: boolean;
}

export const BrandSplash: React.FC<BrandSplashProps> = ({
  onFinish,
  forceShow = false,
}) => {
  const { tableId } = useTableSession();
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!visible && onFinish) {
      onFinish();
    }
  }, [visible, onFinish]);

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setFading(false);
      setProgress(0);
    }
  }, [forceShow]);

  useEffect(() => {
    if (!visible) return;

    // Branded intro screen appears for exactly 2 seconds (2000ms) on every refresh/reload
    const DISPLAY_DURATION_MS = 2000;
    const interval = 25; // 40 updates/sec for smooth progress bar animation
    const step = (interval / DISPLAY_DURATION_MS) * 100;

    const progressInterval = setInterval(() => {
      setProgress((p) => {
        const next = p + step;
        if (next >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return next;
      });
    }, interval);

    const timer = setTimeout(() => {
      dismiss();
    }, DISPLAY_DURATION_MS);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [visible]);

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      if (onFinish) onFinish();
    }, 300);
  };

  if (!visible) return null;

  return (
    <>
      {/* ── Fast Lightweight Keyframes ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

        @keyframes vc-logo-fade {
          0%   { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1);   }
        }
        @keyframes vc-title-reveal {
          0%   { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0);    }
        }
        @keyframes vc-sub-reveal {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0);    }
        }
        @keyframes vc-sheen {
          0%   { transform: translateX(-160%) skewX(-22deg); opacity: 0; }
          40%  { opacity: 0.6; }
          100% { transform: translateX(260%)  skewX(-22deg); opacity: 0; }
        }
        @keyframes vc-glow-pulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1);    opacity: 0.45; }
          50%       { transform: translate(-50%,-50%) scale(1.12); opacity: 0.70; }
        }
        @keyframes vc-exit {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }

        .vc-logo-fade    { animation: vc-logo-fade    0.35s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .vc-title-reveal { animation: vc-title-reveal 0.40s cubic-bezier(0.16,1,0.3,1) 0.12s both; }
        .vc-sub-reveal   { animation: vc-sub-reveal   0.35s cubic-bezier(0.16,1,0.3,1) 0.20s both; }
        .vc-footer-reveal{ animation: vc-sub-reveal   0.35s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
        .vc-tagline-reveal{ animation: vc-sub-reveal  0.35s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
        .vc-sheen        { animation: vc-sheen        1.1s  ease-in-out               0.30s 1; }
        .vc-glow         {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: min(700px, 95vw); height: min(700px, 95vw);
          border-radius: 9999px;
          background: radial-gradient(ellipse at center,
            rgba(157,67,0,0.28) 0%,
            rgba(224,109,36,0.18) 45%,
            rgba(251,191,36,0.10) 75%,
            transparent 100%);
          filter: blur(120px);
          pointer-events: none;
          animation: vc-glow-pulse 4s ease-in-out infinite;
        }
        .vc-splash-exit {
          animation: vc-exit 0.30s ease-out forwards;
        }
      `}</style>

      <div
        className={`fixed inset-0 z-[9999] w-full max-w-full h-full min-h-screen bg-[#08090b] text-white
          flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-8 md:py-10
          overflow-x-hidden overflow-y-auto select-none ${fading ? 'vc-splash-exit' : ''}`}
      >
        {/* ── Ambient glow ── */}
        <div className="vc-glow" />
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-600/10 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-orange-700/10 blur-[110px]" />

        {/* ── Top bar ── */}
        <header className="relative z-10 w-full max-w-4xl flex items-center justify-between px-1 sm:px-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            {/*<span className="text-[10px] md:text-xs tracking-[0.22em] font-semibold uppercase text-zinc-400">
              Unified Dining OS
            </span>*/}
          </div>
          <button
            onClick={dismiss}
            className="group flex items-center gap-1.5 text-xs font-semibold tracking-wider
              text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 active:scale-95
              border border-white/10 hover:border-amber-500/40 rounded-full px-3.5 sm:px-4 py-1.5
              transition-all backdrop-blur-md cursor-pointer shrink-0"
          >
            <span>Skip</span>
            <span className="font-bold group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </button>
        </header>

        {/* ── Centrepiece ── */}
        <main className="relative z-10 flex flex-col items-center text-center my-auto px-2 sm:px-4 max-w-xl md:max-w-2xl w-full">
          <div className="flex flex-col items-center text-center w-full gap-2">
            {/* Vivacity Food Court Logo — Noticeably larger, properly centered & responsive */}
            <div className="vc-logo-fade relative flex items-center justify-center">
              <div className="absolute -inset-4 sm:-inset-6 rounded-full bg-gradient-to-r from-orange-600/30 via-red-600/35 to-amber-500/20 blur-2xl opacity-75 pointer-events-none" />

              <img
                src="/assets/vivacity-logo1.png"
                alt="Vivacity Food Court"
                className="relative w-64 sm:w-80 md:w-96 lg:w-[26rem] max-w-[85vw] h-auto object-contain drop-shadow-2xl"
              />
            </div>

            {/* powered by [NEW OFFICIAL KIWEE LOGO] — Compact, cohesive, centered */}
            <div className="vc-sub-reveal inline-flex items-center justify-center gap-2 sm:gap-2.5 flex-nowrap">
              <span className="text-xs sm:text-sm font-medium text-zinc-400 tracking-wider lowercase select-none">
                powered by
              </span>
              <div className="inline-flex items-center shrink-0">
                <img
                  src="/assets/kiwee-logo-transparent.png"
                  alt="Kiwee Tech"
                  className="h-6 sm:h-7 md:h-7 w-auto object-contain filter brightness-0 invert opacity-95 shrink-0"
                />
              </div>
            </div>

            {/* Tagline: Premium Food Court Experience */}
            <div className="vc-tagline-reveal flex items-center justify-center gap-2 sm:gap-3 px-2 w-full">
              <div className="h-px flex-1 max-w-[36px] sm:max-w-[60px] md:max-w-[80px] bg-gradient-to-r from-transparent to-amber-500/60" />
              <div
                className="flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full
                  bg-white/5 border border-amber-500/25 backdrop-blur-sm shrink-0 shadow-xs"
              >
                <span className="text-[10px] sm:text-xs font-bold tracking-[0.22em] sm:tracking-[0.26em] uppercase text-amber-400/95">
                  Premium Food Court Experience
                </span>
              </div>
              <div className="h-px flex-1 max-w-[36px] sm:max-w-[60px] md:max-w-[80px] bg-gradient-to-l from-transparent to-amber-500/60" />
            </div>

            {/* Subtitle */}
            <p className="vc-sub-reveal text-xs sm:text-sm text-zinc-400 max-w-md tracking-wide leading-relaxed px-3 font-medium">
              Smart Table Ordering by Yourself
            </p>
          </div>
        </main>

        {/* ── Footer: table pill + progress ── */}
        <footer className="vc-footer-reveal relative z-10 w-full max-w-md px-3 flex flex-col items-center gap-2.5 sm:gap-3">
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full
              bg-zinc-900/90 border border-zinc-700/50 shadow-2xl backdrop-blur-md max-w-full"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="tracking-wider uppercase text-[10px] sm:text-[11px] font-bold text-zinc-300 truncate">
              Connected to{' '}
              <strong className="text-amber-400 font-extrabold tracking-normal">
                Table {tableId || 'T17'}
              </strong>{' '}
              • Dine-In Session
            </span>
          </div>

          {/* Fast Progress bar */}
          <div className="w-36 sm:w-44 h-[3px] bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-[#e06d24] rounded-full transition-all ease-linear"
              style={{ width: `${progress}%`, transitionDuration: '40ms' }}
            />
          </div>
          <span className="text-[9px] tracking-[0.20em] text-zinc-500 uppercase font-medium">
            Entering Food Court…
          </span>
        </footer>
      </div>
    </>
  );
};
