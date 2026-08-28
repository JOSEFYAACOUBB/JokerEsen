import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (tab: 'member' | 'admin') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'member' | 'admin'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLogged, setIsLogged] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      let authenticated = false;

      // 1. Check if Supabase Auth is enabled & valid
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (!error && data?.user) {
          authenticated = true;
        }
      }

      // 2. Master passkey / Club Admin fallback
      // Allows immediate access for the club executive board
      if (
        !authenticated &&
        ((email.trim().toLowerCase() === 'admin@jokeresen.tn' && password === 'joker2026') ||
         (email.trim().toLowerCase() === 'president@jokeresen.tn' && password === 'joker2026') ||
         password === 'joker2026' ||
         password === 'joker_esen_admin')
      ) {
        authenticated = true;
      }

      if (authenticated) {
        setIsLogged(true);
        localStorage.setItem('joker_admin_auth', 'true');
        localStorage.setItem('joker_admin_email', email.trim());
        setTimeout(() => {
          setIsLogged(false);
          onClose();
          if (onLoginSuccess) {
            onLoginSuccess(activeTab);
          }
        }, 1000);
      } else {
        setErrorMessage(
          isSupabaseConfigured
            ? 'Email ou mot de passe incorrect. (Conseil: vous pouvez aussi utiliser le mot de passe maître joker2026)'
            : 'Identifiants invalides. Utilisez le mot de passe maître: joker2026'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
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
            Connectez-vous pour accéder au panneau d'administration et de gestion.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 rounded-full bg-[#1A0E14] border border-[#F3C4A0]/20 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setErrorMessage(''); }}
            className={`flex-1 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'admin'
                ? 'bg-[#B93A34] text-white shadow-md shadow-[#B93A34]/40'
                : 'text-[#F3C4A0]/70 hover:text-white'
            }`}
          >
            Bureau Exécutif (Admin)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('member'); setErrorMessage(''); }}
            className={`flex-1 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'member'
                ? 'bg-[#4E4F9E] text-white shadow-md'
                : 'text-[#F3C4A0]/70 hover:text-white'
            }`}
          >
            Membre Club
          </button>
        </div>

        {isLogged ? (
          <div className="text-center py-8 space-y-3">
            <ShieldCheck className="w-14 h-14 text-[#22C55E] mx-auto animate-bounce" />
            <h4 className="text-2xl font-black text-[#F5EDE4] font-display uppercase">Connexion réussie !</h4>
            <p className="text-xs text-[#F3C4A0]/80">Redirection vers l'espace {activeTab === 'admin' ? 'Administration' : 'Membre'}...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#B93A34]/20 border border-[#B93A34]/50 flex items-start gap-2.5 text-xs text-[#F5EDE4] animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-[#B93A34] shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#F3C4A0]/80 uppercase tracking-wider mb-1">
                Identifiant / E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#F3C4A0]/60 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@jokeresen.tn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#1A0E14] border border-[#F3C4A0]/30 focus:border-[#B93A34] text-[#F5EDE4] placeholder-[#F5EDE4]/30 outline-none text-sm font-medium transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-[#F3C4A0]/80 uppercase tracking-wider">
                  Mot de passe
                </label>
                <span className="text-[10px] text-[#F3C4A0]/50">Défaut: joker2026</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#F3C4A0]/60 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#1A0E14] border border-[#F3C4A0]/30 focus:border-[#B93A34] text-[#F5EDE4] placeholder-[#F5EDE4]/30 outline-none text-sm font-medium transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#B93A34] to-[#7A1F3D] text-white font-bold text-sm uppercase shadow-xl shadow-[#B93A34]/30 hover:opacity-90 transition-all flex items-center justify-between mt-2 disabled:opacity-50"
            >
              <span>{loading ? 'Vérification...' : 'Se Connecter'}</span>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-black text-base shadow-md shrink-0">
                  →
                </span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
