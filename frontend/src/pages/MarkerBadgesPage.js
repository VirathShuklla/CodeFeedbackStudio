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
  Clock,
  CheckCircle2,
  FileText,
  Search,
  Lock,
  TrendingUp,
  Users,
  Sparkles
} from 'lucide-react';

// Marker Badge definitions with rich details
const MARKER_BADGE_DEFINITIONS = {
  // Getting Started
  first_review: {
    name: 'First Review',
    description: 'Complete your first code review',
    category: 'Getting Started',
    icon: CheckCircle2,
    xp: 50,
    color: 'text-emerald-500',
    bg: 'bg-emerald-100',
    gradient: 'from-emerald-400 to-emerald-600'
  },
  
  // Speed & Efficiency
  speed_reviewer: {
    name: 'Speed Reviewer',
    description: 'Review 10 submissions within deadline',
    category: 'Speed & Efficiency',
    icon: Zap,
    xp: 100,
    color: 'text-amber-500',
    bg: 'bg-amber-100',
    gradient: 'from-amber-400 to-orange-500'
  },
  on_time_champion: {
    name: 'On-Time Champion',
    description: 'Review all assignments before deadline for a course',
    category: 'Speed & Efficiency',
    icon: Clock,
    xp: 150,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    gradient: 'from-blue-400 to-blue-600'
  },
  
  // Quality & Thoroughness
  thorough_reviewer: {
    name: 'Thorough Reviewer',
    description: 'Provide detailed feedback on 20 submissions',
    category: 'Quality & Thoroughness',
    icon: Search,
    xp: 150,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    gradient: 'from-purple-400 to-purple-600'
  },
  feedback_master: {
    name: 'Feedback Master',
    description: 'Create 10 reusable feedback templates',
    category: 'Quality & Thoroughness',
    icon: FileText,
    xp: 100,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100',
    gradient: 'from-indigo-400 to-indigo-600'
  },
  
  // Impact & Mentoring
  mentor: {
    name: 'Mentor',
    description: 'Help 5 students achieve perfect scores',
    category: 'Impact & Mentoring',
    icon: Users,
    xp: 200,
    color: 'text-pink-500',
    bg: 'bg-pink-100',
    gradient: 'from-pink-400 to-rose-500'
  },
  consistent_marker: {
    name: 'Consistent Marker',
    description: 'Maintain 95% moderation approval rate',
    category: 'Impact & Mentoring',
    icon: Target,
    xp: 175,
    color: 'text-teal-500',
    bg: 'bg-teal-100',
    gradient: 'from-teal-400 to-teal-600'
  },
  
  // Mastery
  marking_master: {
    name: 'Marking Master',
    description: 'Earn all marker badges',
    category: 'Mastery',
    icon: Trophy,
    xp: 500,
    color: 'text-yellow-500',
    bg: 'bg-yellow-100',
    gradient: 'from-yellow-400 to-amber-500'
  }
};

// Level definitions for markers
const MARKER_LEVELS = [
  { level: 1, title: 'Apprentice Marker', minXp: 0 },
  { level: 2, title: 'Junior Marker', minXp: 100 },
  { level: 3, title: 'Marker', minXp: 250 },
  { level: 4, title: 'Senior Marker', minXp: 500 },
  { level: 5, title: 'Lead Marker', minXp: 800 },
  { level: 6, title: 'Expert Marker', minXp: 1200 },
  { level: 7, title: 'Master Marker', minXp: 1800 },
  { level: 8, title: 'Principal Marker', minXp: 2500 },
  { level: 9, title: 'Distinguished Marker', minXp: 3500 },
  { level: 10, title: 'Legendary Marker', minXp: 5000 }
];

