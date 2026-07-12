import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  onActionClick?: () => void;
  actionText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  onActionClick,
  actionText,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fadeIn duration-200">
      <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-tr from-warmAmber/20 to-indigo-500/10 rounded-full blur-xl opacity-70 animate-pulse duration-[3000ms]"></div>
        
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M50 40H110C115.523 40 120 44.4772 120 50V110C120 115.523 115.523 120 110 120H50C44.4772 120 40 115.523 40 110V50C40 44.4772 44.4772 40 50 40Z"
            fill="#FFFDF9"
            stroke="#1A1A1A"
            strokeWidth="3.5"
            strokeLinejoin="round"
            className="dark:fill-[#1E1E1E] dark:stroke-warmBg"
          />
          <path
            d="M60 65H100"
            stroke="#F4A261"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 5"
          />
          <path
            d="M60 80H100"
            stroke="#D1CFC7"
            strokeWidth="3"
            strokeLinecap="round"
            className="dark:stroke-charcoalMuted"
          />
          <path
            d="M60 95H85"
            stroke="#D1CFC7"
            strokeWidth="3"
            strokeLinecap="round"
            className="dark:stroke-charcoalMuted"
          />
          <path
            d="M75 110C75 101.716 81.7157 95 90 95C98.2843 95 105 101.716 105 110C105 118.284 98.2843 125 90 125C81.7157 125 75 118.284 75 110Z"
            fill="#F4A261"
            stroke="#1A1A1A"
            strokeWidth="3.5"
            className="dark:stroke-warmBg"
          />
          <circle cx="85" cy="108" r="2.5" fill="#1A1A1A" className="dark:fill-warmBg" />
          <circle cx="95" cy="108" r="2.5" fill="#1A1A1A" className="dark:fill-warmBg" />
          <path
            d="M87 114C87 114 89 116 93 114"
            stroke="#1A1A1A"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="dark:stroke-warmBg"
          />
          <path
            d="M48 95V55C48 50 52 46 57 46C62 46 66 50 66 55V100C66 107 60 113 53 113C46 113 40 107 40 100V68"
            stroke="#1A1A1A"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="dark:stroke-warmBg"
          />
        </svg>
      </div>

      <h3 className="text-xl font-bold font-sans text-charcoal mb-2">
        {title}
      </h3>
      <p className="text-sm font-sans text-charcoalMuted dark:text-gray-400 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {onActionClick && actionText && (
        <button
          onClick={onActionClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-creamCard dark:bg-charcoalDarkCard text-charcoal font-sans text-sm font-semibold border border-charcoal/10 dark:border-white/10 shadow-soft hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-warmAmber" />
          {actionText}
        </button>
      )}
    </div>
  );
};
