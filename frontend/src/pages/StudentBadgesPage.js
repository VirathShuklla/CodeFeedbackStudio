import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Progress } from '../components/ui/progress';
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
  Lock
} from 'lucide-react';

// Badge definitions
const BADGE_DEFINITIONS = {
  // Debugging Mastery
  error_hunter: {
    name: 'Error Hunter',
    description: 'Fix 10 distinct runtime errors across 3+ assignments',
    category: 'Debugging Mastery',
    icon: Bug,
    target: 10,
    color: 'text-red-500',
    bg: 'bg-red-100'
  },
  exception_architect: {
    name: 'Exception Architect',
    description: 'Fix 5 unhandled exception issues with proper handling',
    category: 'Debugging Mastery',
    icon: Shield,
    target: 5,
    color: 'text-orange-500',
    bg: 'bg-orange-100'
  },
  debug_virtuoso: {
    name: 'Debug Virtuoso',
    description: 'Earn all Debugging Mastery badges',
    category: 'Debugging Mastery',
    icon: Trophy,
    target: 1,
    color: 'text-amber-500',
    bg: 'bg-amber-100'
  },
  
  // Code Quality
  complexity_reducer: {
    name: 'Complexity Reducer',
    description: 'Reduce cyclomatic complexity by 20% in 5 submissions',
    category: 'Code Quality',
    icon: Code,
    target: 5,
    color: 'text-blue-500',
    bg: 'bg-blue-100'
  },
  dry_advocate: {
    name: 'DRY Advocate',
    description: 'Remove 10+ duplicated code blocks across 4 assignments',
    category: 'Code Quality',
    icon: Zap,
    target: 10,
    color: 'text-purple-500',
    bg: 'bg-purple-100'
  },
  clean_code_practitioner: {
    name: 'Clean Code Practitioner',
    description: 'Earn Complexity Reducer + DRY Advocate + Naming Craftsman',
    category: 'Code Quality',
    icon: Star,
    target: 1,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100'
  },
  
  // Consistency & Growth
  steady_improver: {
    name: 'Steady Improver',
    description: 'Earn XP in 10+ separate weeks',
    category: 'Consistency',
    icon: Target,
    target: 10,
    color: 'text-green-500',
    bg: 'bg-green-100'
  },
  feedback_embracer: {
    name: 'Feedback Embracer',
    description: 'Resolve 80%+ of marker-flagged issues across 5 assignments',
    category: 'Consistency',
    icon: Sparkles,
    target: 5,
    color: 'text-teal-500',
    bg: 'bg-teal-100'
  },
  mastery_path_complete: {
    name: 'Mastery Path Complete',
    description: 'Earn 15 total badges including one Master badge',
    category: 'Consistency',
    icon: Trophy,
    target: 15,
    color: 'text-yellow-500',
    bg: 'bg-yellow-100'
  },
  
  // Milestones
  first_100_xp: {
    name: 'Getting Started',
    description: 'Earn your first 100 XP',
    category: 'Milestones',
    icon: Award,
    target: 100,
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  first_500_xp: {
    name: 'Rising Star',
    description: 'Earn 500 XP',
    category: 'Milestones',
    icon: Star,
    target: 500,
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  first_1000_xp: {
    name: 'Dedicated Learner',
    description: 'Earn 1000 XP',
    category: 'Milestones',
    icon: Trophy,
    target: 1000,
    color: 'text-primary',
    bg: 'bg-primary/10'
  }
};

export default function StudentBadgesPage() {
  const { api } = useAuth();
  const [gamification, setGamification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const response = await api().get('/gamification/stats');
      setGamification(response.data);
    } catch (error) {
      toast.error('Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  // Group badges by category
  const badgesByCategory = {};
  Object.entries(BADGE_DEFINITIONS).forEach(([id, badge]) => {
    if (!badgesByCategory[badge.category]) {
      badgesByCategory[badge.category] = [];
    }
    badgesByCategory[badge.category].push({ id, ...badge });
  });

  // Check if badge is earned
  const isEarned = (badgeId) => {
    return gamification?.badges_earned?.some(b => b.id === badgeId);
  };

  // Get progress for badge
  const getProgress = (badgeId) => {
    const inProgress = gamification?.badges_in_progress?.find(b => b.id === badgeId);
    if (inProgress) {
      return { progress: inProgress.progress, target: inProgress.target };
    }
    // For XP milestones, calculate based on total XP
    if (badgeId.includes('xp')) {
      const badge = BADGE_DEFINITIONS[badgeId];
      return { progress: Math.min(gamification?.xp || 0, badge.target), target: badge.target };
    }
    return { progress: 0, target: BADGE_DEFINITIONS[badgeId]?.target || 1 };
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  const earnedCount = gamification?.badges_earned?.length || 0;
  const totalBadges = Object.keys(BADGE_DEFINITIONS).length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="student-badges-page">
        {/* Header */}
        <div className="card-clean p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold font-['Outfit']">Badges & Achievements</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {earnedCount} of {totalBadges} badges earned
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">{gamification?.xp || 0}</p>
              <p className="text-sm text-muted-foreground">Total XP</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Level {gamification?.level || 1}: {gamification?.level_title || 'Novice Coder'}</span>
              <span>{gamification?.xp_to_next_level || 100} XP to next level</span>
            </div>
            <Progress value={gamification?.xp_to_next_level ? 100 - (gamification.xp_to_next_level / 100 * 100) : 0} />
          </div>
        </div>

        {/* Recent XP Gains */}
        {gamification?.recent_xp_gains?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold font-['Outfit'] mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {gamification.recent_xp_gains.slice(0, 5).map((gain, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm">{gain.reason}</span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">+{gain.xp_gained} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges by Category */}
        {Object.entries(badgesByCategory).map(([category, badges]) => (
          <div key={category} className="mb-8">
            <h2 className="text-lg font-semibold font-['Outfit'] mb-4">{category}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {badges.map((badge) => {
                const earned = isEarned(badge.id);
                const { progress, target } = getProgress(badge.id);
                const Icon = badge.icon;
                
                return (
                  <div 
                    key={badge.id}
                    className={`card-clean p-4 transition-all ${
                      earned 
                        ? 'ring-2 ring-primary/20 bg-primary/5' 
                        : 'opacity-60 hover:opacity-80'
                    }`}
                    data-testid={`badge-${badge.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl ${earned ? badge.bg : 'bg-slate-100'} flex items-center justify-center flex-shrink-0`}>
                        {earned ? (
                          <Icon className={`w-6 h-6 ${badge.color}`} />
                        ) : (
                          <Lock className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{badge.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {badge.description}
                        </p>
                        
                        {!earned && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Progress</span>
                              <span>{progress}/{target}</span>
                            </div>
                            <Progress value={(progress / target) * 100} className="h-1" />
                          </div>
                        )}
                        
                        {earned && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                            <Award className="w-3 h-3" />
                            <span>Earned!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
