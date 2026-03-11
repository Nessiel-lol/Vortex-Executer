import React, { useState, useEffect } from 'react';

export function SplashScreen({ onFinished }: { onFinished: () => void }) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'fadeout'>('logo');

  useEffect(() => {
    // Phase 1: Logo appears (already started)
    const t1 = setTimeout(() => setPhase('text'), 600);      // Show text after 600ms
    const t2 = setTimeout(() => setPhase('fadeout'), 2000);   // Start fade out at 2s
    const t3 = setTimeout(() => onFinished(), 2600);          // Fully done at 2.6s
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] transition-opacity duration-500 ${
        phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <style>{`
        @keyframes vortex-spin {
          0% { transform: scale(0) rotate(-180deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes vortex-glow {
          0%, 100% { filter: drop-shadow(0 0 15px rgba(99,102,241,0.4)); }
          50% { filter: drop-shadow(0 0 30px rgba(129,140,248,0.7)) drop-shadow(0 0 60px rgba(192,132,252,0.3)); }
        }
        @keyframes text-reveal {
          0% { opacity: 0; transform: translateY(12px); letter-spacing: 0.5em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.3em; }
        }
        @keyframes subtitle-reveal {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes line-expand {
          0% { width: 0; opacity: 0; }
          100% { width: 80px; opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0; }
          50% { opacity: 0.3; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .splash-logo {
          animation: vortex-spin 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     vortex-glow 2s ease-in-out infinite 0.8s;
        }
        .splash-title {
          animation: text-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.6s;
          opacity: 0;
        }
        .splash-subtitle {
          animation: subtitle-reveal 0.5s ease-out forwards;
          animation-delay: 1s;
          opacity: 0;
        }
        .splash-line {
          animation: line-expand 0.6s ease-out forwards;
          animation-delay: 0.9s;
          opacity: 0;
        }
        .splash-ring {
          animation: pulse-ring 2s ease-out infinite;
        }
      `}</style>

      {/* Pulse ring behind logo */}
      <div className="absolute">
        <div className="splash-ring w-24 h-24 rounded-full border border-indigo-500/20"></div>
      </div>
      <div className="absolute" style={{ animationDelay: '0.5s' }}>
        <div className="splash-ring w-24 h-24 rounded-full border border-purple-500/10" style={{ animationDelay: '0.7s' }}></div>
      </div>

      {/* Logo */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="splash-logo mb-6"
      >
        <path d="M12 22L21 5H15.5L12 13.5L8.5 5H3L12 22Z" fill="url(#splash-grad)" />
        <defs>
          <linearGradient id="splash-grad" x1="3" y1="5" x2="21" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818cf8" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>

      {/* Title */}
      <h1 className="splash-title text-2xl font-bold text-white tracking-[0.3em] uppercase mb-2">
        VORTEX
      </h1>

      {/* Decorative line */}
      <div className="splash-line h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent mb-3" style={{ width: 0 }}></div>

      {/* Subtitle */}
      <p className="splash-subtitle text-[11px] text-zinc-500 uppercase tracking-[0.2em] font-medium">
        Executor
      </p>
    </div>
  );
}
