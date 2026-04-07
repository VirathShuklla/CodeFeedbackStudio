import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Award, 
  Star, 
  Trophy, 
  Target,
  Zap,
  Shield,
  Code,
  Bug,
  Sparkles,
  Lock,
  Rocket,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';

// Student Badge definitions with rich details
const STUDENT_BADGE_DEFINITIONS = {
  // Getting Started
  first_submission: {
    name: 'First Steps',
    description: 'Submit your first assignment',
    category: 'Getting Started',
    icon: Rocket,
    xp: 50,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    gradient: 'from-blue-400 to-blue-600'
  },
  
  // Bug Fixing
  bug_squasher: {
    name: 'Bug Squasher',
    description: 'Fix 10 issues across your submissions',
    category: 'Bug Fixing',
    icon: Bug,
    xp: 100,
    color: 'text-red-500',
    bg: 'bg-red-100',
    gradient: 'from-red-400 to-red-600'
  },
  quick_learner: {
    name: 'Quick Learner',
    description: 'Fix an issue within 24 hours of feedback',
    category: 'Bug Fixing',
    icon: Zap,
    xp: 75,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    gradient: 'from-amber-400 to-orange-500'
  },
  zero_to_hero: {
    name: 'Zero to Hero',
    description: 'Fix every single issue in a submission',
    category: 'Bug Fixing',
    icon: Trophy,
    xp: 100,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    gradient: 'from-orange-400 to-red-500'
  },
  
  // Excellence
  perfectionist: {
    name: 'Perfectionist',
    description: 'Get a submission marked with no issues',
    category: 'Excellence',
    icon: Star,
    xp: 150,
    color: 'text-yellow-500',
    bg: 'bg-yellow-100',
    gradient: 'from-yellow-400 to-amber-500'
  },
  five_star: {
    name: 'Five Star Coder',
    description: 'Get 5 perfect submissions with no issues',
    category: 'Excellence',
    icon: Sparkles,
    xp: 200,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    gradient: 'from-yellow-500 to-amber-600'
  },
  improver: {
    name: 'Rapid Improver',
    description: 'Improve your score by 20% on a resubmission',
    category: 'Excellence',
    icon: TrendingUp,
    xp: 125,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100',
    gradient: 'from-emerald-400 to-green-500'
  },
  
  // Consistency & Engagement
  consistent: {
    name: 'Consistent Performer',
    description: 'Submit 5 assignments on time',
    category: 'Consistency & Engagement',
    icon: Calendar,
    xp: 100,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    gradient: 'from-purple-400 to-purple-600'
  },
  streak_warrior: {
    name: 'Streak Warrior',
    description: 'Submit 3 assignments on time in a row',
    category: 'Consistency & Engagement',
    icon: Target,
    xp: 80,
    color: 'text-rose-500',
    bg: 'bg-rose-100',
    gradient: 'from-rose-400 to-rose-600'
  },
  early_bird: {
    name: 'Early Bird',
    description: 'Submit an assignment 24 hours before deadline',
    category: 'Consistency & Engagement',
    icon: Clock,
    xp: 60,
    color: 'text-sky-500',
    bg: 'bg-sky-100',
    gradient: 'from-sky-400 to-sky-600'
  },
  feedback_engaged: {
    name: 'Feedback Champion',
    description: 'Fix at least 80% of all issues raised on your work',
    category: 'Consistency & Engagement',
    icon: CheckCircle2,
    xp: 120,
    color: 'text-teal-500',
    bg: 'bg-teal-100',
    gradient: 'from-teal-400 to-teal-600'
  },
  
  // Growth & Mastery
  tenacious: {
    name: 'Tenacious',
    description: 'Resubmit and improve your score 3 times',
    category: 'Growth & Mastery',
    icon: TrendingUp,
    xp: 110,
    color: 'text-cyan-500',
    bg: 'bg-cyan-100',
    gradient: 'from-cyan-400 to-cyan-600'
  },
  multi_module: {
    name: 'Multi-Talented',
    description: 'Be active in 3 or more modules',
    category: 'Growth & Mastery',
    icon: Code,
    xp: 90,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100',
    gradient: 'from-indigo-400 to-indigo-600'
  },
  centurion: {
    name: 'Centurion',
    description: 'Earn a total of 500 XP',
    category: 'Growth & Mastery',
    icon: Shield,
    xp: 75,
    color: 'text-slate-500',
    bg: 'bg-slate-100',
    gradient: 'from-slate-400 to-slate-600'
  },
};

// Level definitions for students
const STUDENT_LEVELS = [
  { level: 1, title: 'Novice Coder', minXp: 0 },
  { level: 2, title: 'Apprentice', minXp: 100 },
  { level: 3, title: 'Junior Developer', minXp: 250 },
  { level: 4, title: 'Developer', minXp: 500 },
  { level: 5, title: 'Senior Developer', minXp: 800 },
  { level: 6, title: 'Lead Developer', minXp: 1200 },
  { level: 7, title: 'Architect', minXp: 1800 },
  { level: 8, title: 'Senior Architect', minXp: 2500 },
  { level: 9, title: 'Principal Engineer', minXp: 3500 },
  { level: 10, title: 'Code Master', minXp: 5000 }
];

