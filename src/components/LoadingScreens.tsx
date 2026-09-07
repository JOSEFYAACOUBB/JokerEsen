import React from 'react';

/** Minimal full-screen loader — white + blue palette */
export const AppLoader: React.FC = () => (
  <div style={{
    position: 'fixed', inset: 0,
    background: '#fff',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '24px', zIndex: 9999,
  }}>
    {/* Simple dual-ring spinner */}
    <div style={{ position: 'relative', width: '48px', height: '48px' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '3px solid #E8F0FE',
        borderTopColor: '#1A56DB',
        animation: 'spinL 0.9s linear infinite',
      }} />
    </div>
    {/* Wordmark */}
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '15px', fontWeight: 800, letterSpacing: '3px',
        textTransform: 'uppercase', color: '#111827',
        fontFamily: 'Montserrat, sans-serif',
      }}>
        JOKER<span style={{ color: '#1A56DB' }}>ESEN</span>
      </div>
      <div style={{
        fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase',
        color: '#9CA3AF', marginTop: '3px',
        fontFamily: 'Montserrat, sans-serif', fontWeight: 600,
      }}>
        Chargement…
      </div>
    </div>
    <style>{`@keyframes spinL{to{transform:rotate(360deg)}}`}</style>
  </div>
);

/** Minimal admin lazy-load skeleton */
export const AdminLoader: React.FC = () => (
  <div style={{
    minHeight: '100vh', background: '#F9FAFB',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '20px',
  }}>
    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '3px solid #DBEAFE',
        borderTopColor: '#1A56DB',
        animation: 'spinL 0.9s linear infinite',
      }} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <p style={{
        fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
        textTransform: 'uppercase', color: '#374151',
        fontFamily: 'Montserrat, sans-serif', margin: 0,
      }}>
        Administration
      </p>
      <p style={{
        fontSize: '10px', color: '#9CA3AF', marginTop: '4px',
        fontFamily: 'Montserrat, sans-serif', letterSpacing: '1px',
      }}>
        Panneau Joker ESEN
      </p>
    </div>
    {/* Skeleton bars */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '200px' }}>
      {[80, 60, 70].map((w, i) => (
        <div key={i} style={{
          height: '6px', width: `${w}%`, borderRadius: '99px',
          background: '#E5E7EB', overflow: 'hidden', margin: '0 auto',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg,transparent,#BFDBFE,transparent)',
            backgroundSize: '200% 100%',
            animation: `skm 1.6s ease-in-out ${i * 0.2}s infinite`,
          }} />
        </div>
      ))}
    </div>
    <style>{`@keyframes spinL{to{transform:rotate(360deg)}}@keyframes skm{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
  </div>
);

/** 404 — Page introuvable (minimal, white + blue) */
export const NotFoundPage: React.FC<{ onGoHome?: () => void }> = ({ onGoHome }) => (
  <div style={{
    minHeight: '100vh', background: '#F9FAFB',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '24px', fontFamily: 'Montserrat, sans-serif',
  }}>
    <div style={{
      textAlign: 'center', maxWidth: '400px', width: '100%',
      background: '#fff', border: '1px solid #E5E7EB',
      borderRadius: '24px', padding: '48px 32px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    }}>
      {/* Brand */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: '#111827' }}>
          JOKER<span style={{ color: '#1A56DB' }}>ESEN</span>
        </div>
      </div>
      {/* 404 */}
      <div style={{
        fontSize: '80px', fontWeight: 900, lineHeight: 1,
        color: '#1A56DB', letterSpacing: '-4px', marginBottom: '4px',
        opacity: 0.9,
      }}>
        404
      </div>
      <div style={{ fontSize: '28px', marginBottom: '16px' }}>🃏</div>
      <h1 style={{
        fontSize: '18px', fontWeight: 800, textTransform: 'uppercase',
        letterSpacing: '1px', color: '#111827', margin: '0 0 8px',
      }}>
        Page Introuvable
      </h1>
      <p style={{
        fontSize: '13px', color: '#6B7280', lineHeight: 1.7,
        margin: '0 0 28px',
      }}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <button
        onClick={onGoHome}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#1A56DB', color: '#fff', border: 'none',
          borderRadius: '999px', padding: '12px 28px',
          fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px',
          textTransform: 'uppercase', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(26,86,219,0.3)',
          transition: 'all 0.2s ease', fontFamily: 'Montserrat, sans-serif',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1648C0'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A56DB'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
      >
        ← Retour à l'Accueil
      </button>
      <div style={{ marginTop: '20px', fontSize: '10px', color: '#D1D5DB', letterSpacing: '1px' }}>
        Code d'erreur : <span style={{ color: '#1A56DB', fontWeight: 700 }}>404</span>
      </div>
    </div>
  </div>
);
