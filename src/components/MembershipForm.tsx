import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { submitRecruitmentApplication } from '../services/recruitmentService';
import { fetchFormConfig, defaultFormConfig } from '../services/formConfigService';
import type { FormConfig } from '../types/database';

export const MembershipForm: React.FC = () => {
  const [formConfig, setFormConfig] = useState<FormConfig>(defaultFormConfig);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    major: defaultFormConfig.majors[0] || 'L1 Business Computing',
    department: defaultFormConfig.departments[0] || 'Événementiel & Animation',
  });

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await fetchFormConfig();
        if (config) {
          setFormConfig(config);
          setFormData((prev) => ({
            ...prev,
            major: config.majors[0] || prev.major,
            department: config.departments[0] || prev.department,
          }));
        }
      } catch (err) {
        console.warn('Error loading form config from Supabase:', err);
      }
    }

    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await submitRecruitmentApplication({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        major: formData.major,
        department: formData.department,
      });

      if (!result.success && result.error) {
        setErrorMessage(result.error);
      } else {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#2563EB', '#3B82F6', '#60A5FA', '#1D4ED8', '#FFFFFF'],
        });
        setSubmitted(true);
      }
    } catch (err: any) {
      setErrorMessage('Une erreur est survenue lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="join" className="py-16 sm:py-24 bg-[#090D16] relative overflow-hidden border-b border-[#3B82F6]/20">
      {/* Background Decorative Floating Orbs */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#1D4ED8]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-36 h-36 bg-[#60A5FA]/15 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Split Card Layout */}
        <div className="rounded-[28px] sm:rounded-[36px] bg-[#0F172A] p-2.5 sm:p-5 border border-[#1E293B] shadow-[0_30px_90px_rgba(0,0,0,0.6)] grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* ── LEFT COLUMN: Blue Glass Welcome Panel ── */}
          <div className="lg:col-span-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-b from-[#1E3A8A] via-[#1E293B] to-[#0F172A] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border border-[#3B82F6]/30 min-h-[200px] sm:min-h-[280px] lg:min-h-[480px]">
            
            {/* Background pattern lines */}
            <div className="absolute -right-12 top-1/3 w-44 h-44 opacity-20 pointer-events-none">
              <div className="w-full h-full border-4 border-dashed border-[#60A5FA] rounded-full animate-spin-slow" />
            </div>

            {/* Top Navigation Arrow */}
            <div className="flex items-center justify-between relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1E293B]/80 backdrop-blur-md border border-[#3B82F6]/40 flex items-center justify-center text-[#60A5FA] shadow-md hover:scale-105 transition-transform cursor-pointer">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#60A5FA]" />
              </div>
            </div>

            {/* Middle Welcome Text */}
            <div className="relative z-10 space-y-2 sm:space-y-3 my-auto py-4 sm:py-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3B82F6]/20 border border-[#60A5FA]/30 text-[#93C5FD] text-[10px] font-bold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
                <span>{formConfig.welcome_badge || '05 · RECRUTEMENT 2026'}</span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-[#93C5FD] tracking-wider uppercase">
                {formConfig.welcome_subtitle || 'Salut & Bienvenue !'}
              </p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#FFFFFF] font-display uppercase tracking-tight leading-tight sm:leading-none">
                {formConfig.welcome_title || "Rejoins L'Aventure"}
              </h2>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Clean White Form Panel ── */}
          <div className="lg:col-span-7 rounded-[22px] sm:rounded-[28px] bg-[#FFFFFF] p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative shadow-lg">
            
            {submitted ? (
              <div className="my-auto py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto shadow-inner border border-[#3B82F6]/30">
                  <CheckCircle2 className="w-10 h-10 text-[#2563EB]" />
                </div>
                <h3 className="text-3xl font-black text-[#0F172A] font-display uppercase tracking-tight">
                  Demande Envoyée ! 🎉
                </h3>
                <p className="text-sm text-[#475569] max-w-md mx-auto leading-relaxed">
                  Merci <strong className="text-[#2563EB]">{formData.fullName}</strong> ! Ta candidature a bien été reçue. Notre équipe te contactera sous peu.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-8 py-3.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/30 transition-all"
                >
                  Soumettre une autre demande
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 my-auto">
                
                {/* Form Heading */}
                <div>
                  <h3
                    className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {formConfig.form_heading || 'Inscris-toi'}
                  </h3>
                  <p
                    className="text-xs text-[#64748B] font-medium mt-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {formConfig.form_subheading || 'Complète tes informations pour rejoindre le club JokerEsen.'}
                  </p>
                </div>

                {/* Field 1: Full Name */}
                <div className="space-y-1.5">
                  <label
                    className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Nom &amp; Prénom
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Mehdi Jlassi"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="w-full pl-5 pr-12 py-3 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white text-[#0F172A] font-semibold text-sm outline-none transition-all placeholder:text-[#94A3B8] placeholder:font-normal"
                    />
                    {formData.fullName.trim().length > 2 && (
                      <CheckCircle2 className="w-5 h-5 text-[#2563EB] absolute right-4 top-3.5" />
                    )}
                  </div>
                </div>

                {/* Field 2: Email */}
                <div className="space-y-1.5">
                  <label
                    className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Adresse E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="mehdi.jlassi@esen.tn"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="w-full pl-5 pr-12 py-3 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white text-[#0F172A] font-semibold text-sm outline-none transition-all placeholder:text-[#94A3B8] placeholder:font-normal"
                    />
                    {formData.email.includes('@') && (
                      <CheckCircle2 className="w-5 h-5 text-[#2563EB] absolute right-4 top-3.5" />
                    )}
                  </div>
                </div>

                {/* Field 3: Phone */}
                <div className="space-y-1.5">
                  <label
                    className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Téléphone / WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="+216 22 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="w-full pl-5 pr-12 py-3 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white text-[#0F172A] font-semibold text-sm outline-none transition-all placeholder:text-[#94A3B8] placeholder:font-normal"
                    />
                    {formData.phone.trim().length > 7 && (
                      <CheckCircle2 className="w-5 h-5 text-[#2563EB] absolute right-4 top-3.5" />
                    )}
                  </div>
                </div>

                {/* Field 4: Major / Filière ESEN */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="select-major"
                    className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Filière ESEN
                  </label>
                  <select
                    id="select-major"
                    aria-label="Filière ESEN"
                    value={formData.major}
                    onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    className="w-full px-5 py-3 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white text-[#0F172A] font-semibold text-xs outline-none cursor-pointer"
                  >
                    {formConfig.majors.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Field 5: Department / Pôle */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="select-department"
                    className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Pôle / Département Souhaité
                  </label>
                  <select
                    id="select-department"
                    aria-label="Pôle / Département Souhaité"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    className="w-full px-5 py-3 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#2563EB] focus:bg-white text-[#0F172A] font-semibold text-xs outline-none cursor-pointer"
                  >
                    {formConfig.departments.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div
                    className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 pl-8 pr-3 rounded-full bg-[#3B66FF] text-white font-bold text-sm uppercase shadow-xl shadow-[#3B66FF]/35 hover:bg-[#2552E0] hover:scale-[1.01] transition-all flex items-center justify-between disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-2"
                >
                  <span>{loading ? 'Envoi en cours...' : 'Rejoindre le Club'}</span>
                  <span className="w-9 h-9 rounded-full bg-white text-[#3B66FF] flex items-center justify-center font-black text-base shadow-md shrink-0">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#3B66FF]" /> : '→'}
                  </span>
                </button>

              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};

export default MembershipForm;
