import React, { useState, useCallback } from 'react';
import { ExecutorWindow } from './components/ExecutorWindow';
import { SplashScreen } from './components/SplashScreen';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [phase, setPhase] = useState<'splash' | 'login' | 'app'>('splash');

  const handleSplashFinished = useCallback(() => {
    setPhase('login');
  }, []);

  const handleLogin = useCallback(() => {
    setPhase('app');
  }, []);

  return (
    <div className="h-screen w-screen bg-[#09090b] overflow-hidden font-sans">
      <style>{`
        [data-sonner-toaster] {
          position: absolute !important;
          right: 16px !important;
          bottom: 16px !important;
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>

      {phase === 'app' && <ExecutorWindow />}
      {phase === 'login' && <LoginScreen onLogin={handleLogin} />}
      {phase === 'splash' && <SplashScreen onFinished={handleSplashFinished} />}
    </div>
  );
}
