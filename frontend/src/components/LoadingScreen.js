import { useState, useEffect } from 'react';
import { Code2 } from 'lucide-react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [showText, setShowText] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);

  const phases = [
    'Initializing environment...',
    'Loading components...',
    'Preparing code editor...',
    'Setting up workspace...',
    'Almost ready...'
  ];

  useEffect(() => {
    // Show text after a brief delay
    const textTimer = setTimeout(() => setShowText(true), 300);
    
    // Progress animation over 6 seconds (6000ms)
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 700);
          }, 300);
          return 100;
        }
        // Update phase based on progress
        const newPhase = Math.floor(prev / 20);
        if (newPhase !== currentPhase && newPhase < phases.length) {
          setCurrentPhase(newPhase);
        }
        return prev + 0.6; // ~6 seconds for full progress
      });
    }, 35);

    return () => {
      clearTimeout(textTimer);
      clearInterval(progressTimer);
    };
  }, [onComplete, currentPhase, phases.length]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-all duration-700 ${
        fadeOut ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{ 
        background: 'linear-gradient(135deg, #0c1222 0%, #162032 40%, #1a2744 70%, #0c1222 100%)'
      }}
    >
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-[800px] h-[800px] -top-[300px] -left-[300px] rounded-full"
          style={{ 
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 60%)',
            animation: 'pulse-slow 4s ease-in-out infinite'
          }} 
        />
        <div 
          className="absolute w-[600px] h-[600px] -bottom-[200px] -right-[200px] rounded-full"
          style={{ 
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 60%)',
            animation: 'pulse-slow 5s ease-in-out infinite',
            animationDelay: '1s'
          }} 
        />
        <div 
          className="absolute w-[400px] h-[400px] top-1/4 right-1/3 rounded-full"
          style={{ 
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
            animation: 'pulse-slow 6s ease-in-out infinite',
            animationDelay: '0.5s'
          }} 
        />
      </div>

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`
        }}
      />

      {/* Scanning line effect */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.03) 50%, transparent 100%)',
          animation: 'scan 3s linear infinite'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated logo container */}
        <div className="relative mb-12">
          {/* Outer rotating ring with dots */}
          <div className="absolute -inset-8">
            <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" strokeDasharray="4 8" />
            </svg>
          </div>
          
          {/* Middle pulsing ring */}
          <div 
            className="absolute -inset-4 rounded-3xl border border-blue-500/20"
            style={{ animation: 'ring-pulse 2s ease-in-out infinite' }}
          />
          
          {/* Inner glow ring */}
          <div 
            className="absolute -inset-2 rounded-2xl"
            style={{ 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
              filter: 'blur(8px)',
              animation: 'glow-pulse 2.5s ease-in-out infinite'
            }}
          />
          
          {/* Logo box with gradient */}
          <div 
            className="relative w-28 h-28 rounded-2xl flex items-center justify-center shadow-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
              boxShadow: '0 25px 60px -12px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
          >
            <Code2 className="w-14 h-14 text-white drop-shadow-lg" strokeWidth={1.5} />
            
            {/* Shine effect */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 45%, transparent 55%)',
                animation: 'shine 4s ease-in-out infinite'
              }}
            />
          </div>

          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${3 + Math.random() * 4}px`,
                height: `${3 + Math.random() * 4}px`,
                background: i % 2 === 0 ? '#3b82f6' : '#8b5cf6',
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
                animation: `float ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
                opacity: 0.7,
                boxShadow: `0 0 6px ${i % 2 === 0 ? '#3b82f6' : '#8b5cf6'}`
              }}
            />
          ))}
        </div>

        {/* App name with staggered animation */}
        <div className={`transition-all duration-700 ease-out ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <h1 className="text-5xl font-bold text-white font-['Outfit'] tracking-tight mb-2 text-center"
              style={{ textShadow: '0 2px 20px rgba(59, 130, 246, 0.3)' }}>
            CodeFeedback
          </h1>
          <p className="text-xl text-blue-300/70 text-center font-light tracking-[0.3em]">
            STUDIO
          </p>
        </div>

        {/* Progress section */}
        <div className={`mt-12 w-96 transition-all duration-700 delay-200 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* Progress bar container */}
          <div className="relative h-1.5 bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50">
            {/* Progress fill */}
            <div 
              className="h-full rounded-full transition-all duration-100 ease-out relative"
              style={{ 
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
              }}
            >
              {/* Glow effect at tip */}
              <div 
                className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
                style={{ 
                  background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)',
                  filter: 'blur(2px)'
                }}
              />
            </div>
          </div>
          
          {/* Loading text */}
          <div className="flex justify-between items-center mt-4">
            <p className="text-slate-400 text-sm font-light transition-all duration-300">
              {phases[currentPhase]}
            </p>
            <p className="text-slate-500 text-sm font-mono tabular-nums">{Math.round(progress)}%</p>
          </div>
        </div>
      </div>

      {/* Bottom decoration */}
      <div className={`absolute bottom-8 left-0 right-0 flex justify-center transition-all duration-700 delay-400 ${showText ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-6 text-slate-600 text-xs font-light tracking-wide">
          <span className="font-mono">v2.2</span>
          <span className="w-1 h-1 bg-slate-700 rounded-full" />
          <span>Code Assessment Platform</span>
          <span className="w-1 h-1 bg-slate-700 rounded-full" />
          <span>© 2026</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shine {
          0%, 100% { transform: translateX(-150%); }
          50% { transform: translateX(150%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.7; }
          50% { transform: translateY(-15px) scale(1.3); opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes ring-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.02); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
