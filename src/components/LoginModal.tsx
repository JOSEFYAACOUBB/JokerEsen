import React, { useState } from 'react';
import { X, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { loginMemberAsync } from '../services/memberService';
import type { ClubMember } from '../types/member';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (tab: 'member' | 'admin', member?: ClubMember) => void;
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
      if (activeTab === 'member') {
        // Member authentication via club_members database / local storage
        const { member, error: memberErr } = await loginMemberAsync(email, password);

        if (member && !memberErr) {
          setIsLogged(true);
          setTimeout(() => {
            setIsLogged(false);
            onClose();
            if (onLoginSuccess) {
              onLoginSuccess('member', member);
            }
          }, 800);
        } else {
          setErrorMessage(memberErr || 'Identifiant ou mot de passe membre incorrect.');
        }
        return;
      }

      // Bureau Exécutif / Admin authentication
      let authenticated = false;

      // 1. Check Supabase Auth (if configured)
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password,
          });

          if (!error && data?.user) {
            authenticated = true;
          }
        } catch (authErr) {
          console.warn('Supabase auth attempt skipped:', authErr);
        }
      }

      // 2. Master passkey / Executive Board fallback
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
            onLoginSuccess('admin');
          }
        }, 1000);
      } else {
        setErrorMessage(
          'Email ou mot de passe incorrect.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md anim-backdrop-in" style={{ background: 'rgba(42,32,32,0.6)' }}>
      <div className="relative w-full max-w-md bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 border border-[#EDE4DE] shadow-[0_8px_28px_rgba(43,15,18,0.12)] overflow-y-auto max-h-[90vh] anim-modal-in">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#2A2020] hover:text-[#A73541] hover:bg-[#FAF7F5] rounded-full transition-all duration-200 hover:scale-110 hover:rotate-90 cursor-pointer"
          aria-label="Fermer la modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="text-center space-y-3 mb-6">
          <div className="flex justify-center">
            <Logo size="sm" showText={false} />
          </div>
          
          
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 rounded-full bg-[#F0EBE7] border border-[#E5DDD7] mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setErrorMessage(''); }}
            className={`flex-1 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[#A73541] text-white shadow-sm'
                : 'bg-transparent text-[#2A2020] hover:text-[#A73541]'
            }`}
          >
            Bureau Exécutif
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('member'); setErrorMessage(''); }}
            className={`flex-1 py-2 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'member'
                ? 'bg-[#A73541] text-white shadow-sm'
                : 'bg-transparent text-[#2A2020] hover:text-[#A73541]'
            }`}
          >
            Membre
          </button>
        </div>

        {isLogged ? (
          <div style={{
            textAlign: 'center', padding: '32px 16px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '16px',
          }}>
            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '3px solid #DBEAFE',
                borderTopColor: '#1A56DB',
                animation: 'spin 0.9s linear infinite',
              }} />
              <div style={{
                position: 'absolute', inset: '10px', borderRadius: '50%',
                background: '#1A56DB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', color: '#fff', fontWeight: 900,
              }}>✓</div>
            </div>
            <div>
              <h4 style={{ fontSize: '15px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: '#111827', margin: '0 0 4px', fontFamily: 'inherit' }}>
                Connexion réussie !
              </h4>
              <p style={{ fontSize: '11px', color: '#6B7280', margin: 0 }}>
                Redirection vers l'espace {activeTab === 'admin' ? 'Administration' : 'Membre'}…
              </p>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider mb-1.5 font-display">
                Identifiant / E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A73541] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom.prenom@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FFFFFF] border border-[#EDE4DE] focus:border-[#A73541] text-[#2A2020] placeholder-[#9C8F89] outline-none text-sm font-medium transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider font-display">
                  Mot de passe
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#A73541] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#FFFFFF] border border-[#EDE4DE] focus:border-[#A73541] text-[#2A2020] placeholder-[#9C8F89] outline-none text-sm font-medium transition-all duration-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#A73541] hover:bg-[#8C2B35] text-white font-black text-xs uppercase tracking-wider shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 flex items-center justify-between mt-2 disabled:opacity-75 cursor-pointer"
            >
              <span>{loading ? 'Vérification en cours...' : 'Se Connecter'}</span>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
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
