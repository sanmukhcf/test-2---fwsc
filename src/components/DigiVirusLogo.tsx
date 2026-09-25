import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  subtitleText?: string;
  variant?: 'full' | 'mark';
}

export const DigiVirusLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  subtitleText = 'By Lab of digiVirus',
  variant = 'full'
}) => {
  const heightClasses = {
    sm: 'h-6 sm:h-7',
    md: 'h-8 sm:h-9',
    lg: 'h-10 sm:h-11',
    xl: 'h-13 sm:h-14'
  };

  const markHeightClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
    xl: 'h-14 w-14'
  };

  const imageSrc = variant === 'mark' ? '/digivirus-mark.png' : '/digivirus-logo.png';

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* Official digiVirus PNG logo image asset */}
      <img
        src={imageSrc}
        alt="digiVirus"
        referrerPolicy="no-referrer"
        className={`${variant === 'mark' ? markHeightClasses[size] : heightClasses[size]} w-auto object-contain shrink-0 block mx-auto`}
      />
      {showSubtitle && (
        <span className="text-[10px] font-bold tracking-normal text-neutral-500 mt-1 text-center whitespace-nowrap block leading-tight">
          {subtitleText}
        </span>
      )}
    </div>
  );
};

