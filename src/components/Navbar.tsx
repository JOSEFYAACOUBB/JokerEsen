import React from 'react';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  return (
    <header className="w-full z-50 py-5 px-6 sm:px-10 bg-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#" className="flex items-center">
          <Logo size="md" showText={true} />
        </a>

        <div className="flex items-center">
          <button
            onClick={onOpenLogin}
            className="px-6 py-2.5 rounded-full bg-[#1A0E15]/90 hover:bg-[#B93A34] text-[#F5EDE4] hover:text-white font-bold text-xs sm:text-sm tracking-wider uppercase border border-[#F3C4A0]/30 hover:border-[#B93A34] transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};
