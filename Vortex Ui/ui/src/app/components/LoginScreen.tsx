import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!key.trim()) {
      setError('Please enter a license key');
      return;
    }
    setError('');
    setLoading(true);

    // Simulate server check — accept any key for now
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#09090b] overflow-hidden font-sans">
      <style>{`
        @keyframes login-fade-in {
          0% { opacity: 0; transform: translateY(20px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .login-card {
          animation: login-fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .login-logo {
          animation: float 4s ease-in-out infinite;
        }
        .login-shimmer {
          background: linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent);
          background-size: 200% 100%;
          animation: shimmer 3s ease-in-out infinite;
        }
        .glow-orb {
          animation: glow-pulse 4s ease-in-out infinite;
        }
        .login-btn-loading {
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Background orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-500/[0.03] blur-[100px] -top-48 -left-48 glow-orb"></div>
      <div className="absolute w-[400px] h-[400px] rounded-full bg-purple-500/[0.04] blur-[80px] -bottom-32 -right-32 glow-orb" style={{ animationDelay: '2s' }}></div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      ></div>

      {/* Login Card */}
      <div className="login-card relative w-[380px]">
        {/* Card glow border */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-zinc-700/40 via-zinc-800/20 to-zinc-800/40"></div>

        <div className="relative bg-[#111113] rounded-2xl border border-zinc-800/60 overflow-hidden">
          {/* Shimmer line at top */}
          <div className="login-shimmer h-px w-full"></div>

          <div className="px-8 pt-10 pb-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="login-logo mb-4">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]"
                >
                  <path d="M12 22L21 5H15.5L12 13.5L8.5 5H3L12 22Z" fill="url(#login-grad)" />
                  <defs>
                    <linearGradient id="login-grad" x1="3" y1="5" x2="21" y2="22" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#818cf8" />
                      <stop offset="1" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="text-lg font-bold text-white tracking-[0.25em] uppercase">VORTEX</h1>
              <p className="text-[10px] text-zinc-500 mt-1.5 tracking-[0.15em] uppercase font-medium">License Authentication</p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent mb-6"></div>

            {/* Key Input */}
            <div className="space-y-2 mb-5">
              <label className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">License Key</label>
              <div className="relative">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className={`w-full bg-[#0c0c0e] border rounded-xl px-4 py-3 text-sm text-zinc-200 focus:outline-none transition-all duration-300 font-mono tracking-wider placeholder:text-zinc-700 ${
                    error
                      ? 'border-red-500/50 focus:border-red-500/70 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                      : 'border-zinc-800 focus:border-indigo-500/50 focus:shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                  }`}
                  autoFocus
                />
                {/* Input glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-indigo-500/[0.03] to-transparent pointer-events-none"></div>
              </div>
              {error && (
                <p className="text-[11px] text-red-400/80 mt-1 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {error}
                </p>
              )}
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all duration-300 relative overflow-hidden ${
                loading
                  ? 'bg-indigo-500/20 text-indigo-300 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98]'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-20" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Login'
              )}
              {!loading && <div className="absolute inset-0 login-shimmer"></div>}
            </button>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-[9px] text-zinc-600 tracking-wider">
                Vortex Executor v2.1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
