import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const DigiVirusLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* digiVirus modern geometric brand emblem */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5500] to-[#E04400] text-white shadow-md shadow-orange-500/20`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6 text-white"
        >
          {/* Central digital node */}
          <circle cx="18" cy="18" r="4.5" fill="white" />
          {/* Orbital nodes and connection rays */}
          <path
            d="M18 4V9.5M18 26.5V32M4 18H9.5M26.5 18H32"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M8.1 8.1L12 12M24 24L27.9 27.9M8.1 27.9L12 24M24 12L27.9 8.1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
          <circle cx="18" cy="4" r="2" fill="white" />
          <circle cx="18" cy="32" r="2" fill="white" />
          <circle cx="4" cy="18" r="2" fill="white" />
          <circle cx="32" cy="18" r="2" fill="white" />
        </svg>
      </div>

      <div className="flex flex-col leading-tight">
        <div className={`font-extrabold tracking-tight ${textSizes[size]} text-[#111827]`}>
          <span className="text-[#111827]">digi</span>
          <span className="text-[#FF5500]">Virus</span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-500">
            Digital Engineering
          </span>
        )}
      </div>
    </div>
  );
};