function getStudentLevel(xp) {
  let currentLevel = STUDENT_LEVELS[0];
  let nextLevel = STUDENT_LEVELS[1];
  
  for (let i = 0; i < STUDENT_LEVELS.length; i++) {
    if (xp >= STUDENT_LEVELS[i].minXp) {
      currentLevel = STUDENT_LEVELS[i];
      nextLevel = STUDENT_LEVELS[i + 1] || null;
    }
  }
  
  const progress = nextLevel 
    ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
    : 100;
  
  const xpToNext = nextLevel ? nextLevel.minXp - xp : 0;
  
  return { ...currentLevel, progress, xpToNext, nextLevel };
}

export default function StudentBadgesPage() {
  const { api, user } = useAuth();
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await api().get('/gamification/stats');
      setGamification(response.data);
    } catch (error) {
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group badges by category
  const badgesByCategory = {};
  Object.entries(STUDENT_BADGE_DEFINITIONS).forEach(([id, badge]) => {
    if (!badgesByCategory[badge.category]) {
      badgesByCategory[badge.category] = [];
    }
    badgesByCategory[badge.category].push({ id, ...badge });
  });

  // Check if badge is earned
  const isEarned = (badgeId) => {
    return gamification?.badges?.includes(badgeId) || 
           gamification?.badges_earned?.some(b => b.id === badgeId);
  };

  const totalXp = gamification?.total_xp || gamification?.xp || user?.xp || 0;
  const levelInfo = getStudentLevel(totalXp);
  const earnedBadges = gamification?.badges || [];
  const earnedCount = earnedBadges.length;
  const totalBadges = Object.keys(STUDENT_BADGE_DEFINITIONS).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Loading badges...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="student-badges-page">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 p-8 mb-8">
          <div className="absolute inset-0 bg-grid-white/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="secondary" className="mb-3 bg-white/10 text-white border-0">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Level {levelInfo.level}
                </Badge>
                <h1 className="text-3xl font-bold text-white font-['Outfit']">
                  {levelInfo.title}
                </h1>
                <p className="text-purple-200 mt-2">
                  {earnedCount} of {totalBadges} badges earned
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-5xl font-bold text-white font-['Outfit']">
                  {totalXp}
                </div>
                <div className="text-purple-300 text-sm">Total XP</div>
              </div>
            </div>
            
            {/* Level Progress */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-purple-200 mb-2">
                <span>Progress to {levelInfo.nextLevel?.title || 'Max Level'}</span>
                <span>{levelInfo.xpToNext} XP needed</span>
              </div>
              <div className="h-3 bg-purple-950/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card-clean p-4 text-center hover:shadow-lg transition-shadow">
            <Award className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{earnedCount}</div>
            <div className="text-xs text-muted-foreground">Badges Earned</div>
          </div>
          <div className="card-clean p-4 text-center hover:shadow-lg transition-shadow">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{gamification?.issues_fixed || 0}</div>
            <div className="text-xs text-muted-foreground">Issues Fixed</div>
          </div>
          <div className="card-clean p-4 text-center hover:shadow-lg transition-shadow">
            <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{gamification?.submissions_count || 0}</div>
            <div className="text-xs text-muted-foreground">Submissions</div>
          </div>
        </div>

        {/* Recent XP Gains */}
        {gamification?.recent_xp_gains?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold font-['Outfit'] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              Recent Activity
            </h2>
            <div className="space-y-2">
              {gamification.recent_xp_gains.slice(0, 5).map((gain, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-medium">{gain.reason}</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">+{gain.xp_gained} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges by Category */}
        {Object.entries(badgesByCategory).map(([category, badges]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold font-['Outfit'] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-primary rounded-full" />
              {category}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {badges.map((badge) => {
                const earned = isEarned(badge.id);
                const Icon = badge.icon;
                
                return (
                  <div 
                    key={badge.id}
                    className={`group relative overflow-hidden rounded-xl border transition-all duration-300 ${
                      earned 
                        ? 'bg-white shadow-lg border-primary/20 hover:shadow-xl hover:scale-[1.02]' 
                        : 'bg-slate-50/50 border-slate-200 opacity-60 hover:opacity-80'
                    }`}
                    data-testid={`badge-${badge.id}`}
                  >
                    {/* Gradient accent for earned badges */}
                    {earned && (
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${badge.gradient}`} />
                    )}
                    
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl ${earned ? badge.bg : 'bg-slate-100'} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                          {earned ? (
                            <Icon className={`w-7 h-7 ${badge.color}`} />
                          ) : (
                            <Lock className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{badge.name}</h3>
                            {earned && (
                              <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 border-0">
                                Earned
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {badge.description}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <Zap className={`w-4 h-4 ${earned ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className={`text-sm font-medium ${earned ? 'text-amber-600' : 'text-slate-500'}`}>
                              +{badge.xp} XP
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Motivation Footer */}
        <div className="text-center py-8 border-t">
          <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Keep coding and fixing issues to earn more badges!
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
