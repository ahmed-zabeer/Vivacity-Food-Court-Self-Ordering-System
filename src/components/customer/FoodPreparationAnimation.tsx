import React from 'react';

interface FoodPrepAnimationProps {
  status: 'NEW' | 'PREPARING' | 'READY' | 'NOTIFIED' | 'COLLECTED';
  stallName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const FoodPreparationAnimation: React.FC<FoodPrepAnimationProps> = ({
  status,
  stallName,
  size = 'md'
}) => {
  const isCooking = status === 'PREPARING';
  const isAwaitingCounter = status === 'READY';
  const isReadyToCollect = status === 'NOTIFIED';
  const isCollected = status === 'COLLECTED';

  const containerSizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 select-none">
      {/* Animation Canvas */}
      <div className={`relative ${containerSizes[size]} flex items-center justify-center`}>
        {/* Glow backdrop based on status */}
        <div
          className={`absolute inset-0 rounded-full blur-xl transition-all duration-700 ${
            isReadyToCollect
              ? 'bg-emerald-400/30 scale-110'
              : isAwaitingCounter
              ? 'bg-amber-400/25 scale-105'
              : isCooking
              ? 'bg-brand-500/25 scale-100 animate-pulse'
              : isCollected
              ? 'bg-blue-400/20'
              : 'bg-zinc-200/40'
          }`}
        />

        {/* State A & B: New / Queued / Waiting */}
        {status === 'NEW' && (
          <div className="relative z-10 flex flex-col items-center justify-center animate-bounce-short">
            <svg
              className="w-12 h-12 text-zinc-400"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="8" y="6" width="32" height="36" rx="4" className="stroke-zinc-400 fill-zinc-50" />
              <line x1="16" y1="14" x2="32" y2="14" className="stroke-zinc-300" />
              <line x1="16" y1="22" x2="28" y2="22" className="stroke-zinc-300" />
              <circle cx="34" cy="34" r="8" className="fill-amber-500 stroke-amber-600" />
              <path d="M34 30v4l3 2" className="stroke-white" />
            </svg>
          </div>
        )}

        {/* State C: Active Chef Cooking (Pan sizzle, Steam curls, Heat flames) */}
        {isCooking && (
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Animated Steam Lines Rising */}
              <g className="animate-steam-rise">
                <path
                  d="M40 32 C38 26 44 22 41 15"
                  stroke="#fb923c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
              <g className="animate-steam-rise-delay">
                <path
                  d="M50 30 C53 23 48 18 51 12"
                  stroke="#fdba74"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              </g>
              <g className="animate-steam-rise">
                <path
                  d="M60 32 C58 25 64 21 61 14"
                  stroke="#fb923c"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>

              {/* Chef Hat atop the station */}
              <g className="animate-chef-bounce">
                <path
                  d="M36 42 C30 42 28 34 35 30 C34 24 45 22 50 26 C55 22 66 24 65 30 C72 34 70 42 64 42 Z"
                  fill="#ffffff"
                  stroke="#18181b"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <rect x="36" y="40" width="28" height="6" rx="2" fill="#ea580c" />
                <rect x="36" y="40" width="28" height="6" rx="2" stroke="#18181b" strokeWidth="1.5" />
              </g>

              {/* Wok / Sizzling Skillet */}
              <g className="animate-pan-sizzle origin-bottom-center">
                {/* Food morsels bouncing in pan */}
                <circle cx="44" cy="58" r="2.5" fill="#f97316" className="animate-food-toss-1" />
                <circle cx="52" cy="56" r="3" fill="#eab308" className="animate-food-toss-2" />
                <circle cx="58" cy="59" r="2" fill="#ef4444" className="animate-food-toss-3" />

                {/* Pan Body */}
                <path
                  d="M30 60 C32 72 68 72 70 60 Z"
                  fill="#27272a"
                  stroke="#18181b"
                  strokeWidth="2.5"
                />
                {/* Pan Handle */}
                <path
                  d="M70 62 L88 66"
                  stroke="#71717a"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </g>

              {/* Induction / Flame Glow beneath pan */}
              <path
                d="M38 74 Q50 78 62 74"
                stroke="#f97316"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="animate-pulse"
              />
            </svg>
          </div>
        )}

