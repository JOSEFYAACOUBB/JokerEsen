import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Ticket, CheckCircle2, User, Mail, X, Info, ShieldCheck } from 'lucide-react';

interface EventProps {
  eventData?: {
    title: string;
    edition: string;
    date: string;
    location: string;
    program: string;
    bannerUrl: string;
  };
}

export const Event: React.FC<EventProps> = ({ eventData }) => {
  const [isRsvpOpen, setIsRsvpOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Fallback defaults
  const title = eventData?.title || 'Joker Carnival Night 2026';
  const edition = eventData?.edition || 'Édition Spéciale · 10ème Anniversaire';
  const dateText = eventData?.date || 'Samedi 26 Octobre 2026 · 20h00';
  const locationText = eventData?.location || 'Grand Cour & Amphi ESEN, Campus Manouba';
  const programText = eventData?.program || 'Concerts live · DJ set · Buffet · Tombola';
  const bannerUrl = eventData?.bannerUrl || '/images/event_banner.jpg';

  const eventDate = new Date('2026-10-26T20:00:00');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +eventDate - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpSubmitted(true);
    setTimeout(() => {
      setIsRsvpOpen(false);
      setRsvpSubmitted(false);
      setName('');
      setEmail('');
    }, 2500);
  };

  const serialNo = 'JKR-2026-00247';

  return (
    <section
      id="event"
      className="py-16 sm:py-24 lg:py-32 relative overflow-hidden border-b border-[#F3C4A0]/15"
      style={{ backgroundColor: '#0D0608' }}
    >
      {/* Background texture — faint diagonal lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            rgba(243,196,160,0.03) 40px,
            rgba(243,196,160,0.03) 41px
          )`,
        }}
      />

      {/* Ambient glows */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(59,102,255,0.12) 0%, transparent 70%)' }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Section Header - High Energy Asymmetric Placement */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-12">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#3B66FF]/15 border border-[#3B66FF]/35 text-[#93C5FD] text-xs font-bold tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#3B66FF] animate-ping" />
              <span>03 &middot; PROCHAIN RENDEZ-VOUS</span>
            </div>
            <h2
              className="font-black uppercase text-[#F5EDE4] leading-none"
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif",
                fontSize: 'clamp(2.2rem, 5.5vw, 4.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              Upcoming Event
            </h2>
            <p className="text-[#F5EDE4]/60 text-xs sm:text-sm">
              La grande célébration annuelle qui électrise tout le campus ESEN.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-[#3B66FF]/10 border border-[#3B66FF]/30 text-[#93C5FD] text-xs font-bold tracking-wider uppercase">
            <span className="text-[#3B66FF]">✦</span>
            <span>PASS &amp; ACCÈS OUVERTS</span>
          </div>
        </div>

        {/* ── THE TICKET ── */}
        <div className="relative mx-auto" style={{ maxWidth: '960px' }}>

          {/* Ambient glow behind ticket */}
          <div
            className="absolute inset-0 rounded-[2.5rem] blur-3xl opacity-30 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #3B66FF 0%, #1C0F16 60%)', transform: 'scale(0.96) translateY(16px)' }}
          />

          {/* ══ TICKET BODY ══ */}
          <div
            className="relative rounded-3xl sm:rounded-[2.5rem] overflow-hidden"
            style={{
              background: '#111827',
              border: '1.5px solid rgba(59,102,255,0.25)',
              boxShadow: '0 40px 100px rgba(0,0,0,0.75)',
            }}
          >

            {/* ── TOP BANNER ZONE ── full-width cinematic image with overlaid title */}
            <div className="relative h-64 sm:h-72 md:h-80 overflow-hidden">
              <img
                src={bannerUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.45) saturate(1.2)' }}
              />

              {/* Multi-layer gradient overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(17,24,39,0.1) 0%, rgba(17,24,39,0.5) 55%, rgba(17,24,39,1) 100%)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(17,24,39,0.6) 0%, transparent 60%)' }} />

              {/* ADMIT ONE diagonal ribbon */}
              <div
                className="hidden xs:block absolute top-7 -right-10 px-20 py-2 text-[9px] font-black uppercase tracking-[0.3em] text-white"
                style={{ background: '#3B66FF', transform: 'rotate(35deg)', boxShadow: '0 4px 16px rgba(59,102,255,0.6)' }}
              >
                Admit One
              </div>

              {/* Edition pill — top left */}
              <div className="absolute top-4 sm:top-6 left-4 sm:left-7">
                <span
                  className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase text-white"
                  style={{ background: '#3B66FF', boxShadow: '0 3px 14px rgba(59,102,255,0.55)', letterSpacing: '0.1em' }}
                >
                  {edition}
                </span>
              </div>

              {/* Title overlaid on image — bottom left of banner */}
              <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 md:px-12 pb-5 sm:pb-7">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full mb-2 sm:mb-3"
                  style={{ background: 'rgba(59,102,255,0.85)', backdropFilter: 'blur(8px)' }}
                >
                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-white tracking-widest">Club JokerEsen · ESEN Manouba</span>
                </div>
                <h2
                  className="font-black uppercase leading-tight text-white"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', 'Bebas Neue', sans-serif",
                    fontSize: 'clamp(1.4rem, 4vw, 3rem)',
                    letterSpacing: '-0.02em',
                    textShadow: '0 4px 24px rgba(0,0,0,0.8)',
                  }}
                >
                  {title}
                </h2>
              </div>
            </div>

            {/* ── BOTTOM CONTENT ZONE ── two-column: info left, stub right */}
            <div className="flex flex-col lg:flex-row items-stretch">

              {/* ── LEFT: Main Info & Actions ── */}
              <div className="flex-1 p-5 sm:p-8 flex flex-col justify-between gap-5 sm:gap-6 min-w-0">

                {/* Info Cards Grid — 2 columns on top, full-width Programme on bottom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

                  {/* Date & Heure */}
                  <div className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-[#3B66FF]/25 hover:border-[#3B66FF]/50 transition-colors">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center"
                      style={{ background: '#3B66FF', boxShadow: '0 4px 16px rgba(59,102,255,0.45)' }}>
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-[#3B66FF] tracking-wider mb-1">Date &amp; Heure</p>
                      <p className="text-xs sm:text-base font-black text-white leading-snug">{dateText}</p>
                    </div>
                  </div>

                  {/* Lieu */}
                  <div className="flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#3B66FF]/30 transition-colors">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center"
                      style={{ background: '#EEF2FF', boxShadow: '0 4px 14px rgba(59,102,255,0.15)' }}>
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#3B66FF]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase text-[#EEF2FF]/50 tracking-wider mb-1">Lieu</p>
                      <p className="text-xs sm:text-base font-black text-white leading-snug">{locationText}</p>
                    </div>
                  </div>

                  {/* Programme (spans both columns for maximum readability) */}
                  <div className="sm:col-span-2 flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#3B66FF]/30 transition-colors">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0 flex items-center justify-center"
                      style={{ background: '#EEF2FF', boxShadow: '0 4px 14px rgba(59,102,255,0.15)' }}>
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#3B66FF]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase text-[#EEF2FF]/50 tracking-wider mb-1">Programme</p>
                      <p className="text-xs sm:text-base font-black text-white leading-snug">{programText}</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Action Button on Left + Serial & Barcode on Right */}
                <div
                  className="flex flex-wrap items-center justify-between gap-4 pt-4"
                  style={{ borderTop: '1px dashed rgba(59,102,255,0.2)' }}
                >
                  {/* More Info Pill Button */}
                  <button
                    onClick={() => setIsInfoOpen(true)}
                    className="inline-flex items-center gap-2.5 pl-4 sm:pl-5 pr-2 py-1.5 sm:py-2 rounded-full font-bold uppercase text-xs transition-all duration-300 hover:scale-105"
                    style={{
                      background: '#EEF2FF',
                      color: '#3B66FF',
                      letterSpacing: '0.08em',
                      boxShadow: '0 2px 10px rgba(59,102,255,0.15)',
                    }}
                  >
                    <span>Plus d'infos</span>
                    <span className="w-6 h-6 rounded-full bg-[#3B66FF] text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Info className="w-3.5 h-3.5" />
                    </span>
                  </button>

                  {/* Serial Number & Barcode */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="text-right">
                      <p className="text-[8px] text-[#EEF2FF]/40 uppercase font-bold tracking-widest">No. de Billet</p>
                      <p className="font-mono font-black text-[#EEF2FF]/70 text-[11px] sm:text-xs tracking-wider">{serialNo}</p>
                    </div>

                    {/* Barcode Visual */}
                    <div className="flex items-end gap-px opacity-30 h-7 sm:h-8">
                      {[3,6,2,7,4,5,2,6,3,8,2,4,6,3,5,7,2,4,5,3,6,2].map((h, i) => (
                        <div key={i} style={{ width: i % 3 === 0 ? '2.5px' : '1.5px', height: `${h * 3.2}px`, background: '#EEF2FF', borderRadius: '1px' }} />
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* ── PERFORATED DIVIDER (Horizontal on mobile, Vertical on desktop) ── */}
              <div className="relative flex lg:hidden items-center justify-between h-6 w-full px-1 overflow-hidden">
                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full z-20" style={{ background: '#0D0608' }} />
                <div className="w-full h-px border-t border-dashed border-[#3B66FF]/35" />
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full z-20" style={{ background: '#0D0608' }} />
              </div>

              <div className="relative hidden lg:flex flex-col items-center justify-between py-2" style={{ width: '24px', minWidth: '24px' }}>
                {/* Top notch cutout */}
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full z-20"
                  style={{ background: '#0D0608' }}
                />
                {/* Dashed vertical line */}
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px"
                  style={{ background: 'repeating-linear-gradient(to bottom, rgba(59,102,255,0.35) 0px, rgba(59,102,255,0.35) 6px, transparent 6px, transparent 12px)' }}
                />
                {/* Bottom notch cutout */}
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full z-20"
                  style={{ background: '#0D0608' }}
                />
              </div>

              {/* ── RIGHT STUB: Countdown & RSVP CTA ── */}
              <div
                className="flex flex-col justify-between py-5 sm:py-6 px-5 sm:px-6 gap-4 sm:gap-5 lg:w-[210px] shrink-0"
                style={{
                  background: 'linear-gradient(160deg, rgba(59,102,255,0.12) 0%, rgba(17,24,39,0.4) 100%)',
                }}
              >
                {/* Countdown section */}
                <div className="space-y-2.5">
                  <p className="text-center text-[9px] font-black uppercase text-[#3B66FF] tracking-widest">
                    Compte à Rebours
                  </p>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    {[
                      { val: timeLeft.days, label: 'Jours' },
                      { val: timeLeft.hours, label: 'Heures' },
                      { val: timeLeft.minutes, label: 'Mins' },
                      { val: timeLeft.seconds, label: 'Secs' },
                    ].map(({ val, label }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between px-3.5 py-1.5 rounded-full"
                        style={{ background: '#EEF2FF' }}
                      >
                        <span className="text-[9px] text-[#3B66FF]/70 uppercase font-bold tracking-wider">
                          {label}
                        </span>
                        <span className="font-mono font-black text-[#3B66FF] tabular-nums text-sm">
                          {String(val).padStart(2, '0')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RSVP Pill Button */}
                <button
                  onClick={() => setIsRsvpOpen(true)}
                  className="w-full flex items-center justify-between py-2.5 pl-4 pr-1.5 rounded-full font-bold uppercase text-xs text-white transition-all duration-300 hover:scale-105"
                  style={{
                    background: '#3B66FF',
                    letterSpacing: '0.08em',
                    boxShadow: '0 6px 20px rgba(59,102,255,0.45)',
                  }}
                >
                  <span>Réserver</span>
                  <span className="w-7 h-7 rounded-full bg-white text-[#3B66FF] flex items-center justify-center shrink-0 shadow-md">
                    <Ticket className="w-3.5 h-3.5" />
                  </span>
                </button>
              </div>

            </div>
          </div>

          {/* Floor reflection */}
          <div
            className="mx-auto mt-4 h-5 blur-xl opacity-20 rounded-full"
            style={{ background: 'linear-gradient(to right, transparent, #3B66FF, transparent)', maxWidth: '70%' }}
          />
        </div>

      </div>

      {/* ── More Info Modal ── */}
      {isInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,24,0.94)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="relative w-full max-w-2xl rounded-3xl p-5 sm:p-8 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
            style={{
              background: '#111827',
              border: '1.5px solid rgba(59,102,255,0.3)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            }}
          >
            <button
              onClick={() => setIsInfoOpen(false)}
              className="absolute top-4 sm:top-5 right-4 sm:right-5 p-2 rounded-full text-[#EEF2FF]/60 hover:text-white hover:bg-[#3B66FF]/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-full bg-[#3B66FF] flex items-center justify-center text-white shrink-0 shadow-md">
                <Info className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#3B66FF] tracking-widest">Détails de l'événement</span>
                <h3 className="text-2xl font-black text-white uppercase leading-tight font-display">
                  {title}
                </h3>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="space-y-4">
              {/* Program schedule / Highlights */}
              <div className="p-5 rounded-2xl bg-[#EEF2FF]/5 border border-[#3B66FF]/20 space-y-3">
                <div className="flex items-center gap-2 text-[#3B66FF] font-bold text-xs uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>Programme &amp; Highlights</span>
                </div>
                <p className="text-xs sm:text-sm text-white font-medium leading-relaxed bg-[#EEF2FF]/5 p-3.5 rounded-xl border border-white/5">
                  {programText}
                </p>
              </div>

              {/* Location & Access */}
              <div className="p-5 rounded-2xl bg-[#EEF2FF]/5 border border-[#3B66FF]/20 space-y-3">
                <div className="flex items-center gap-2 text-[#3B66FF] font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>Accès &amp; Localisation</span>
                </div>
                <div className="text-xs text-[#EEF2FF]/80 leading-relaxed space-y-1.5">
                  <p>📍 <strong className="text-white">Lieu :</strong> {locationText}</p>
                  <p>📅 <strong className="text-white">Date &amp; Heure :</strong> {dateText}</p>
                  <p>🎟️ <strong className="text-white">Accès :</strong> Ouvert aux étudiants munis de leur réservation / pass gratuit.</p>
                </div>
              </div>

              {/* Rules & Edition details */}
              <div className="p-5 rounded-2xl bg-[#EEF2FF]/5 border border-[#3B66FF]/20 space-y-3">
                <div className="flex items-center gap-2 text-[#3B66FF] font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Édition &amp; Informations Pratiques</span>
                </div>
                <div className="text-xs text-[#EEF2FF]/80 space-y-1.5 leading-relaxed">
                  <p>🎭 <strong className="text-white">Édition :</strong> {edition}</p>
                  <p>🎟️ <strong className="text-white">Entrée :</strong> 100% Gratuite avec réservation préalable en ligne.</p>
                  <p>🎁 <strong className="text-white">Ambiance :</strong> Musique live, animations, buffet &amp; tombola du club Joker ESEN.</p>
                </div>
              </div>
            </div>

            {/* Modal Bottom Action */}
            <div className="mt-6 flex items-center justify-between gap-4 pt-4 border-t border-[#3B66FF]/20">
              <button
                onClick={() => setIsInfoOpen(false)}
                className="px-5 py-2.5 rounded-full text-xs font-bold text-[#EEF2FF]/60 hover:text-white uppercase tracking-wider transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setIsInfoOpen(false);
                  setIsRsvpOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold uppercase text-xs text-white transition-all duration-300 hover:scale-105"
                style={{
                  background: '#3B66FF',
                  boxShadow: '0 4px 16px rgba(59,102,255,0.45)',
                }}
              >
                <span>Réserver maintenant</span>
                <Ticket className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RSVP Modal ── */}
      {isRsvpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(8,12,24,0.94)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="relative w-full max-w-md rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
            style={{
              background: '#111827',
              border: '1.5px solid rgba(59,102,255,0.3)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
            }}
          >
            <button
              onClick={() => setIsRsvpOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#EEF2FF]/60 hover:text-white hover:bg-[#3B66FF]/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {rsvpSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="w-16 h-16 text-[#3B66FF] mx-auto animate-bounce" />
                <h3
                  className="text-2xl font-black uppercase text-white font-display"
                >
                  Pass Réservé !
                </h3>
                <p className="text-sm text-[#EEF2FF]/70">
                  Merci {name} ! Un e-mail de confirmation a été envoyé à {email}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRsvpSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <div className="text-4xl mb-3">🎭</div>
                  <h3
                    className="text-2xl font-black uppercase text-white font-display"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    Pass Joker Carnival
                  </h3>
                  <p className="text-xs font-bold text-[#3B66FF]" style={{ letterSpacing: '0.1em' }}>
                    Entrée gratuite · Étudiants ESEN uniquement
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#EEF2FF]/70 uppercase tracking-wider mb-1.5">Nom et Prénom</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#3B66FF] absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Sara Mansouri"
                      className="w-full pl-10 pr-4 py-3 rounded-full text-white text-sm outline-none transition-colors"
                      style={{
                        background: '#EEF2FF/10',
                        border: '1px solid rgba(59,102,255,0.3)',
                        backgroundColor: 'rgba(238,242,255,0.06)',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B66FF'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(59,102,255,0.3)'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#EEF2FF]/70 uppercase tracking-wider mb-1.5">Adresse E-mail</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#3B66FF] absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sara@esen.tn"
                      className="w-full pl-10 pr-4 py-3 rounded-full text-white text-sm outline-none transition-colors"
                      style={{
                        background: '#EEF2FF/10',
                        border: '1px solid rgba(59,102,255,0.3)',
                        backgroundColor: 'rgba(238,242,255,0.06)',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#3B66FF'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(59,102,255,0.3)'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full font-bold uppercase text-xs text-white transition-all hover:scale-[1.02]"
                  style={{
                    background: '#3B66FF',
                    letterSpacing: '0.12em',
                    boxShadow: '0 6px 24px rgba(59,102,255,0.45)',
                  }}
                >
                  Confirmer ma Réservation
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

