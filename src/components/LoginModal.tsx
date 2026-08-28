import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (tab: 'member' | 'admin') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'member' | 'admin'>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogged, setIsLogged] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogged(true);
    setTimeout(() => {
      setIsLogged(false);
      onClose();
      if (onLoginSuccess) {
        onLoginSuccess(activeTab);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#25121B] rounded-3xl p-6 sm:p-8 border-2 border-[#F3C4A0]/40 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#F3C4A0] hover:text-[#B93A34] hover:bg-[#1A0E14] rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="flex justify-center">
            <Logo size="sm" showText={false} />
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-[#F5EDE4] font-display uppercase tracking-wider">
            Espace JokerEsen
          </h3>
          <p className="text-xs text-[#F5EDE4]/70 font-medium">
            Connectez-vous pour accéder au portail interne et à l'intranet.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 rounded-full bg-[#EEF2FF] mb-6">
          <button
            onClick={() => setActiveTab('member')}
            className={`flex-1 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'member'
                ? 'bg-[#3B66FF] text-white shadow-md'
                : 'text-[#3B66FF] hover:bg-[#E0E7FF]'
            }`}
          >
            Membre Club
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'admin'
                ? 'bg-[#3B66FF] text-white shadow-md'
                : 'text-[#3B66FF] hover:bg-[#E0E7FF]'
            }`}
          >
            Bureau Exécutif
          </button>
        </div>

        {isLogged ? (
          <div className="text-center py-8 space-y-3">
            <ShieldCheck className="w-14 h-14 text-[#3B66FF] mx-auto animate-bounce" />
            <h4 className="text-2xl font-black text-[#0F172A] font-display uppercase">Connexion réussie !</h4>
            <p className="text-xs text-[#64748B]">Redirection vers l'espace {activeTab === 'admin' ? 'Administration' : 'Membre'}...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1">Identifiant / E-mail ESEN</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#3B66FF] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.nom@esen.tn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#3B66FF] text-[#0F172A] outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider">Mot de passe</label>
                <a href="#" className="text-[11px] font-bold text-[#3B66FF] hover:underline">Oublié ?</a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#3B66FF] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#3B66FF] text-[#0F172A] outline-none text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 sm:py-3 pl-6 sm:pl-8 pr-2 sm:pr-3 rounded-full bg-[#3B66FF] text-white font-bold text-sm sm:text-base uppercase shadow-xl shadow-[#3B66FF]/35 hover:bg-[#2552E0] transition-all flex items-center justify-between mt-2"
            >
              <span>Se Connecter</span>
              <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white text-[#3B66FF] flex items-center justify-center font-black text-base sm:text-lg shadow-md shrink-0">
                →
              </span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
