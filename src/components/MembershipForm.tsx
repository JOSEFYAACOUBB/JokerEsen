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
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [studyLevel, setStudyLevel] = useState('M1');
  const [selectedSpecialty, setSelectedSpecialty] = useState('Business Computing');
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [institutionType, setInstitutionType] = useState<'esen' | 'other'>('esen');
  const [otherFaculty, setOtherFaculty] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    birthDate: '',
  });

  const handleDateChange = (day: string, month: string, year: string) => {
    setBirthDay(day);
    setBirthMonth(month);
    setBirthYear(year);
    if (day && month && year) {
      setFormData((prev) => ({ ...prev, birthDate: `${day}/${month}/${year}` }));
    } else {
      setFormData((prev) => ({ ...prev, birthDate: '' }));
    }
  };

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await fetchFormConfig();
        if (config) {
          setFormConfig(config);
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

    if (institutionType === 'other' && !otherFaculty.trim()) {
      setErrorMessage('Veuillez préciser le nom de votre faculté / établissement.');
      setLoading(false);
      return;
    }

    const finalSpecialty = selectedSpecialty === 'Autre' || customSpecialty.trim()
      ? customSpecialty.trim() || 'Général'
      : selectedSpecialty;

    const finalMajor = `${studyLevel} - ${finalSpecialty}`;
    const selectedFaculty = institutionType === 'esen' ? 'ESEN Manouba' : otherFaculty.trim();

    try {
      const result = await submitRecruitmentApplication({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate,
        major: finalMajor,
        department: selectedFaculty,
        faculty: selectedFaculty,
      });

      if (!result.success && result.error) {
        setErrorMessage(result.error);
      } else {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#A73541', '#4B5B9E', '#7D3F4A', '#E8B9A8', '#2A2020'],
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
    <section id="join" className="py-16 sm:py-24 bg-[#FAF7F5] relative overflow-hidden border-b border-[#EDE4DE]">
      {/* Background Decorative Floating Orbs — Light Brand Palette */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-[#A73541]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#4B5B9E]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-36 h-36 bg-[#E8B9A8]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Dot-grid texture background */}
      <div className="dot-grid opacity-20 pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Split Card Layout — Light Theme */}
        <div className="rounded-[28px] sm:rounded-[36px] bg-[#FFFFFF] p-2.5 sm:p-5 border border-[#E5DDD7] shadow-[0_8px_32px_rgba(43,15,18,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* ── LEFT COLUMN: Warm Light Welcome Panel ── */}
          <div className="lg:col-span-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-b from-[#FAF7F5] via-[#F0EBE7] to-[#FAF7F5] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border border-[#E5DDD7] min-h-[200px] sm:min-h-[280px] lg:min-h-[480px]">
            
            {/* Background pattern lines */}
            <div className="absolute -right-12 top-1/3 w-44 h-44 opacity-15 pointer-events-none">
              <div className="w-full h-full border-4 border-dashed border-[#A73541] rounded-full animate-spin-slow" />
            </div>

            {/* Top Navigation Arrow */}
            <div className="flex items-center justify-between relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFFFF] border border-[#E5DDD7] flex items-center justify-center text-[#A73541] shadow-sm hover:scale-105 transition-transform cursor-pointer">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#A73541]" />
              </div>
            </div>

            {/* Middle Welcome Text */}
            <div className="relative z-10 space-y-2 sm:space-y-3 my-auto py-4 sm:py-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#A73541]/10 border border-[#A73541]/25 text-[#A73541] text-[10px] font-bold tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A73541] animate-pulse" />
                <span>{formConfig.welcome_badge || '05 · RECRUTEMENT 2026'}</span>
              </div>
              <p className="text-[10px] sm:text-xs font-bold text-[#5C1F2E] tracking-wider uppercase">
                {formConfig.welcome_subtitle || 'Salut & Bienvenue !'}
              </p>
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[#A73541] font-display uppercase tracking-tight leading-tight sm:leading-none">
                {formConfig.welcome_title || "Rejoins L'Aventure"}
              </h2>
            </div>

          </div>

          {/* ── RIGHT COLUMN: Clean Light Form Panel ── */}
          <div className="lg:col-span-7 rounded-[22px] sm:rounded-[28px] bg-[#FFFFFF] p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative border border-[#EDE4DE] shadow-sm">
            
            {submitted ? (
              <div className="my-auto py-12 text-center space-y-6">
                <div className="w-20 h-20 bg-[#FAF7F5] rounded-full flex items-center justify-center mx-auto shadow-inner border border-[#A73541]/30">
                  <CheckCircle2 className="w-10 h-10 text-[#A73541]" />
                </div>
                <h3 className="text-3xl font-black text-[#2A2020] font-display uppercase tracking-tight">
                  Demande Envoyée ! 🎉
                </h3>
                <p className="text-sm text-[#2A2020]/80 max-w-md mx-auto leading-relaxed">
                  Merci <strong className="text-[#A73541]">{formData.fullName}</strong> ! Ta candidature a bien été reçue. Notre équipe te contactera sous peu.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-8 py-3.5 rounded-full bg-[#A73541] hover:bg-[#8C2B35] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Soumettre une autre demande
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 my-auto">
                
                {/* Form Heading */}
                <div>
                  <h3
                    className="text-2xl sm:text-3xl font-black text-[#2A2020] tracking-tight font-display"
                  >
                    {formConfig.form_heading || 'Inscris-toi'}
                  </h3>
                  <p
                    className="text-xs text-[#5C1F2E] font-medium mt-1"
                  >
                    {formConfig.form_subheading || 'Complète tes informations pour rejoindre le club JokerEsen.'}
                  </p>
                </div>

                {/* Field 1: Full Name */}
                <div className="space-y-1.5">
                  <label
                    className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider"
                  >
                    Nom &amp; Prénom
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Votre nom et prénom"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-5 pr-12 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-sm outline-none transition-all placeholder-[#9C8F89]"
                    />
                    {formData.fullName.trim().length > 2 && (
                      <CheckCircle2 className="w-5 h-5 text-[#A73541] absolute right-4 top-3.5" />
                    )}
                  </div>
                </div>

                {/* Field 2: Email */}
                <div className="space-y-1.5">
                  <label
                    className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider"
                  >
                    Adresse E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="nom.prenom@esen.tn"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-5 pr-12 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-sm outline-none transition-all placeholder-[#9C8F89]"
                    />
                    {formData.email.includes('@') && (
                      <CheckCircle2 className="w-5 h-5 text-[#A73541] absolute right-4 top-3.5" />
                    )}
                  </div>
                </div>

                {/* Field 3: Phone */}
                <div className="space-y-1.5">
                  <label
                    className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider"
                  >
                    Téléphone / WhatsApp
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="+216 XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-5 pr-12 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-sm outline-none transition-all placeholder-[#9C8F89]"
                    />
                    {formData.phone.trim().length > 7 && (
                      <CheckCircle2 className="w-5 h-5 text-[#A73541] absolute right-4 top-3.5" />
                    )}
                  </div>
                </div>

                {/* Field 4: Date de Naissance */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
                      Date de Naissance
                    </label>
                    {formData.birthDate && (
                      <span className="text-[10px] font-bold text-[#A73541] bg-[#A73541]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#A73541]" />
                        {formData.birthDate}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Jour */}
                    <select
                      aria-label="Jour de naissance"
                      value={birthDay}
                      onChange={(e) => handleDateChange(e.target.value, birthMonth, birthYear)}
                      className="w-full px-3 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none cursor-pointer text-center"
                    >
                      <option value="">Jour</option>
                      {Array.from({ length: 31 }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0');
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>

                    {/* Mois */}
                    <select
                      aria-label="Mois de naissance"
                      value={birthMonth}
                      onChange={(e) => handleDateChange(birthDay, e.target.value, birthYear)}
                      className="w-full px-3 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none cursor-pointer text-center"
                    >
                      <option value="">Mois</option>
                      {[
                        { num: '01', name: 'Jan' },
                        { num: '02', name: 'Fév' },
                        { num: '03', name: 'Mar' },
                        { num: '04', name: 'Avr' },
                        { num: '05', name: 'Mai' },
                        { num: '06', name: 'Juin' },
                        { num: '07', name: 'Juil' },
                        { num: '08', name: 'Août' },
                        { num: '09', name: 'Sep' },
                        { num: '10', name: 'Oct' },
                        { num: '11', name: 'Nov' },
                        { num: '12', name: 'Déc' },
                      ].map((m) => (
                        <option key={m.num} value={m.num}>{m.name}</option>
                      ))}
                    </select>

                    {/* Année */}
                    <select
                      aria-label="Année de naissance"
                      value={birthYear}
                      onChange={(e) => handleDateChange(birthDay, birthMonth, e.target.value)}
                      className="w-full px-3 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none cursor-pointer text-center"
                    >
                      <option value="">Année</option>
                      {Array.from({ length: 36 }, (_, i) => {
                        const val = String(2010 - i);
                        return <option key={val} value={val}>{val}</option>;
                      })}
                    </select>
                  </div>
                </div>

                {/* Field 4: Établissement / Faculté */}
                <div className="space-y-2">
                  <label
                    className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider"
                  >
                    Établissement / Faculté
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInstitutionType('esen');
                        if (studyLevel === 'Ingénieur' || studyLevel === 'Doctorat' || studyLevel === 'Autre') {
                          setStudyLevel('L1');
                        }
                        setSelectedSpecialty('Business Computing');
                      }}
                      className={`py-2.5 px-3 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        institutionType === 'esen'
                          ? 'bg-[#A73541] text-white border-[#A73541] shadow-xs'
                          : 'bg-[#FAF7F5] text-[#2A2020] border-[#E5DDD7] hover:bg-[#F0EBE7]'
                      }`}
                    >
                      ESEN Manouba
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInstitutionType('other');
                      }}
                      className={`py-2.5 px-3 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        institutionType === 'other'
                          ? 'bg-[#A73541] text-white border-[#A73541] shadow-xs'
                          : 'bg-[#FAF7F5] text-[#2A2020] border-[#E5DDD7] hover:bg-[#F0EBE7]'
                      }`}
                    >
                      Autre Faculté
                    </button>
                  </div>

                  {institutionType === 'other' && (
                    <div className="pt-1 animate-in fade-in duration-200">
                      <input
                        type="text"
                        required={institutionType === 'other'}
                        placeholder="Nom de votre faculté / université (ex: FST, ISG, TBS, ENSI...)"
                        value={otherFaculty}
                        onChange={(e) => setOtherFaculty(e.target.value)}
                        className="w-full px-5 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none transition-all placeholder-[#9C8F89]"
                      />
                    </div>
                  )}
                </div>

                {/* Field 5: Niveau d'études & Spécialité */}
                <div className="space-y-2">
                  <label
                    className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider"
                  >
                    Niveau d'études &amp; Spécialité
                  </label>
                  
                  {/* Study Level Pills: ESEN (L1, L2, L3, M1, M2) vs Other (includes Ingénieur, Doctorat, Autre) */}
                  <div className="flex flex-wrap gap-1.5">
                    {(institutionType === 'esen'
                      ? ['L1', 'L2', 'L3', 'M1', 'M2']
                      : ['L1', 'L2', 'L3', 'M1', 'M2', 'Ingénieur', 'Doctorat', 'Autre']
                    ).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setStudyLevel(lvl)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                          studyLevel === lvl
                            ? 'bg-[#A73541] text-white border-[#A73541] shadow-xs scale-105'
                            : 'bg-[#FAF7F5] text-[#2A2020] border-[#E5DDD7] hover:bg-[#F0EBE7]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>

                  {/* Specialty Selector & Custom Write-in */}
                  <div className="space-y-1.5 pt-1">
                    {institutionType === 'esen' ? (
                      <div className="w-full px-5 py-3 rounded-full bg-[#A73541]/8 border border-[#A73541]/25 text-[#A73541] font-bold text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Business Computing
                      </div>
                    ) : (
                      <>
                        <select
                          aria-label="Spécialité / Filière"
                          value={selectedSpecialty}
                          onChange={(e) => setSelectedSpecialty(e.target.value)}
                          className="w-full px-5 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none cursor-pointer"
                        >
                          <option value="Business Computing / Informatique">Business Computing / Informatique</option>
                          <option value="Business Analytics / Data Science & BI">Business Analytics / Data Science &amp; BI</option>
                          <option value="E-Commerce & Marketing Digital">E-Commerce &amp; Marketing Digital</option>
                          <option value="Informatique & Intelligence Artificielle">Informatique &amp; Intelligence Artificielle</option>
                          <option value="Génie Logiciel & Systèmes">Génie Logiciel &amp; Systèmes</option>
                          <option value="Management, Finance & Économie">Management, Finance &amp; Économie</option>
                          <option value="Autre">Autre spécialité (saisie libre)...</option>
                        </select>

                        {selectedSpecialty === 'Autre' && (
                          <div className="pt-1">
                            <input
                              type="text"
                              required={selectedSpecialty === 'Autre'}
                              placeholder="Précisez votre spécialité / filière (ex: Génie Logiciel, Big Data...)"
                              value={customSpecialty}
                              onChange={(e) => setCustomSpecialty(e.target.value)}
                              className="w-full px-5 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none transition-all placeholder-[#9C8F89]"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Error Banner if any */}
                {errorMessage && (
                  <div
                    className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold"
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 pl-8 pr-3 rounded-full bg-[#A73541] text-white font-bold text-sm uppercase shadow-md shadow-[#A73541]/25 hover:bg-[#8C2B35] hover:scale-[1.01] transition-all flex items-center justify-between disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer mt-2"
                >
                  <span>{loading ? 'Envoi en cours...' : 'Rejoindre le Club'}</span>
                  <span className="w-9 h-9 rounded-full bg-white text-[#A73541] flex items-center justify-center font-black text-base shadow-md shrink-0">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#A73541]" /> : '→'}
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
