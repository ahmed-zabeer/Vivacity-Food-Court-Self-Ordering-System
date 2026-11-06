import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Stall } from '../../types';
import { useLocation } from 'wouter';
import { Star, Clock, ArrowRight } from 'lucide-react';

export const AllStallsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStalls()
      .then(res => setStalls(res))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-full md:max-w-4xl mx-auto w-full p-4 sm:p-6 pb-4 sm:pb-6 space-y-4 overflow-x-hidden">
      <div className="mb-2">
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">
          All Food Court Stalls
        </h1>
        <p className="text-xs text-zinc-500">
          Pick dishes from one or multiple stalls into your single tray
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stalls.map((stall) => (
          <div
            key={stall.id}
            onClick={() => setLocation(`/stall/${stall.slug}`)}
            className="cursor-pointer bg-white rounded-3xl overflow-hidden border border-zinc-200/90 shadow-2xs hover:border-brand-500/50 hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 w-full bg-zinc-900 overflow-hidden">
                {/* Attractive food background with smooth blur */}
                <img
                  src={stall.coverImage}
                  alt={stall.name}
                  className="w-full h-full object-cover object-center blur-[3px] scale-105 group-hover:scale-110 transition-transform duration-700"
                />
                {/* Subtle dark overlay */}
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

                {/* Centered prominent stall logo or clean text title */}
                <div className="absolute inset-0 flex items-center justify-center p-4 z-10 pointer-events-none">
                  {stall.logo ? (
                    <img
                      src={stall.logo}
                      alt={`${stall.name} Logo`}
                      className="max-h-24 max-w-[80%] w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center px-4 max-w-[85%] select-none">
                      <span className="text-base sm:text-xl font-black tracking-wider text-white uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] leading-tight">
                        {stall.name}
                      </span>
                    </div>
                  )}
                </div>

                <span className="absolute top-3 left-3 z-20 bg-brand-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                  {stall.badge}
                </span>
                <span className="absolute top-3 right-3 z-20 bg-white/95 text-zinc-900 text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{stall.rating}</span>
                </span>
              </div>

              <div className="p-4">
                <h3 className="text-base font-black text-zinc-900 leading-tight">
                  {stall.name}
                </h3>
                <p className="text-xs text-zinc-500 font-semibold line-clamp-1 mt-0.5 uppercase tracking-wide">
                  {stall.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {stall.categories.slice(0, 4).map((c) => (
                    <span key={c} className="text-[10px] font-bold bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md">
                      {c}
                    </span>
                  ))}
                  {stall.categories.length > 4 && (
                    <span className="text-[10px] font-bold text-zinc-400 py-0.5 px-1">
                      +{stall.categories.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 pt-0 flex items-center justify-between text-xs border-t border-zinc-100 mt-2">
              <span className="flex items-center gap-1 text-zinc-500 font-semibold text-[11px]">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {stall.prepTime}
              </span>
              <button
                type="button"
                className="bg-brand-50 text-brand-700 group-hover:bg-brand-500 group-hover:text-white px-3.5 py-1.5 rounded-full font-bold text-xs transition-colors flex items-center gap-1"
              >
                <span>View Kitchen Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
