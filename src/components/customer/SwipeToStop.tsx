import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, VolumeX } from 'lucide-react';

interface SwipeToStopProps {
  onConfirm: () => void;
  label?: string;
  disabled?: boolean;
}

export const SwipeToStop: React.FC<SwipeToStopProps> = ({
  onConfirm,
  label = 'Swipe to Dismiss',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef    = useRef<HTMLDivElement>(null);
  const trackFillRef = useRef<HTMLDivElement>(null);
  const labelRef     = useRef<HTMLDivElement>(null);

  // Drag state refs — zero React re-renders during active drag
  const startXRef     = useRef(0);
  const startYRef     = useRef(0);
  const dragXRef      = useRef(0);
  const maxDragRef    = useRef(180);
  const isDraggingRef = useRef(false);
  const dirRef        = useRef<boolean | null>(null); // true = horizontal, false = vertical
  const pointerIdRef  = useRef<number | null>(null);

  // Visual modes
  const [triggered, setTriggered] = useState(false);
  const [animBack,  setAnimBack]  = useState(false);

  // Measure container bounds: handle is 44px wide, 4px padding each side -> maxDrag = width - 52
  const updateMaxDrag = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.clientWidth;
      maxDragRef.current = Math.max(60, w - 52);
    }
  }, []);

  useEffect(() => {
    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, [updateMaxDrag]);

  // Direct DOM update for smooth movement
  const applyDragDOM = useCallback((x: number) => {
    const max = maxDragRef.current > 0 ? maxDragRef.current : 180;
    const progress = Math.max(0, Math.min(1, x / max));

    if (handleRef.current) {
      handleRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
    }
    if (trackFillRef.current) {
      trackFillRef.current.style.width = `${x + 48}px`;
      const alpha = Math.min(0.45, progress * 0.6);
      trackFillRef.current.style.background =
        progress >= 0.50
          ? `linear-gradient(to right, rgba(16,185,129,0.25), rgba(16,185,129,${alpha}))`
          : `linear-gradient(to right, rgba(255,255,255,0.05), rgba(255,255,255,${alpha}))`;
    }
    if (labelRef.current) {
      labelRef.current.style.opacity = String(Math.max(0, 1 - progress * 2.2));
    }
  }, []);

  // Complete swipe (only called when user passes completion threshold)
  const completeSwipe = useCallback(() => {
    isDraggingRef.current = false;
    applyDragDOM(maxDragRef.current);
    setTriggered(true);

    // Call onConfirm after visual success feedback so user perceives completion
    setTimeout(() => {
      onConfirm();
    }, 180);
  }, [onConfirm, applyDragDOM]);

  // Spring back on incomplete swipe
  const snapBack = useCallback(() => {
    isDraggingRef.current = false;
    dragXRef.current = 0;
    setAnimBack(true);
    applyDragDOM(0);
    setTimeout(() => setAnimBack(false), 260);
  }, [applyDragDOM]);

  // ── Unified Pointer Events ────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || triggered) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return; // only primary mouse button

    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    dragXRef.current = 0;
    dirRef.current = null;
    pointerIdRef.current = e.pointerId;
    setAnimBack(false);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled || triggered) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Detect direction lock
    if (dirRef.current === null) {
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dirRef.current = Math.abs(dx) >= Math.abs(dy); // true = horizontal
      }
    }

    if (dirRef.current === false) return; // user is scrolling vertically

    const clamped = Math.max(0, Math.min(maxDragRef.current, dx));
    dragXRef.current = clamped;
    applyDragDOM(clamped);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      if (pointerIdRef.current !== null && e.currentTarget.hasPointerCapture(pointerIdRef.current)) {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      }
    } catch {}
    pointerIdRef.current = null;

    // Threshold: swipe is successful only if dragged at least 50% across the track
    if (dragXRef.current >= maxDragRef.current * 0.50) {
      completeSwipe();
    } else {
      snapBack();
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      if (pointerIdRef.current !== null && e.currentTarget.hasPointerCapture(pointerIdRef.current)) {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      }
    } catch {}
    pointerIdRef.current = null;
    snapBack();
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || triggered) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      completeSwipe();
    }
  };

  return (
    <div className="w-full max-w-[280px] mx-auto select-none">
      <style>{`
        @keyframes vc-arrow-blink {
          0%, 100% { opacity: 0.35; transform: translateX(-2px); }
          50%      { opacity: 1;    transform: translateX(3px); }
        }
        .vc-blinking-arrow {
          animation: vc-arrow-blink 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* ── Track: Transparent with a subtle thin gray border ── */}
      <div
        ref={containerRef}
        role="slider"
        aria-label="Swipe to dismiss ringing"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={triggered ? 100 : 0}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        className={`relative h-[53px] w-full rounded-full p-1 overflow-hidden flex items-center touch-none
          border transition-colors duration-200
          ${triggered
            ? 'bg-emerald-950/30 border-emerald-500/50'
            : 'bg-transparent border-zinc-600/60 hover:border-zinc-500/80'
          }`}
        style={{ backdropFilter: 'blur(8px)' }}
      >
        {/* Progressive fill */}
        <div
          ref={trackFillRef}
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
          style={{
            width: '48px',
            background: 'linear-gradient(to right, rgba(255,255,255,0.04), rgba(255,255,255,0))',
            transition: animBack ? 'width 260ms cubic-bezier(0.22,1,0.36,1)' : 'none',
          }}
        />

        {/* Track Label */}
        <div
          ref={labelRef}
          className="absolute inset-0 flex items-center justify-center pointer-events-none pl-12 pr-3"
          style={{ opacity: triggered ? 0 : 1, transition: triggered ? 'opacity 0.18s' : 'none' }}
        >
          <span className="text-[11px] font-semibold tracking-wider text-zinc-300 uppercase flex items-center gap-1.5 drop-shadow-sm">
            {label}
            <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          </span>
        </div>

        {/* Draggable Handle with Clearly Visible Blinking Arrow */}
        <div
          ref={handleRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center
            cursor-grab active:cursor-grabbing shadow-md will-change-transform
            border transition-colors duration-200 touch-none
            ${triggered
              ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/40 text-white'
              : 'bg-white/95 border-zinc-300 shadow-black/30 text-zinc-800 hover:bg-white'
            }`}
          style={{
            transform: 'translate3d(0, 0, 0)',
            transition: animBack ? 'transform 260ms cubic-bezier(0.22,1,0.36,1)' : 'none',
          }}
          title="Swipe right to dismiss ringing"
        >
          {triggered ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <ArrowRight className="w-5 h-5 text-zinc-900 stroke-[2.4] vc-blinking-arrow" />
          )}
        </div>
      </div>

      {/* Accessible tap fallback */}
      <div className="flex items-center justify-center pt-1.5">
        <button
          type="button"
          onClick={() => !disabled && !triggered && completeSwipe()}
          className="text-[10px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 cursor-pointer transition-colors"
          aria-label="Tap to stop ringing"
        >
          or tap to stop
        </button>
      </div>
    </div>
  );
};
