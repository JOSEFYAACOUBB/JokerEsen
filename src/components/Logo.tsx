import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', showText = true, size = 'md' }) => {
  const sizeMap = {
    sm: { imgHeight: 'h-14 sm:h-16', text: 'text-xl', subtext: 'text-xs' },
    md: { imgHeight: 'h-16 sm:h-20', text: 'text-2xl', subtext: 'text-xs' },
    lg: { imgHeight: 'h-24', text: 'text-4xl', subtext: 'text-sm' },
    xl: { imgHeight: 'h-32', text: 'text-6xl', subtext: 'text-base' }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <img
        src="/logo.png"
        alt="JokerEsen Logo"
        className={`${currentSize.imgHeight} w-auto object-contain transition-transform duration-300 hover:scale-105 filter drop-shadow-lg`}
      />
      
    </div>
  );
};
