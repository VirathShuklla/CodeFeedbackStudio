import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  Trophy,
  Crown,
  Medal,
  Star,
  Shield,
  Zap,
  Users,
  UserCheck,
  LogIn,
  LogOut,
  Check,
  X,
  ChevronUp,
  Flame,
  Award,
  Eye,
  Sparkles,
} from 'lucide-react';

const STUDENT_BADGE_ICONS = {
  first_submission: '🚀', bug_squasher: '🐛', quick_learner: '⚡', perfectionist: '⭐',
  consistent: '📅', improver: '📈', streak_warrior: '🔥', early_bird: '🌅',
  feedback_engaged: '💬', zero_to_hero: '🏆', five_star: '🌟', multi_module: '📚',
  tenacious: '🔁', centurion: '🛡️',
};

const MARKER_BADGE_ICONS = {
  first_review: '✅', speed_reviewer: '⚡', thorough_reviewer: '🔍', mentor: '🏅',
  consistent_marker: '🎯', on_time_champion: '⏰', feedback_master: '📝',
  detail_oriented: '👁️', turnaround_king: '⏱️', multi_course: '📚',
  quality_guardian: '🛡️', century_reviewer: '#️⃣', template_architect: '🧱',
};

function RankBadge({ rank }) {
  if (rank === 1) return <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-200/50"><Crown className="w-4 h-4 text-white" /></div>;
  if (rank === 2) return <div className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center shadow-lg shadow-slate-200/50"><Medal className="w-4 h-4 text-white" /></div>;
  if (rank === 3) return <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-300/50"><Medal className="w-4 h-4 text-white" /></div>;
  return <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-500 dark:text-slate-300">{rank}</div>;
}

