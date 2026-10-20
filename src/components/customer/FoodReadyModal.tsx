import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../../services/sound';
import { StallReadyConfirmedEvent } from '../../types';
import { Bell, CheckCircle, ChevronRight, Store, VolumeX, UtensilsCrossed } from 'lucide-react';
import { useLocation } from 'wouter';
import { SwipeToStop } from './SwipeToStop';

interface FoodReadyModalProps {
  notification: StallReadyConfirmedEvent;
  /**
   * Called when the customer dismisses / acknowledges the alert.
   * Does NOT mark the food as collected/delivered.
   */
  onDismiss: () => void;
}

export const FoodReadyModal: React.FC<FoodReadyModalProps> = ({
  notification,
  onDismiss,
}) => {
  const [, setLocation] = useLocation();

  // Track alarm audio state so UI can reflect it
  const [audioStatus, setAudioStatus] = useState<'started' | 'blocked' | 'muted' | 'idle'>('idle');
  // Prevent React re-renders from re-starting a stopped alarm
  const alarmStoppedByUser = useRef(false);

  const isTableService = notification.serviceType === 'TABLE_SERVICE';

  // ── Start alarm when modal mounts (loops indefinitely until swiped) ──
  useEffect(() => {
    alarmStoppedByUser.current = false;

    // Mark as played in sound service
    sound.markNotificationPlayed(notification.notificationEventId);

    // Start repeating tit-tit alarm + repeating vibration
    const result = sound.startAlarm();
    setAudioStatus(result);

    // Web Push / Notification API fallback if supported and allowed
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('VIVACITY FOOD COURT — YOUR FOOD IS READY!', {
          body: isTableService
            ? `Token #${notification.token}: ${notification.stallName} is ready! Service staff will deliver to Table ${notification.tableId}.`
            : `Token #${notification.token}: ${notification.stallName} is ready! Please collect from the pickup counter.`,
          icon: '/assets/kiwee-logo-transparent.png',
          tag: notification.notificationEventId
        });
      } catch (e) {
        // Ignored if browser prevents
      }
    }

    // Clean up: stop alarm if component unmounts
    return () => {
      sound.stopAlarm();
    };
  }, [notification.notificationEventId, isTableService, notification.token, notification.stallName, notification.tableId]);

  // If audio was blocked by autoplay, any interaction with the modal attempts to unlock and start the alarm
  useEffect(() => {
    if (audioStatus === 'blocked') {
      const tryUnlock = async () => {
        const ok = await sound.unlockAudioAndStartAlarm();
        if (ok) setAudioStatus('started');
      };
      window.addEventListener('click', tryUnlock, { once: true });
      window.addEventListener('touchstart', tryUnlock, { once: true });
      return () => {
        window.removeEventListener('click', tryUnlock);
        window.removeEventListener('touchstart', tryUnlock);
      };
    }
  }, [audioStatus]);

  // ── Stop alarm + acknowledge notification + return to customer order/tray page ──
  const handleAcknowledgeAndStop = () => {
    alarmStoppedByUser.current = true;
    sound.stopAlarm();
    onDismiss();
    // Return to the relevant customer order / tray page
    setLocation(`/orders/${notification.orderId}`);
  };

  return (
    <>
      {/* ── Full-screen dedicated reminder overlay ── */}
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Your food is ready"
      >
        {/* ── Card ── */}
        <div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden alarm-card my-auto"
          onClick={e => e.stopPropagation()}
          aria-live="assertive"
        >
          {/* ── Header ── */}
          <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-zinc-950 px-6 pt-7 pb-6 text-white text-center overflow-hidden">
            {/* Radiating glow rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-44 rounded-full bg-emerald-400/20 blur-2xl alarm-pulse" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full border border-white/20 alarm-ring" />
            </div>

            {/* Bell & Steaming Food Cloche Animation */}
            <div className="relative flex items-center justify-center gap-3 mb-2">
              <div className="w-16 h-16 rounded-full bg-white/20 ring-4 ring-white/30 flex items-center justify-center alarm-bell-ring shadow-xl">
                <Bell className="w-8 h-8 text-white alarm-bell" />
              </div>

              {/* Animated Food Cloche with Steam */}
              <div className="relative w-16 h-16 flex flex-col items-center justify-center">
                {/* Steam Wisps */}
                <div className="absolute top-1 flex items-center justify-center gap-1.5 pointer-events-none">
                  <span className="w-1 h-3 rounded-full bg-white/70 blur-[0.5px] steam-wisp-1" />
                  <span className="w-1.5 h-4.5 rounded-full bg-white/85 blur-[0.5px] steam-wisp-2" />
                  <span className="w-1 h-3 rounded-full bg-white/70 blur-[0.5px] steam-wisp-3" />
                </div>
                {/* Cloche Dome */}
                <div className="relative mt-3 w-12 h-6 rounded-t-full bg-white/90 shadow-md flex items-center justify-center border-t border-white">
                  <div className="w-2 h-2 rounded-full bg-amber-400 absolute -top-1.5 shadow-xs" />
                </div>
                {/* Cloche Base Tray */}
                <div className="w-14 h-1.5 rounded-full bg-zinc-200 shadow-lg border-b border-zinc-400" />
              </div>
            </div>

            {/* Exact Header Hierarchy */}
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-200 mb-0.5">
              VIVACITY FOOD COURT
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight uppercase text-white drop-shadow-md">
              YOUR FOOD IS READY!
            </h1>

            {/* Service Type Chip & Repeat Call Badge */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm">
                {isTableService ? (
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-300" />
                ) : (
                  <Store className="w-3.5 h-3.5 text-emerald-300" />
                )}
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-100">
                  Service Type: {isTableService ? 'TABLE SERVICE' : 'SELF-SERVICE'}
                </span>
              </div>

              {notification.attempt && notification.attempt > 1 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white border border-amber-300 shadow-md animate-pulse">
                  <Bell className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Repeat Call #{notification.attempt}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Body Content ── */}
          <div className="px-5 py-4 space-y-3">
            {/* Stall Row - Highly Prominent */}
            <div className="flex items-center gap-3.5 p-3.5 bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md text-white font-black">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">
                  Kitchen Ready Stall
                </span>
                <span className="text-base sm:text-lg font-black text-zinc-950 truncate block leading-tight">
                  {notification.stallName}
                </span>
              </div>
            </div>

            {/* Table + Order Token Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Table</p>
                <p className="text-base font-black text-zinc-900">{notification.tableId || 'Takeaway'}</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-3 py-2 text-center">
                <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Order Token</p>
                <p className="text-base font-black text-brand-600">#{notification.token}</p>
              </div>
            </div>

            {/* Guest Details */}
            {(notification.customerName || notification.customerPhone) && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Guest</span>
                <div className="text-right">
                  <span className="font-black text-zinc-900">{notification.customerName || 'Guest'}</span>
                  {notification.customerPhone && (
                    <span className="text-[10px] font-mono text-zinc-500 block">{notification.customerPhone}</span>
                  )}
                </div>
              </div>
            )}

            {/* Ready items */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">
                Ready Food Items
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {notification.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-bold text-zinc-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="ml-2 font-black text-brand-600 shrink-0">
                      × {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Instruction depending on Service Type */}
            <div
              className={`p-3.5 rounded-2xl text-center border ${
                isTableService
                  ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
              }`}
            >
              <p className="text-xs font-black leading-snug">
                {isTableService
                  ? 'Your food is ready. Our service staff will bring it to your table.'
                  : 'Your food is ready. Please collect it from the pickup counter.'}
              </p>
            </div>

            {/* Audio status alerts */}
            {audioStatus === 'blocked' && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-center space-y-1.5">
                <p className="text-xs text-amber-900 font-bold">
                  Browser sound blocked by autoplay policy.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await sound.unlockAudioAndStartAlarm();
                    if (ok) setAudioStatus('started');
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <span>🔊 TAP TO ENABLE ALARM SOUND</span>
                </button>
              </div>
            )}
            {audioStatus === 'muted' && (
              <div className="p-2 bg-zinc-100 border border-zinc-200 rounded-xl text-center">
                <p className="text-[10px] text-zinc-600 font-bold">
                  🔇 Sound muted in settings.
                </p>
              </div>
            )}
          </div>

          {/* ── Swipe-To-Stop Alarm Control ── */}
          <div className="px-5 pb-5 pt-1">
            <SwipeToStop
              onConfirm={handleAcknowledgeAndStop}
              label="Swipe to Dismiss"
            />
          </div>
        </div>
      </div>

      {/* ── Tasteful Animation Keyframes ── */}
      <style>{`
        @keyframes alarmModalIn {
          0%   { transform: scale(0.85) translateY(24px); opacity: 0; }
          65%  { transform: scale(1.02) translateY(-3px); opacity: 1; }
          100% { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes alarmBellSwing {
          0%, 100% { transform: rotate(0deg);   }
          15%      { transform: rotate(14deg);  }
          30%      { transform: rotate(-12deg); }
          45%      { transform: rotate(10deg);  }
          60%      { transform: rotate(-8deg);  }
          75%      { transform: rotate(5deg);   }
          90%      { transform: rotate(-3deg);  }
        }
        @keyframes alarmPulse {
          0%, 100% { transform: scale(1);   opacity: 0.5; }
          50%      { transform: scale(1.35); opacity: 0.2; }
        }
        @keyframes alarmRing {
          0%   { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes steamFloat1 {
          0%   { transform: translateY(4px) scaleX(0.8); opacity: 0; }
          50%  { opacity: 0.8; }
          100% { transform: translateY(-8px) scaleX(1.2); opacity: 0; }
        }
        @keyframes steamFloat2 {
          0%   { transform: translateY(3px) scaleX(0.7); opacity: 0; }
          50%  { opacity: 0.9; }
          100% { transform: translateY(-11px) scaleX(1.3); opacity: 0; }
        }
        @keyframes steamFloat3 {
          0%   { transform: translateY(4px) scaleX(0.8); opacity: 0; }
          50%  { opacity: 0.7; }
          100% { transform: translateY(-8px) scaleX(1.1); opacity: 0; }
        }
        .alarm-card {
          animation: alarmModalIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .alarm-bell {
          animation: alarmBellSwing 0.8s ease-in-out infinite;
          transform-origin: top center;
        }
        .alarm-bell-ring {
          animation: alarmPulse 1.6s ease-in-out infinite;
        }
        .alarm-ring {
          animation: alarmRing 2.2s ease-out infinite;
        }
        .alarm-pulse {
          animation: alarmPulse 2s ease-in-out infinite;
        }
        .steam-wisp-1 { animation: steamFloat1 1.8s ease-out infinite; }
        .steam-wisp-2 { animation: steamFloat2 1.6s ease-out infinite 0.3s; }
        .steam-wisp-3 { animation: steamFloat3 2.0s ease-out infinite 0.6s; }
      `}</style>
    </>
  );
};
