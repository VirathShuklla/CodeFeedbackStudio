import { useState, useEffect } from 'react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [assembled, setAssembled] = useState(false);

  useEffect(() => {
    // Trigger assembly animation after a short delay
    setTimeout(() => setAssembled(true), 150);
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 300);
          }, 100);
          return 100;
        }
        return prev + 2.5;  // Complete in ~1.2 seconds
      });
    }, 30);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${fadeOut ? 'opacity-0 scale-105' : 'opacity-100'}`}
         style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] -top-[200px] -right-[200px] rounded-full opacity-30"
             style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute w-[400px] h-[400px] -bottom-[100px] -left-[100px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        
        {/* Assembling Logo */}
        <div className="relative w-24 h-24 mb-12">
          {/* Background glow */}
          <div className={`absolute inset-0 rounded-2xl transition-all duration-1000 ${assembled ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
               style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', filter: 'blur(20px)' }} />
          
          {/* Main container */}
          <div className={`relative w-full h-full rounded-2xl overflow-hidden transition-all duration-700 ${assembled ? 'opacity-100' : 'opacity-0'}`}
               style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)', boxShadow: '0 20px 40px -10px rgba(99, 102, 241, 0.4)' }}>
            
            {/* Scan line effect */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)', animation: 'scan 2s linear infinite' }} />
          </div>
          
          {/* Assembling code brackets */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 96 96">
            {/* Left bracket < */}
            <path 
              d={assembled ? "M38 30 L26 48 L38 66" : "M10 30 L-2 48 L10 66"}
              fill="none" 
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ 
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transitionDelay: '0.2s',
                opacity: assembled ? 1 : 0,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
            />
            {/* Right bracket > */}
            <path 
              d={assembled ? "M58 30 L70 48 L58 66" : "M86 30 L98 48 L86 66"}
              fill="none" 
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ 
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transitionDelay: '0.4s',
                opacity: assembled ? 1 : 0,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
              }}
            />
          </svg>
          
          {/* Corner pieces assembling */}
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className="absolute w-3 h-3"
              style={{
                top: i < 2 ? (assembled ? '0' : '-20px') : (assembled ? 'auto' : 'calc(100% + 20px)'),
                bottom: i >= 2 ? (assembled ? '0' : '-20px') : 'auto',
                left: i % 2 === 0 ? (assembled ? '0' : '-20px') : 'auto',
                right: i % 2 === 1 ? (assembled ? '0' : '-20px') : 'auto',
                borderTop: i < 2 ? '2px solid #3b82f6' : 'none',
                borderBottom: i >= 2 ? '2px solid #8b5cf6' : 'none',
                borderLeft: i % 2 === 0 ? '2px solid #3b82f6' : 'none',
                borderRight: i % 2 === 1 ? '2px solid #8b5cf6' : 'none',
                borderRadius: i === 0 ? '8px 0 0 0' : i === 1 ? '0 8px 0 0' : i === 2 ? '0 0 0 8px' : '0 0 8px 0',
                transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transitionDelay: `${0.1 + i * 0.1}s`,
                opacity: assembled ? 1 : 0
              }}
            />
          ))}
          
          {/* Orbiting particles */}
          {[0, 1, 2].map(i => (
            <div
              key={`particle-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                background: i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : '#06b6d4',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: `orbit ${3 + i * 0.5}s linear infinite`,
                animationDelay: `${i * 0.3}s`,
                boxShadow: `0 0 10px ${i === 0 ? '#3b82f6' : i === 1 ? '#8b5cf6' : '#06b6d4'}`
              }}
            />
          ))}
        </div>
        
        {/* Title with stagger animation */}
        <div className="overflow-hidden mb-2">
          <h1 className={`text-3xl font-semibold tracking-tight transition-all duration-700 ${assembled ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
              style={{ color: '#1e293b', transitionDelay: '0.5s' }}>
            CodeFeedback
          </h1>
        </div>
        <div className="overflow-hidden mb-10">
          <p className={`text-xs tracking-[0.3em] uppercase transition-all duration-700 ${assembled ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
             style={{ color: '#64748b', transitionDelay: '0.6s' }}>
            Studio
          </p>
        </div>
        
        {/* Progress section */}
        <div className={`w-56 transition-all duration-500 ${assembled ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '0.7s' }}>
          {/* Progress track */}
          <div className="relative h-1 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
            {/* Animated background */}
            <div className="absolute inset-0 opacity-50"
                 style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.3), transparent)', animation: 'shimmer 1.5s infinite' }} />
            {/* Progress fill */}
            <div className="h-full rounded-full transition-all duration-100 relative"
                 style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }}>
              {/* Glow tip */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                   style={{ background: '#fff', boxShadow: '0 0 10px #8b5cf6, 0 0 20px #8b5cf6' }} />
            </div>
          </div>
          
          {/* Status text */}
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs" style={{ color: '#94a3b8' }}>
              {progress < 30 ? 'Initializing...' : progress < 70 ? 'Loading modules...' : 'Almost ready...'}
            </span>
            <span className="text-xs font-mono" style={{ color: '#64748b' }}>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes orbit {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(50px) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(50px) rotate(-360deg); }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