function ProfileModal({ userId, courseId, isOpen, onClose, api }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    api().get(`/profile/${userId}${courseId ? `?course_id=${courseId}` : ''}`)
      .then(res => setProfile(res.data))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [isOpen, userId, courseId, api]);

  if (!isOpen) return null;

  const badgeIcons = profile?.role === 'student' ? STUDENT_BADGE_ICONS : MARKER_BADGE_ICONS;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg" data-testid="profile-modal">
        <DialogHeader>
          <DialogTitle className="font-['Outfit']">Player Profile</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground animate-pulse">Loading profile...</div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <h3 className="text-xl font-bold font-['Outfit']">{profile.display_name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />Lvl {profile.level} — {profile.level_title}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">{profile.role}</Badge>
                </div>
              </div>
            </div>

            {/* XP Bar */}
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{profile.xp} XP</span>
                <span className="text-muted-foreground">{profile.xp_to_next_level} XP to next level</span>
              </div>
              <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all duration-700"
                  style={{ width: `${profile.level_progress}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {profile.role === 'student' ? (
                <>
                  <StatBox icon={<Zap className="w-4 h-4 text-amber-500" />} value={profile.stats?.submissions_count || 0} label="Submissions" />
                  <StatBox icon={<Check className="w-4 h-4 text-emerald-500" />} value={profile.stats?.issues_fixed || 0} label="Issues Fixed" />
                  <StatBox icon={<Star className="w-4 h-4 text-yellow-500" />} value={profile.stats?.perfect_submissions || 0} label="Perfect" />
                </>
              ) : (
                <>
                  <StatBox icon={<Eye className="w-4 h-4 text-blue-500" />} value={profile.stats?.reviews_count || 0} label="Reviews" />
                  <StatBox icon={<Zap className="w-4 h-4 text-amber-500" />} value={profile.stats?.issues_created || 0} label="Issues Found" />
                  <StatBox icon={<Award className="w-4 h-4 text-purple-500" />} value={profile.stats?.templates_created || 0} label="Templates" />
                </>
              )}
            </div>

            {/* Badges */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-500" />
                Badges ({profile.badges_count}/{profile.total_badges_available})
              </h4>
              {profile.badges?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map(b => (
                    <div key={b.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm" title={b.description}>
                      <span>{badgeIcons[b.id] || '🏅'}</span>
                      <span className="font-medium">{b.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No badges earned yet</p>
              )}
            </div>

            {/* Active Modules */}
            {profile.active_modules?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" /> Active on Leaderboards
                </h4>
                <div className="flex flex-wrap gap-2">
                  {profile.active_modules.map(m => (
                    <Badge key={m.course_id} variant="outline" className="text-xs">
                      {m.course_name} — {m.nickname}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Profile not found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ icon, value, label }) {
  return (
    <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { api, user, isStudent, isMarker } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [activeTab, setActiveTab] = useState(isStudent ? 'students' : 'markers');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mySettings, setMySettings] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameAvailable, setNicknameAvailable] = useState(null);
  const [checkingNickname, setCheckingNickname] = useState(false);
  const [joining, setJoining] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = isStudent
          ? await api().get('/students/courses')
          : await api().get('/courses');
        setCourses(res.data || []);
        if (res.data?.length > 0) {
          setSelectedCourse(res.data[0].id);
        }
      } catch {
        toast.error('Failed to load courses');
      }
    };
    fetchCourses();
  }, [api, isStudent]);

  // Fetch leaderboard + settings when course/tab changes
  const fetchLeaderboard = useCallback(async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const [lbRes, settingsRes] = await Promise.all([
        api().get(`/leaderboard/${selectedCourse}/${activeTab}`),
        api().get(`/leaderboard/settings/${selectedCourse}`)
      ]);
      setLeaderboard(lbRes.data?.leaderboard || []);
      setMySettings(settingsRes.data);
    } catch {
      toast.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [api, selectedCourse, activeTab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Nickname check debounce
  useEffect(() => {
    if (!nickname || nickname.length < 2 || !selectedCourse) {
      setNicknameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingNickname(true);
      try {
        const res = await api().get(`/leaderboard/check-nickname?course_id=${selectedCourse}&nickname=${encodeURIComponent(nickname)}`);
        setNicknameAvailable(res.data.available);
      } catch {
        setNicknameAvailable(null);
      } finally {
        setCheckingNickname(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [nickname, selectedCourse, api]);

  const handleJoin = async () => {
    if (!nicknameAvailable || !nickname.trim()) return;
    setJoining(true);
    try {
      await api().post('/leaderboard/join', { course_id: selectedCourse, nickname: nickname.trim() });
      toast.success(`Joined as "${nickname.trim()}"!`);
      setShowJoinModal(false);
      setNickname('');
      fetchLeaderboard();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      await api().post('/leaderboard/leave', { course_id: selectedCourse });
      toast.success('Left the leaderboard. Your progress is still tracked privately.');
      fetchLeaderboard();
    } catch {
      toast.error('Failed to leave leaderboard');
    }
  };

  const openProfile = (userId) => {
    setProfileUserId(userId);
    setShowProfile(true);
  };

  const isMyTab = (isStudent && activeTab === 'students') || (isMarker && activeTab === 'markers');
  const hasJoined = mySettings?.joined === true;
  const courseName = courses.find(c => c.id === selectedCourse)?.name || '';
  const badgeIcons = activeTab === 'students' ? STUDENT_BADGE_ICONS : MARKER_BADGE_ICONS;

  // Find my position
  const myEntry = leaderboard.find(e => e.user_id === user?.id);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8" data-testid="leaderboard-page">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 mb-8">
          <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(168,85,247,0.2) 0%, transparent 50%)'}} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white font-['Outfit']">Module Leaderboard</h1>
                  <p className="text-indigo-300 text-sm mt-0.5">Compete, earn recognition, stay private — your choice</p>
                </div>
              </div>
            </div>
            {myEntry && (
              <div className="text-right hidden sm:block">
                <div className="text-sm text-indigo-300">Your Rank</div>
                <div className="text-4xl font-bold text-white font-['Outfit']">#{myEntry.rank}</div>
                <div className="text-sm text-indigo-300">{myEntry.score} pts</div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-full sm:w-64" data-testid="course-selector">
              <SelectValue placeholder="Select module" />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'students' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('students')}
              data-testid="tab-students"
            >
              <Users className="w-4 h-4 inline mr-1.5" />Students
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'markers' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('markers')}
              data-testid="tab-markers"
            >
              <UserCheck className="w-4 h-4 inline mr-1.5" />Markers
            </button>
          </div>

          {/* Join/Leave button */}
          {isMyTab && selectedCourse && (
            <div className="sm:ml-auto">
              {hasJoined ? (
                <Button variant="outline" size="sm" onClick={handleLeave} data-testid="leave-leaderboard-btn">
                  <LogOut className="w-4 h-4 mr-1.5" />Leave Board
                </Button>
              ) : (
                <Button size="sm" onClick={() => setShowJoinModal(true)} data-testid="join-leaderboard-btn" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
                  <LogIn className="w-4 h-4 mr-1.5" />Join Leaderboard
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground animate-pulse">Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className="py-16 text-center">
            <Trophy className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No participants yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Be the first to join the {courseName} {activeTab === 'students' ? 'student' : 'marker'} leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="leaderboard-list">
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
                  const podiumRank = [2, 1, 3][idx];
                  const heights = ['h-28', 'h-36', 'h-24'];
                  const bgColors = [
                    'from-slate-300 to-slate-400',
                    'from-amber-300 to-amber-500',
                    'from-amber-600 to-amber-700',
                  ];
                  return (
                    <div key={entry.user_id} className="flex flex-col items-center cursor-pointer" onClick={() => openProfile(entry.user_id)}>
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xl font-bold mb-2 border-2 border-white dark:border-slate-700 shadow-lg">
                        {entry.nickname?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold truncate max-w-full">{entry.nickname}</span>
                      <span className="text-xs text-muted-foreground mb-2">{entry.score} pts</span>
                      <div className={`w-full ${heights[idx]} rounded-t-xl bg-gradient-to-t ${bgColors[idx]} flex items-end justify-center pb-3`}>
                        <span className="text-2xl font-bold text-white">#{podiumRank}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-3">Player</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Level</div>
                <div className="col-span-2 text-center">{activeTab === 'students' ? 'Fixed' : 'Reviews'}</div>
                <div className="col-span-2 text-center">Badges</div>
              </div>
              {leaderboard.map((entry) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div
                    key={entry.user_id}
                    className={`grid grid-cols-12 gap-2 px-4 py-3.5 border-t items-center transition-colors cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 ${isMe ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                    onClick={() => openProfile(entry.user_id)}
                    data-testid={`leaderboard-entry-${entry.rank}`}
                  >
                    <div className="col-span-1">
                      <RankBadge rank={entry.rank} />
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-bold">
                        {entry.nickname?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1">
                          {entry.nickname}
                          {isMe && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{entry.xp} XP</div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-lg font-bold">{entry.score}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <Badge variant="outline" className="text-xs">{entry.level_title}</Badge>
                    </div>
                    <div className="col-span-2 text-center font-medium">
                      {activeTab === 'students' ? entry.issues_fixed : entry.reviews_count}
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="flex justify-center gap-0.5">
                        {entry.top_badges?.slice(0, 3).map((b, i) => (
                          <span key={i} className="text-sm" title={b}>{badgeIcons[b] || '🏅'}</span>
                        ))}
                        {entry.badges_count > 3 && (
                          <span className="text-xs text-muted-foreground">+{entry.badges_count - 3}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My status card when not on board */}
        {isMyTab && !hasJoined && !loading && (
          <div className="mt-6 p-6 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-center">
            <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Your progress is tracked privately</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Join the leaderboard to compete with peers. Pick a nickname to stay anonymous — your real name is never shown.
            </p>
            <Button onClick={() => setShowJoinModal(true)} data-testid="join-leaderboard-cta" className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0">
              <Flame className="w-4 h-4 mr-1.5" />Join the Competition
            </Button>
          </div>
        )}
      </div>

      {/* Join Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="sm:max-w-md" data-testid="join-modal">
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />Join Module Leaderboard
            </DialogTitle>
            <DialogDescription>
              Choose a unique nickname for <strong>{courseName}</strong>. Your real name stays private.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your Nickname</label>
              <div className="relative">
                <Input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="e.g. CodeNinja42"
                  maxLength={20}
                  data-testid="nickname-input"
                  className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingNickname && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                  {!checkingNickname && nicknameAvailable === true && <Check className="w-4 h-4 text-emerald-500" />}
                  {!checkingNickname && nicknameAvailable === false && <X className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {nickname.length > 0 && nickname.length < 2 && (
                <p className="text-xs text-destructive mt-1">At least 2 characters required</p>
              )}
              {nicknameAvailable === false && (
                <p className="text-xs text-destructive mt-1">This nickname is taken in this module. Try another!</p>
              )}
              {nicknameAvailable === true && (
                <p className="text-xs text-emerald-600 mt-1">Nickname available!</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground space-y-1">
              <p><strong>Privacy:</strong> Only your nickname appears on the leaderboard</p>
              <p><strong>Per-module:</strong> You can use different nicknames in different modules</p>
              <p><strong>Optional:</strong> You can leave anytime — your XP and badges are kept</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinModal(false)}>Cancel</Button>
            <Button
              onClick={handleJoin}
              disabled={!nicknameAvailable || joining || nickname.length < 2}
              data-testid="confirm-join-btn"
            >
              {joining ? 'Joining...' : 'Join Leaderboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Modal */}
      <ProfileModal
        userId={profileUserId}
        courseId={selectedCourse}
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        api={api}
      />
    </AppLayout>
  );
}
