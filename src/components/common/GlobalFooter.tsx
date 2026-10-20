import React from 'react';

interface GlobalFooterProps {
  className?: string;
  isDark?: boolean;
}

export const GlobalFooter: React.FC<GlobalFooterProps> = ({ className = '', isDark = false }) => {
  return (
    <footer
      className={`w-full py-2 px-4 flex items-center justify-center select-none ${
        isDark ? 'text-zinc-400' : 'text-zinc-600'
      } ${className}`}
      role="contentinfo"
      aria-label="Branding Footer"
    >
      <div className="inline-flex items-center justify-center gap-2 sm:gap-2.5 flex-nowrap shrink-0">
        <span
          className={`text-[11px] sm:text-xs font-normal tracking-normal whitespace-nowrap select-none ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          Powered by
        </span>

        <div className="inline-flex items-center shrink-0">
          <img
            src="/assets/kiwee-logo-transparent.png"
            alt="Kiwee Tech"
            className={`h-7 sm:h-8 md:h-8 w-auto object-contain shrink-0 ${
              isDark ? 'brightness-0 invert opacity-95' : 'brightness-0 opacity-90'
            }`}
          />
        </div>
      </div>
    </footer>
  );
};
