import React from 'react';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  return (
    <header className="w-full z-50 py-5 px-6 sm:px-10 bg-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <a href="#">
          <Logo size="sm" showText={false} />
        </a>

        <div className="flex items-center">
          <button
            onClick={onOpenLogin}
            className="px-8 py-3 rounded-full bg-[#3B66FF] text-white font-bold text-sm tracking-wide hover:bg-[#2552E0] hover:scale-105 transition-all duration-200 shadow-lg shadow-[#3B66FF]/30"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
};
