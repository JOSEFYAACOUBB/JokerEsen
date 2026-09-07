import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { loginMember, getStoredMembers } from '../services/memberService';
import type { ClubMember } from '../types/member';

interface MemberLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (member: ClubMember) => void;
  onOpenAdminLogin?: () => void;
}

export const MemberLoginModal: React.FC<MemberLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenAdminLogin,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const { member, error: err } = loginMember(identifier, password);
      setLoading(false);

      if (err || !member) {
        setError(err || 'Échec de la connexion');
      } else {
        onLoginSuccess(member);
        onClose();
      }
    }, 400);
  };

  const handleDemoLogin = (demoEmail: string) => {
    setIdentifier(demoEmail);
    setPassword('password123');
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const { member } = loginMember(demoEmail, 'password123');
      setLoading(false);
      if (member) {
        onLoginSuccess(member);
        onClose();
      }
    }, 300);
  };

  const demoMembers = getStoredMembers().slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-7 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-[11px] font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            <span>Portail Officiel Joker ESEN</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
            Connexion Espace Membre
          </h2>
          <p className="text-xs text-blue-200/80 mt-1 font-sans">
            Accédez à vos formations, votre carte digitale et votre classement.
          </p>
        </div>

        {/* Modal Content / Form */}
        <div className="p-6 sm:p-7 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 font-sans">
                Email Universitaire ou Numéro CIN
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="nom.prenom@esen.tn"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-all placeholder-[#9C8F89]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 font-sans">
                Mot de Passe Membre
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-xs font-medium focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Connexion en cours...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-white" />
                  <span className="text-white">Se Connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Presets */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Connexion Rapide Démo</span>
              <span className="text-slate-400">Cliquez pour tester</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoMembers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleDemoLogin(m.email)}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50 hover:border-blue-200 text-left transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-800 group-hover:text-blue-700 truncate">
                    {m.full_name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">{m.role.toUpperCase()} · {m.level}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Footer note & Admin link */}
          <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-2xl flex items-start gap-2 text-[11px] text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span>Les comptes membres sont créés exclusivement par l'administration du bureau Joker ESEN.</span>
              {onOpenAdminLogin && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdminLogin();
                  }}
                  className="block mt-1 font-bold text-amber-900 underline hover:text-amber-700 cursor-pointer"
                >
                  Accéder à la connexion Administrateur &rarr;
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
