import { useState, useEffect } from 'react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 500);
          }, 200);
          return 100;
        }
        return prev + 0.55;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
         style={{ background: '#0a0a0f' }}>
      
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Minimal logo */}
        <div className="relative mb-16">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', boxShadow: '0 0 60px rgba(99, 102, 241, 0.3)' }}>
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          {/* Pulse ring */}
          <div className="absolute -inset-4 rounded-3xl border border-white/10" style={{ animation: 'pulse-ring 2s ease-out infinite' }} />
        </div>
        
        {/* Title */}
        <h1 className="text-4xl font-light text-white tracking-tight mb-2" style={{ fontFamily: 'system-ui' }}>
          CodeFeedback
        </h1>
        <p className="text-sm text-white/30 tracking-[0.4em] uppercase mb-16">Studio</p>
        
        {/* Progress bar */}
        <div className="w-48 h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-100"
               style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
        </div>
        
        <p className="mt-4 text-xs text-white/20 font-mono">{Math.round(progress)}%</p>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { opacity: 0.5; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
