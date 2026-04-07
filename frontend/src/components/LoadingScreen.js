import { useState, useEffect } from 'react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [assembled, setAssembled] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAssembled(true));
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setFadeOut(true);
          setTimeout(onComplete, 250);
          return 100;
        }
        return prev + 5;
      });
    }, 25);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-250 ${fadeOut ? 'opacity-0 scale-105' : 'opacity-100'}`}
         style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)' }}>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[500px] h-[500px] -top-[180px] -right-[180px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div className="absolute w-[350px] h-[350px] -bottom-[80px] -left-[80px] rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', filter: 'blur(35px)' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-20 h-20 mb-10">
          <div className={`absolute inset-0 rounded-2xl transition-all duration-500 ${assembled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
               style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', filter: 'blur(16px)' }} />
          
          <div className={`relative w-full h-full rounded-2xl overflow-hidden transition-all duration-400 ${assembled ? 'opacity-100' : 'opacity-0'}`}
               style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', boxShadow: '0 16px 32px -8px rgba(99, 102, 241, 0.4)' }}>
          </div>
          
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 80 80">
            <path 
              d={assembled ? "M30 22 L20 40 L30 58" : "M8 22 L-2 40 L8 58"}
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: '0.15s', opacity: assembled ? 1 : 0 }}
            />
            <path 
              d={assembled ? "M50 22 L60 40 L50 58" : "M72 22 L82 40 L72 58"}
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: '0.25s', opacity: assembled ? 1 : 0 }}
            />
          </svg>
          
          {[0, 1, 2].map(i => (
            <div key={`p-${i}`} className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: ['#3b82f6', '#8b5cf6', '#06b6d4'][i],
                top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                animation: `orbit ${2.5 + i * 0.4}s linear infinite`,
                animationDelay: `${i * 0.2}s`,
                boxShadow: `0 0 8px ${['#3b82f6', '#8b5cf6', '#06b6d4'][i]}`
              }}
            />
          ))}
        </div>
        
        <div className="overflow-hidden mb-1.5">
          <h1 className={`text-2xl font-semibold tracking-tight transition-all duration-500 ${assembled ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
              style={{ color: '#1e293b', transitionDelay: '0.3s' }}>
            CodeFeedback
          </h1>
        </div>
        <div className="overflow-hidden mb-8">
          <p className={`text-xs tracking-[0.3em] uppercase transition-all duration-500 ${assembled ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
             style={{ color: '#64748b', transitionDelay: '0.35s' }}>
            Studio
          </p>
        </div>
        
        <div className={`w-48 transition-all duration-400 ${assembled ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0.4s' }}>
          <div className="relative h-1 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
            <div className="h-full rounded-full transition-all duration-75"
                 style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
                   style={{ background: '#fff', boxShadow: '0 0 8px #8b5cf6' }} />
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px]" style={{ color: '#94a3b8' }}>
              {progress < 40 ? 'Initializing...' : progress < 80 ? 'Loading modules...' : 'Ready'}
            </span>
            <span className="text-[10px] font-mono" style={{ color: '#64748b' }}>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orbit {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(42px) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(42px) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}
