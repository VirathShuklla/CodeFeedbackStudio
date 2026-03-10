import { useState, useEffect } from 'react';
import { Code2 } from 'lucide-react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Animate progress bar
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setFadeOut(true);
            setTimeout(onComplete, 500);
          }, 300);
          return 100;
        }
        return prev + 4;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background dots */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Logo and text */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Animated logo */}
        <div className="relative mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/30 animate-bounce" style={{ animationDuration: '2s' }}>
            <Code2 className="w-10 h-10 text-white" />
          </div>
          {/* Pulsing ring */}
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/50 animate-ping" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* App name */}
        <h1 className="text-3xl font-bold text-white font-['Outfit'] mb-2">
          CodeFeedback
        </h1>
        <p className="text-slate-400 mb-8">Studio</p>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-500 text-sm mt-3">Loading...</p>
      </div>

      {/* Code-like decoration */}
      <div className="absolute bottom-8 left-8 text-slate-700 font-mono text-xs opacity-50">
        <p>{"// Initializing..."}</p>
        <p>{"const app = new CodeFeedback();"}</p>
      </div>
    </div>
  );
}
