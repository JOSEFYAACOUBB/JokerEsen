import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: { imgHeight: 'h-14 sm:h-16' },
    md: { imgHeight: 'h-16 sm:h-20' },
    lg: { imgHeight: 'h-24' },
    xl: { imgHeight: 'h-32' }
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
