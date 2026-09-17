import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, CheckCircle2, Loader2, ArrowLeft, Plus, Trash2, Check } from 'lucide-react';
import { submitRecruitmentApplication } from '../services/recruitmentService';
import { fetchFormConfig, defaultFormConfig } from '../services/formConfigService';
import type { FormConfig } from '../types/database';

const DEFAULT_SKILL_OPTIONS = [
  'Design & Graphisme (Canva, Photoshop, Figma...)',
  'Montage Vidéo & Audio (CapCut, Premiere...)',
  'Logistique & Décoration (Terrain, organisation)',
  'Rédaction & Scripting (Posts, textes, idées)',
  'Animation & Modération (Prise de parole, MC)',
  'Sponsoring & Négociation',
  'Technique & Web',
];

const DEFAULT_AXIS_OPTIONS = [
  'Santé & Bien-être',
  'Bénévolat & Action sociale',
  'Entrepreneuriat & Innovation',
  'Environnement & Écologie',
];

const DEFAULT_TRAINING_OPTIONS = [
  'Axe Santé',
  'Axe Bénévolat',
  'Axe Entrepreneuriat',
  'Axe Environnement',
];

export const MembershipForm: React.FC = () => {
  const [formConfig, setFormConfig] = useState<FormConfig>(defaultFormConfig);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Step 1 State: Coordonnées
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
    facebookLink: '',
  });

  // Step 2 State: Motivations (Q1 & Q2)
  const [whyJoin, setWhyJoin] = useState('');
  const [eventIdea, setEventIdea] = useState('');

  // Step 3 State: Compétences & Formations (Q3, Q4, Q5)
  // Question 3: Compétences (Requis)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hasOtherSkill, setHasOtherSkill] = useState(false);
  const [otherSkillText, setOtherSkillText] = useState('');

  // Question 4: Axes inspirants (Requis)
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [hasOtherAxis, setHasOtherAxis] = useState(false);
  const [otherAxisText, setOtherAxisText] = useState('');

  // Question 5: Formations souhaitées (Requis)
  const [trainingOptions, setTrainingOptions] = useState<string[]>(DEFAULT_TRAINING_OPTIONS);
  const [selectedTrainings, setSelectedTrainings] = useState<string[]>([]);
  const [hasOtherTraining, setHasOtherTraining] = useState(false);
  const [otherTrainingText, setOtherTrainingText] = useState('');

  // Option Adding State for Question 5
  const [showAddOptionInput, setShowAddOptionInput] = useState(false);
  const [newOptionName, setNewOptionName] = useState('');

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

  // Step 1 -> Step 2 Validation
  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim()) {
      setErrorMessage('Veuillez saisir votre nom et prénom.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Veuillez saisir votre numéro de téléphone.');
      return;
    }
    if (!formData.facebookLink.trim()) {
      setErrorMessage('Veuillez saisir votre lien de profil Facebook.');
      return;
    }
    if (institutionType === 'other' && !otherFaculty.trim()) {
      setErrorMessage('Veuillez préciser le nom de votre faculté / établissement.');
      return;
    }

    setStep(2);
  };

  // Step 2 -> Step 3 Validation
  const handleGoToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStep(3);
  };

  // Skill toggles
  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  // Axis toggles
  const toggleAxis = (axis: string) => {
    setSelectedAxes((prev) =>
      prev.includes(axis) ? prev.filter((a) => a !== axis) : [...prev, axis]
    );
  };

  // Training toggles
  const toggleTraining = (training: string) => {
    setSelectedTrainings((prev) =>
      prev.includes(training) ? prev.filter((t) => t !== training) : [...prev, training]
    );
  };

  // Add Option (Question 5)
  const handleAddTrainingOption = () => {
    if (!newOptionName.trim()) return;
    const opt = newOptionName.trim();
    if (!trainingOptions.includes(opt)) {
      setTrainingOptions((prev) => [...prev, opt]);
      setSelectedTrainings((prev) => [...prev, opt]);
    }
    setNewOptionName('');
    setShowAddOptionInput(false);
  };

  // Remove Option (Question 5)
  const handleRemoveTrainingOption = (optToRemove: string) => {
    setTrainingOptions((prev) => prev.filter((t) => t !== optToRemove));
    setSelectedTrainings((prev) => prev.filter((t) => t !== optToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Question 3 Validation
    const finalSkills = [...selectedSkills];
    if (hasOtherSkill && otherSkillText.trim()) {
      finalSkills.push(`Autre: ${otherSkillText.trim()}`);
    }
    if (finalSkills.length === 0) {
      setErrorMessage('Veuillez sélectionner au moins une compétence ou préciser dans Autre.');
      setLoading(false);
      return;
    }

    // Question 4 Validation
    const finalAxes = [...selectedAxes];
    if (hasOtherAxis && otherAxisText.trim()) {
      finalAxes.push(`Autre: ${otherAxisText.trim()}`);
    }
    if (finalAxes.length === 0) {
      setErrorMessage("Veuillez sélectionner au moins un axe d'activité inspirant ou préciser dans Autre.");
      setLoading(false);
      return;
    }

    // Question 5 Validation
    const finalTrainings = [...selectedTrainings];
    if (hasOtherTraining && otherTrainingText.trim()) {
      finalTrainings.push(`Autre: ${otherTrainingText.trim()}`);
    }
    if (finalTrainings.length === 0) {
      setErrorMessage('Veuillez sélectionner au moins une formation souhaitée ou préciser dans Autre.');
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
        whyJoin,
        eventIdea,
        facebookLink: formData.facebookLink,
        skills: finalSkills,
        activityAxes: finalAxes,
        desiredTrainings: finalTrainings,
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
      {/* Background Decorative Floating Orbs */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-[#A73541]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-[#4B5B9E]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Dot-grid texture background */}
      <div className="dot-grid opacity-20 pointer-events-none" aria-hidden="true" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Split Card Layout */}
        <div className="rounded-[28px] sm:rounded-[36px] bg-[#FFFFFF] p-2.5 sm:p-5 border border-[#E5DDD7] shadow-[0_8px_32px_rgba(43,15,18,0.06)] grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
          
          {/* ── LEFT COLUMN: Welcome Panel ── */}
          <div className="lg:col-span-5 rounded-[22px] sm:rounded-[28px] bg-gradient-to-b from-[#FAF7F5] via-[#F0EBE7] to-[#FAF7F5] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden border border-[#E5DDD7] min-h-[220px] sm:min-h-[280px] lg:min-h-[500px]">
            
            <div className="absolute -right-12 top-1/3 w-44 h-44 opacity-15 pointer-events-none">
              <div className="w-full h-full border-4 border-dashed border-[#A73541] rounded-full animate-spin-slow" />
            </div>

            {/* Top Navigation / Clean Badge */}
            <div className="flex items-center justify-between relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#FFFFFF] border border-[#E5DDD7] flex items-center justify-center text-[#A73541] shadow-sm">
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#A73541]" />
              </div>

              {!submitted && (
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-[#E5DDD7] shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#A73541]" />
                  <span className="text-[11px] font-extrabold text-[#2A2020] uppercase tracking-wider">
                    Étape {step} / 3
                  </span>
                </div>
              )}
            </div>

            {/* Middle Welcome Text */}
            <div className="relative z-10 space-y-2 sm:space-y-3 my-auto py-4 sm:py-6">
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

              {/* Clean Solid Progress Bar (No gradient line!) */}
              {!submitted && (
                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-[#5C1F2E]">
                    <span className={step >= 1 ? 'text-[#A73541]' : 'text-slate-400'}>1. Coordonnées</span>
                    <span className={step >= 2 ? 'text-[#A73541]' : 'text-slate-400'}>2. Motivations</span>
                    <span className={step >= 3 ? 'text-[#A73541]' : 'text-slate-400'}>3. Intérêts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-[#A73541]' : 'bg-[#E5DDD7]'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-[#A73541]' : 'bg-[#E5DDD7]'}`} />
                    <div className={`h-1.5 rounded-full transition-all duration-300 ${step >= 3 ? 'bg-[#A73541]' : 'bg-[#E5DDD7]'}`} />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN: Form Steps ── */}
          <div className="lg:col-span-7 rounded-[22px] sm:rounded-[28px] bg-[#FFFFFF] p-6 sm:p-8 lg:p-10 flex flex-col justify-between relative border border-[#EDE4DE] shadow-sm">
            
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
                  onClick={() => {
                    setSubmitted(false);
                    setStep(1);
                  }}
                  className="px-8 py-3.5 rounded-full bg-[#A73541] hover:bg-[#8C2B35] text-white font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Soumettre une autre candidature
                </button>
              </div>
            ) : step === 1 ? (
              /* ── STEP 1: COORDONNÉES ── */
              <form onSubmit={handleGoToStep2} className="space-y-4 my-auto">
                
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl sm:text-3xl font-black text-[#2A2020] tracking-tight font-display">
                      {formConfig.form_heading || 'Inscris-toi'}
                    </h3>
                    <span className="text-[11px] font-bold text-[#A73541] bg-[#A73541]/10 px-3 py-1 rounded-full">
                      Étape 1 / 3
                    </span>
                  </div>
                  <p className="text-xs text-[#5C1F2E] font-medium mt-1">
                    Saisis tes coordonnées pour commencer.
                  </p>
                </div>

                {/* Field 1: Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
                    Nom &amp; Prénom <span className="text-[#A73541]">*</span>
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
                  <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
                    Adresse E-mail <span className="text-[#A73541]">*</span>
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
                  <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
                    Téléphone / WhatsApp <span className="text-[#A73541]">*</span>
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

                {/* Field Facebook */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
                    Lien Facebook <span className="text-[#A73541]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1877F2] pointer-events-none">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </span>
                    <input
                      type="url"
                      required
                      placeholder="https://facebook.com/ton.profil"
                      value={formData.facebookLink}
                      onChange={(e) => setFormData({ ...formData, facebookLink: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#1877F2] focus:bg-white text-[#2A2020] font-semibold text-sm outline-none transition-all placeholder-[#9C8F89]"
                    />
                    {formData.facebookLink.includes('facebook.com') && (
                      <CheckCircle2 className="w-5 h-5 text-[#1877F2] absolute right-4 top-3.5" />
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

                {/* Field 5: Établissement / Faculté */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
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
                        placeholder="Nom de votre faculté / université (ex: FST, ISG, TBS...)"
                        value={otherFaculty}
                        onChange={(e) => setOtherFaculty(e.target.value)}
                        className="w-full px-5 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-semibold text-xs outline-none transition-all placeholder-[#9C8F89]"
                      />
                    </div>
                  )}
                </div>

                {/* Field 6: Niveau d'études & Spécialité */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-[#5C1F2E] uppercase tracking-wider">
                    Niveau d'études &amp; Spécialité
                  </label>
                  
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
                            ? 'bg-[#A73541] text-white border-[#A73541] shadow-xs'
                            : 'bg-[#FAF7F5] text-[#2A2020] border-[#E5DDD7] hover:bg-[#F0EBE7]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {institutionType === 'esen' ? (
                      <div className="w-full px-5 py-2.5 rounded-full bg-[#A73541]/8 border border-[#A73541]/25 text-[#A73541] font-bold text-xs flex items-center gap-2">
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
                              placeholder="Précisez votre spécialité (ex: Génie Logiciel...)"
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

                {errorMessage && (
                  <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}

                {/* Continue to Step 2 */}
                <button
                  type="submit"
                  className="w-full py-3.5 pl-8 pr-3 rounded-full bg-[#A73541] text-white font-bold text-xs uppercase shadow-md hover:bg-[#8C2B35] transition-all flex items-center justify-between cursor-pointer mt-2"
                >
                  <span>Continuer : Motivations →</span>
                  <span className="w-8 h-8 rounded-full bg-white text-[#A73541] flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                    →
                  </span>
                </button>

              </form>
            ) : step === 2 ? (
              /* ── STEP 2: MOTIVATIONS & PROJETS ── */
              <form onSubmit={handleGoToStep3} className="space-y-5 my-auto animate-in fade-in duration-200">
                
                <div className="flex items-center justify-between border-b border-[#EDE4DE] pb-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A73541] hover:underline cursor-pointer mb-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Coordonnées</span>
                    </button>
                    <h3 className="text-xl font-black text-[#2A2020] font-display">
                      Motivations &amp; Projets
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#A73541] bg-[#A73541]/10 px-3 py-1 rounded-full">
                    Étape 2 / 3
                  </span>
                </div>

                {/* QUESTION 1 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#2A2020]">
                    Question 1 : "Pourquoi veux-tu rejoindre le club JOKER ESEN ?"
                  </label>
                  <p className="text-[11px] text-[#5C1F2E]/70 italic">
                    Why do you want to join the JOKER ESEN club?
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Vos motivations, intérêts et ce que vous souhaitez apporter au club..."
                    value={whyJoin}
                    onChange={(e) => setWhyJoin(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-medium text-xs outline-none transition-all placeholder-[#9C8F89] resize-none"
                  />
                </div>

                {/* QUESTION 2 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#2A2020]">
                    Question 2 : "As-tu une idée d'événement, de projet ou de formation à proposer ?"
                  </label>
                  <p className="text-[11px] text-[#5C1F2E]/70 italic">
                    Do you have an idea for an event, project, or training to propose for the club?
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Idées créatives, concepts d'événements, projets ou thèmes de formation..."
                    value={eventIdea}
                    onChange={(e) => setEventIdea(e.target.value)}
                    className="w-full p-3.5 rounded-2xl bg-[#FAF7F5] border border-[#E5DDD7] focus:border-[#A73541] focus:bg-white text-[#2A2020] font-medium text-xs outline-none transition-all placeholder-[#9C8F89] resize-none"
                  />
                </div>

                {/* Step 2 Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-5 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] text-[#2A2020] font-bold text-xs hover:bg-[#F0EBE7] cursor-pointer"
                  >
                    ← Précédent
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 pl-6 pr-3 rounded-full bg-[#A73541] text-white font-bold text-xs uppercase shadow-md hover:bg-[#8C2B35] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>Continuer : Compétences &amp; Formations →</span>
                    <span className="w-8 h-8 rounded-full bg-white text-[#A73541] flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      →
                    </span>
                  </button>
                </div>

              </form>
            ) : (
              /* ── STEP 3: COMPÉTENCES & FORMATIONS ── */
              <form onSubmit={handleSubmit} className="space-y-5 my-auto animate-in fade-in duration-200">
                
                <div className="flex items-center justify-between border-b border-[#EDE4DE] pb-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#A73541] hover:underline cursor-pointer mb-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>← Motivations</span>
                    </button>
                    <h3 className="text-xl font-black text-[#2A2020] font-display">
                      Compétences &amp; Formations
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#A73541] bg-[#A73541]/10 px-3 py-1 rounded-full">
                    Étape 3 / 3
                  </span>
                </div>

                {/* QUESTION 3 (Requis) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#2A2020]">
                      Question 3 : "Quelles sont tes compétences actuelles ou domaines d'intérêt ?"
                    </label>
                    <span className="text-[10px] font-bold text-[#A73541]">
                      (Requis)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C1F2E]/70 italic">
                    What are your current skills or areas of interest?
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_SKILL_OPTIONS.map((opt) => {
                      const isSelected = selectedSkills.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleSkill(opt)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[#A73541] text-white border-[#A73541] shadow-2xs'
                              : 'bg-[#FAF7F5] border-[#E5DDD7] text-[#2A2020] hover:bg-[#F0EBE7]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setHasOtherSkill(!hasOtherSkill)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                        hasOtherSkill
                          ? 'bg-[#A73541] text-white border-[#A73541] shadow-2xs'
                          : 'bg-[#FAF7F5] border-[#E5DDD7] text-[#2A2020] hover:bg-[#F0EBE7]'
                      }`}
                    >
                      {hasOtherSkill && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span>Autre (Other)</span>
                    </button>
                  </div>

                  {hasOtherSkill && (
                    <input
                      type="text"
                      placeholder="Précisez votre autre compétence..."
                      value={otherSkillText}
                      onChange={(e) => setOtherSkillText(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F5] border border-[#A73541]/40 text-xs text-[#2A2020] outline-none font-medium mt-1"
                    />
                  )}
                </div>

                {/* QUESTION 4 (Requis) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#2A2020]">
                      Question 4 : "Quels sont les axes d'activités qui t'inspirent le plus ?"
                    </label>
                    <span className="text-[10px] font-bold text-[#A73541]">
                      (Requis)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C1F2E]/70 italic">
                    What areas of activities inspire you the most?
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_AXIS_OPTIONS.map((opt) => {
                      const isSelected = selectedAxes.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => toggleAxis(opt)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[#4B5B9E] text-white border-[#4B5B9E] shadow-2xs'
                              : 'bg-[#FAF7F5] border-[#E5DDD7] text-[#2A2020] hover:bg-[#F0EBE7]'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setHasOtherAxis(!hasOtherAxis)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                        hasOtherAxis
                          ? 'bg-[#4B5B9E] text-white border-[#4B5B9E] shadow-2xs'
                          : 'bg-[#FAF7F5] border-[#E5DDD7] text-[#2A2020] hover:bg-[#F0EBE7]'
                      }`}
                    >
                      {hasOtherAxis && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span>Autre (Other)</span>
                    </button>
                  </div>

                  {hasOtherAxis && (
                    <input
                      type="text"
                      placeholder="Précisez votre autre axe inspirant..."
                      value={otherAxisText}
                      onChange={(e) => setOtherAxisText(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F5] border border-[#4B5B9E]/40 text-xs text-[#2A2020] outline-none font-medium mt-1"
                    />
                  )}
                </div>

                {/* QUESTION 5 (Requis + Add option) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#2A2020]">
                      Question 5 : "Quelles formations souhaites-tu suivre au sein du club ?"
                    </label>
                    <span className="text-[10px] font-bold text-[#A73541]">
                      (Requis)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C1F2E]/70 italic">
                    What trainings would you like to follow within the club?
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {trainingOptions.map((opt) => {
                      const isSelected = selectedTrainings.includes(opt);
                      const isCustomDynamic = !DEFAULT_TRAINING_OPTIONS.includes(opt);

                      return (
                        <div
                          key={opt}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-[#5C1F2E] text-white border-[#5C1F2E] shadow-2xs'
                              : 'bg-[#FAF7F5] border-[#E5DDD7] text-[#2A2020] hover:bg-[#F0EBE7]'
                          }`}
                        >
                          <span onClick={() => toggleTraining(opt)} className="flex items-center gap-1.5 cursor-pointer">
                            {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            <span>{opt}</span>
                          </span>

                          {isCustomDynamic && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTrainingOption(opt);
                              }}
                              className="ml-1 p-0.5 rounded text-rose-300 hover:text-white"
                              title="Supprimer cette option"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setHasOtherTraining(!hasOtherTraining)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 border ${
                        hasOtherTraining
                          ? 'bg-[#5C1F2E] text-white border-[#5C1F2E] shadow-2xs'
                          : 'bg-[#FAF7F5] border-[#E5DDD7] text-[#2A2020] hover:bg-[#F0EBE7]'
                      }`}
                    >
                      {hasOtherTraining && <Check className="w-3.5 h-3.5 shrink-0" />}
                      <span>Autre (Other)</span>
                    </button>
                  </div>

                  {hasOtherTraining && (
                    <input
                      type="text"
                      placeholder="Précisez une autre formation..."
                      value={otherTrainingText}
                      onChange={(e) => setOtherTrainingText(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FAF7F5] border border-[#5C1F2E]/40 text-xs text-[#2A2020] outline-none font-medium mt-1"
                    />
                  )}

                  {/* Add Option Button */}
                  <div className="pt-1">
                    {showAddOptionInput ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nom de la nouvelle formation..."
                          value={newOptionName}
                          onChange={(e) => setNewOptionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTrainingOption();
                            }
                          }}
                          className="flex-1 px-4 py-2 rounded-xl bg-[#FAF7F5] border border-[#E5DDD7] text-xs font-medium outline-none focus:border-[#A73541]"
                        />
                        <button
                          type="button"
                          onClick={handleAddTrainingOption}
                          className="px-3.5 py-2 rounded-xl bg-[#A73541] text-white text-xs font-bold hover:bg-[#8C2B35]"
                        >
                          Ajouter
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddOptionInput(false)}
                          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowAddOptionInput(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF7F5] hover:bg-[#F0EBE7] border border-dashed border-[#A73541]/40 text-[#A73541] text-xs font-bold cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ajouter une option (Add an option)</span>
                      </button>
                    )}
                  </div>

                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                    {errorMessage}
                  </div>
                )}

                {/* Final Submission Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-3 rounded-full bg-[#FAF7F5] border border-[#E5DDD7] text-[#2A2020] font-bold text-xs hover:bg-[#F0EBE7] cursor-pointer"
                  >
                    ← Précédent
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3.5 pl-6 pr-3 rounded-full bg-[#A73541] text-white font-bold text-xs uppercase shadow-md hover:bg-[#8C2B35] transition-all flex items-center justify-between disabled:opacity-70 cursor-pointer"
                  >
                    <span>{loading ? 'Envoi en cours...' : 'Soumettre ma candidature'}</span>
                    <span className="w-8 h-8 rounded-full bg-white text-[#A73541] flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin text-[#A73541]" /> : '✓'}
                    </span>
                  </button>
                </div>

              </form>
            )}

          </div>

        </div>

      </div>
    </section>
  );
};

export default MembershipForm;