function getMarkerLevel(xp) {
  let currentLevel = MARKER_LEVELS[0];
  let nextLevel = MARKER_LEVELS[1];
  
  for (let i = 0; i < MARKER_LEVELS.length; i++) {
    if (xp >= MARKER_LEVELS[i].minXp) {
      currentLevel = MARKER_LEVELS[i];
      nextLevel = MARKER_LEVELS[i + 1] || null;
    }
  }
  
  const progress = nextLevel 
    ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
    : 100;
  
  const xpToNext = nextLevel ? nextLevel.minXp - xp : 0;
  
  return { ...currentLevel, progress, xpToNext, nextLevel };
}

export default function MarkerBadgesPage() {
  const { api, user } = useAuth();
  const [badgeData, setBadgeData] = useState({ earned: [], available: [] });
  const [stats, setStats] = useState({ xp: 0, badges: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, analyticsRes] = await Promise.all([
        api().get('/gamification/stats'),
        api().get('/analytics/marker')
      ]);
      
      // Use stats from gamification endpoint (which auto-checks badges)
      const gamificationData = statsRes.data;
      
      setBadgeData({
        earned: gamificationData.badges_earned || [],
        available: Object.keys(MARKER_BADGE_DEFINITIONS)
      });
      
      setStats({
        xp: gamificationData.xp || 0,
        badges: gamificationData.badges || [],
        totalReviews: gamificationData.total_reviews || analyticsRes.data.total_feedback_given || 0,
        pendingReviews: gamificationData.pending_reviews || analyticsRes.data.total_pending_reviews || 0,
        level: gamificationData.level,
        levelTitle: gamificationData.level_title,
        levelProgress: gamificationData.level_progress,
        xpToNextLevel: gamificationData.xp_to_next_level
      });
    } catch (error) {
      console.error('Failed to load badges:', error);
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
  Object.entries(MARKER_BADGE_DEFINITIONS).forEach(([id, badge]) => {
    if (!badgesByCategory[badge.category]) {
      badgesByCategory[badge.category] = [];
    }
    badgesByCategory[badge.category].push({ id, ...badge });
  });

  // Check if badge is earned - use the badges array from stats
  const isEarned = (badgeId) => {
    return stats.badges?.includes(badgeId) || 
           badgeData.earned?.some(b => b.id === badgeId);
  };

  // Use backend level info if available, otherwise calculate locally
  const levelInfo = stats.level ? {
    level: stats.level,
    title: stats.levelTitle || MARKER_LEVELS.find(l => l.level === stats.level)?.title || 'Marker',
    progress: stats.levelProgress || 0,
    xpToNext: stats.xpToNextLevel || 0,
    nextLevel: MARKER_LEVELS.find(l => l.level === stats.level + 1)
  } : getMarkerLevel(stats.xp);
  
  const earnedCount = stats.badges?.length || badgeData.earned?.length || 0;
  const totalBadges = Object.keys(MARKER_BADGE_DEFINITIONS).length;

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
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="marker-badges-page">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 mb-8">
          <div className="absolute inset-0 bg-grid-white/5" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
          
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
                <p className="text-slate-300 mt-2">
                  {earnedCount} of {totalBadges} badges earned
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-5xl font-bold text-white font-['Outfit']">
                  {stats.xp}
                </div>
                <div className="text-slate-400 text-sm">Total XP</div>
              </div>
            </div>
            
            {/* Level Progress */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-slate-300 mb-2">
                <span>Progress to {levelInfo.nextLevel?.title || 'Max Level'}</span>
                <span>{levelInfo.xpToNext} XP needed</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-500"
                  style={{ width: `${levelInfo.progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="card-clean p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.totalReviews}</div>
            <div className="text-xs text-muted-foreground">Reviews Completed</div>
          </div>
          <div className="card-clean p-4 text-center">
            <Award className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <div className="text-2xl font-bold">{earnedCount}</div>
            <div className="text-xs text-muted-foreground">Badges Earned</div>
          </div>
          <div className="card-clean p-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <div className="text-xs text-muted-foreground">Pending Reviews</div>
          </div>
        </div>

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
                        ? 'bg-white shadow-lg border-primary/20 hover:shadow-xl' 
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
            Keep reviewing to earn more badges and level up!
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
