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
        src="https://res.cloudinary.com/qvnoo1cy/image/upload/f_auto,q_auto,w_240/v1788317705/ltbc0dahw1uwzmcogpvs.png"
        alt="JokerEsen Logo"
        width={96}
        height={76}
        decoding="async"
        className={`${currentSize.imgHeight} w-auto object-contain transition-transform duration-300 hover:scale-105 filter drop-shadow-lg`}
      />
    </div>
  );
};