        {/* State D: Kitchen Ready — Awaiting Counter Confirmation (Steaming Cloche / Platter) */}
        {isAwaitingCounter && (
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Gentle Steam from under cloche */}
              <g className="animate-steam-rise">
                <path
                  d="M48 24 C51 18 47 14 50 8"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>

              {/* Cloche Dome */}
              <path
                d="M26 62 C26 38 74 38 74 62 Z"
                fill="#fef3c7"
                stroke="#b45309"
                strokeWidth="2.5"
              />
              {/* Cloche Handle */}
              <circle cx="50" cy="34" r="4.5" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />

              {/* Serving Platter Base */}
              <rect x="20" y="62" width="60" height="6" rx="3" fill="#d97706" />
              <rect x="20" y="62" width="60" height="6" rx="3" stroke="#78350f" strokeWidth="2" />

              {/* Clock / Hourglass Badge indicating counter review */}
              <g transform="translate(62, 52)">
                <circle cx="10" cy="10" r="9" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                <path d="M10 6v4l2.5 2.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
              </g>
            </svg>
          </div>
        )}

        {/* State E: Counter Confirmed — Ready for Pickup (Celebratory Golden Cloche & Emerald Check) */}
        {isReadyToCollect && (
          <div className="relative z-10 w-full h-full flex items-center justify-center animate-celebrate-bounce">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Golden sparkles */}
              <circle cx="24" cy="24" r="2.5" fill="#f59e0b" className="animate-ping" />
              <circle cx="76" cy="24" r="2.5" fill="#f59e0b" className="animate-ping" />

              {/* Lifted Cloche revealing steaming delicious meal */}
              <path
                d="M26 46 C26 24 74 24 74 46 Z"
                fill="#ecfdf5"
                stroke="#059669"
                strokeWidth="2.5"
                className="animate-cloche-lift"
              />
              <circle cx="50" cy="22" r="4.5" fill="#10b981" stroke="#059669" strokeWidth="2" />

              {/* Steaming Food on Plate */}
              <ellipse cx="50" cy="62" rx="22" ry="7" fill="#fb923c" />
              <path
                d="M18 64 C18 70 82 70 82 64 Z"
                fill="#ffffff"
                stroke="#18181b"
                strokeWidth="2.5"
              />

              {/* Big Vibrant Emerald Ready Checkmark */}
              <g transform="translate(58, 48)">
                <circle cx="14" cy="14" r="13" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                <path d="M8 14l4 4 8-8" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
          </div>
        )}

        {/* State F: Food Collected */}
        {isCollected && (
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-blue-600"
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="24" cy="24" r="20" className="stroke-blue-200 fill-blue-50" />
              <path d="M14 24l7 7 13-13" className="stroke-blue-600" />
            </svg>
          </div>
        )}
      </div>

      {/* Embedded CSS for smooth lightweight keyframes */}
      <style>{`
        @keyframes steamRise {
          0% { transform: translateY(0) scaleX(1); opacity: 0.9; }
          50% { transform: translateY(-7px) scaleX(1.15); opacity: 0.6; }
          100% { transform: translateY(-14px) scaleX(1.3); opacity: 0; }
        }
        @keyframes panSizzle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-2.5deg) translateY(-1px); }
          75% { transform: rotate(2.5deg) translateY(0.5px); }
        }
        @keyframes chefBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes foodToss1 {
          0%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px) translateX(2px); }
        }
        @keyframes foodToss2 {
          0%, 100% { transform: translateY(0); }
          60% { transform: translateY(-9px) translateX(-2px); }
        }
        @keyframes foodToss3 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes clocheLift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-steam-rise {
          animation: steamRise 1.8s infinite ease-out;
        }
        .animate-steam-rise-delay {
          animation: steamRise 1.8s infinite ease-out 0.6s;
        }
        .animate-pan-sizzle {
          animation: panSizzle 0.35s infinite linear;
        }
        .animate-chef-bounce {
          animation: chefBounce 1.2s infinite ease-in-out;
        }
        .animate-food-toss-1 {
          animation: foodToss1 0.7s infinite ease-in-out;
        }
        .animate-food-toss-2 {
          animation: foodToss2 0.85s infinite ease-in-out 0.15s;
        }
        .animate-food-toss-3 {
          animation: foodToss3 0.65s infinite ease-in-out 0.3s;
        }
        .animate-cloche-lift {
          animation: clocheLift 2s infinite ease-in-out;
        }
        .animate-bounce-short {
          animation: chefBounce 2s infinite ease-in-out;
        }
        .animate-celebrate-bounce {
          animation: chefBounce 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};
