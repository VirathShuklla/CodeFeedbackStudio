import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  FileText, Clock, Upload, CheckCircle2, AlertCircle, Ban,
  Plus, X, BookOpen, Settings, Search, Users, CalendarDays,
  Flame, ArrowRight, GraduationCap, Sparkles, Filter, ChevronRight,
  Layers, Target, Timer, Zap, Trophy, Hourglass
} from 'lucide-react';
import Editor from '@monaco-editor/react';

// -------- Helpers --------
const STATUS_CONFIG = {
  todo: {
    label: 'To submit',
    dot: 'bg-amber-500',
    pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  },
  pending: {
    label: 'In review',
    dot: 'bg-sky-500',
    pill: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30',
  },
  reviewed: {
    label: 'Feedback available',
    dot: 'bg-violet-500',
    pill: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30',
  },
  clean: {
    label: 'No issues found',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-slate-400',
    pill: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600',
  },
};

const deriveAssignmentState = (assignment, submission) => {
  const isPast = assignment.is_past_deadline;
  if (submission?.status === 'feedback_released') return 'reviewed';
  if (submission?.status === 'no_issues') return 'clean';
  if (submission?.status === 'pending' || submission?.status === 'in_review') return 'pending';
  if (isPast && !submission) return 'closed';
  return 'todo';
};

const relativeDeadline = (dueDate) => {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const now = new Date();
  const diffMs = d - now;
  const diffHr = diffMs / (1000 * 60 * 60);
  const diffDay = diffHr / 24;
  const fmtFull = d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  if (diffMs < 0) return { text: 'Deadline passed', urgency: 'past', full: fmtFull };
  if (diffHr < 24) return { text: `Due in ${Math.max(1, Math.round(diffHr))}h`, urgency: 'urgent', full: fmtFull };
  if (diffDay < 3) return { text: `Due in ${Math.ceil(diffDay)} days`, urgency: 'soon', full: fmtFull };
  if (diffDay < 7) return { text: `Due in ${Math.ceil(diffDay)} days`, urgency: 'upcoming', full: fmtFull };
  return { text: `Due ${fmtFull}`, urgency: 'future', full: fmtFull };
};

const urgencyColor = (u) => {
  switch (u) {
    case 'past': return 'text-red-600 dark:text-red-400';
    case 'urgent': return 'text-orange-600 dark:text-orange-400';
    case 'soon': return 'text-amber-600 dark:text-amber-400';
    case 'upcoming': return 'text-sky-600 dark:text-sky-400';
    default: return 'text-muted-foreground';
  }
};

// -------- Small Components --------
const ProgressRing = ({ value = 0, size = 56, stroke = 6 }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none" className="text-slate-200 dark:text-slate-700" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="text-primary transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold">{value}%</span>
    </div>
  );
};

const StatPill = ({ icon: Icon, label, value, accent = 'text-primary', testId }) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-colors" data-testid={testId}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700/60 ${accent}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <div className="text-xs text-muted-foreground leading-none">{label}</div>
      <div className="text-lg font-semibold leading-tight mt-1">{value}</div>
    </div>
  </div>
);

// -------- Main Component --------
export default function StudentDashboard() {
  const { api, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterState, setFilterState] = useState('all'); // all, todo, pending, reviewed
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline'); // deadline, status, title

  // Submit dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [files, setFiles] = useState([{ id: '1', filename: 'main.py', content: '# Your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n' }]);
  const [activeFileId, setActiveFileId] = useState('1');

  // Course management
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  const fetchData = useCallback(async (preserveCourse = false) => {
    try {
      const enrolledRes = await api().get('/students/courses');
      setCourses(enrolledRes.data);

      const allCoursesRes = await api().get('/public/courses');
      setAllCourses(allCoursesRes.data);

      let courseId = selectedCourseId;
      if (!preserveCourse && (!courseId || !enrolledRes.data.some((c) => c.id === courseId))) {
        courseId = enrolledRes.data[0]?.id || null;
        setSelectedCourseId(courseId);
      }

      if (courseId) {
        const [assignmentsRes, submissionsRes] = await Promise.all([
          api().get(`/assignments?course_id=${courseId}`),
          api().get('/submissions'),
        ]);
        setAssignments(assignmentsRes.data.filter((a) => a.course_id === courseId));
        setSubmissions(submissionsRes.data);
      } else {
        setAssignments([]);
        setSubmissions([]);
      }
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [api, selectedCourseId]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    setLoading(true);
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      await api().post(`/students/enroll/${courseId}`);
      toast.success('Enrolled successfully!');
      await refreshUser();
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enroll');
    }
  };

  const handleUnenrollCourse = async (courseId) => {
    try {
      await api().delete(`/students/enroll/${courseId}`);
      toast.success('Unenrolled from course');
      await refreshUser();
      if (selectedCourseId === courseId) setSelectedCourseId(null);
      await fetchData(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to unenroll');
    }
  };

  const addFile = () => {
    const newId = String(files.length + 1);
    const newFile = { id: newId, filename: `file${newId}.py`, content: '# New file\n' };
    setFiles([...files, newFile]);
    setActiveFileId(newId);
  };

  const removeFile = (fileId) => {
    if (files.length <= 1) {
      toast.error('At least one file is required');
      return;
    }
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);
    if (activeFileId === fileId) setActiveFileId(newFiles[0].id);
  };

  const updateFileContent = (content) => {
    setFiles(files.map((f) => (f.id === activeFileId ? { ...f, content: content || '' } : f)));
  };

  const updateFileName = (fileId, newName) => {
    if (!newName.endsWith('.py')) newName += '.py';
    setFiles(files.map((f) => (f.id === fileId ? { ...f, filename: newName } : f)));
  };

  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files);
    for (const file of uploadedFiles) {
      if (!file.name.endsWith('.py')) {
        toast.error(`${file.name} is not a .py file`);
        continue;
      }
      const content = await file.text();
      const newId = String(Date.now());
      setFiles((prev) => [...prev, { id: newId, filename: file.name, content }]);
      setActiveFileId(newId);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || files.length === 0) {
      toast.error('Please add at least one file');
      return;
    }
    try {
      await api().post('/submissions', {
        assignment_id: selectedAssignment.id,
        files: files.map((f) => ({ filename: f.filename, content: f.content })),
      });
      toast.success('Submitted successfully!');
      setShowSubmitDialog(false);
      setFiles([{ id: '1', filename: 'main.py', content: '# Your Python code here\n' }]);
      setSelectedAssignment(null);
      await fetchData(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    }
  };

  const getLatestSubmission = (assignmentId) =>
    submissions.find((s) => s.assignment_id === assignmentId && s.is_latest_attempt);

  const currentCourse = courses.find((c) => c.id === selectedCourseId);
  const unenrolledCourses = allCourses.filter((c) => !courses.some((ec) => ec.id === c.id));

  // Course-level stats
  const courseStats = useMemo(() => {
    if (!assignments.length) return { total: 0, submitted: 0, pending: 0, reviewed: 0, todo: 0, progress: 0 };
    let submitted = 0, pending = 0, reviewed = 0, todo = 0;
    assignments.forEach((a) => {
      const sub = getLatestSubmission(a.id);
      const state = deriveAssignmentState(a, sub);
      if (sub) submitted += 1;
      if (state === 'pending') pending += 1;
      if (state === 'reviewed' || state === 'clean') reviewed += 1;
      if (state === 'todo') todo += 1;
    });
    return {
      total: assignments.length,
      submitted, pending, reviewed, todo,
      progress: Math.round((submitted / assignments.length) * 100),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, submissions]);

  // Next upcoming assignment
  const nextDeadlineAssignment = useMemo(() => {
    const now = Date.now();
    return assignments
      .filter((a) => {
        const sub = getLatestSubmission(a.id);
        return a.due_date && new Date(a.due_date).getTime() > now && !sub;
      })
      .sort((x, y) => new Date(x.due_date) - new Date(y.due_date))[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, submissions]);

  // Filtered & sorted assignments
  const visibleAssignments = useMemo(() => {
    let list = assignments;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
    }
    if (filterState !== 'all') {
      list = list.filter((a) => {
        const state = deriveAssignmentState(a, getLatestSubmission(a.id));
        if (filterState === 'reviewed') return state === 'reviewed' || state === 'clean';
        return state === filterState;
      });
    }
    const sorted = [...list];
    if (sortBy === 'deadline') {
      sorted.sort((x, y) => {
        if (!x.due_date) return 1;
        if (!y.due_date) return -1;
        return new Date(x.due_date) - new Date(y.due_date);
      });
    } else if (sortBy === 'title') {
      sorted.sort((x, y) => x.title.localeCompare(y.title));
    }
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, submissions, filterState, searchQuery, sortBy]);

  const filteredUnenrolled = unenrolledCourses.filter((c) => {
    if (!courseSearch.trim()) return true;
    const q = courseSearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading your courses...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-6 py-8" data-testid="student-dashboard">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl mb-8 border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-indigo-50 via-white to-sky-50 dark:from-slate-800 dark:via-slate-800/80 dark:to-slate-900 p-6 md:p-8 animate-slide-down" data-testid="student-hero">
          <div className="absolute inset-0 bg-grid-white/5 opacity-30 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Welcome back
              </p>
              <h1 className="text-3xl md:text-4xl font-bold font-['Outfit'] mt-1 dark:text-white">
                {user?.full_name?.split(' ')[0] || 'Student'}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                {courses.length === 0
                  ? "You're not enrolled in any course yet — browse and join one to get started."
                  : `You're enrolled in ${courses.length} course${courses.length > 1 ? 's' : ''}. Keep the streak going.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-700">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs text-muted-foreground leading-none">XP</div>
                  <div className="text-base font-semibold leading-tight mt-0.5">{user?.xp ?? 0}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-700">
                <Trophy className="w-4 h-4 text-violet-500" />
                <div>
                  <div className="text-xs text-muted-foreground leading-none">Level</div>
                  <div className="text-base font-semibold leading-tight mt-0.5">{user?.level ?? 1}</div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowCourseDialog(true)}
                className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 backdrop-blur"
                data-testid="manage-courses-btn"
              >
                <Settings className="w-4 h-4 mr-2" /> Manage
              </Button>
            </div>
          </div>
        </div>

        {/* No Courses State */}
        {courses.length === 0 ? (
          <div className="card-clean p-12 text-center dark:bg-slate-800/50 dark:border-slate-700">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <p className="text-lg font-medium mb-2">No courses yet</p>
            <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
              Enrol in a course to receive assignments, submit your work, and start earning XP.
            </p>
            <Button onClick={() => setShowCourseDialog(true)} className="btn-primary" data-testid="browse-courses-btn">
              Browse Courses <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : (
          <>
            {/* Course Cards Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4" /> My Courses ({courses.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course, idx) => {
                  const isActive = course.id === selectedCourseId;
                  return (
                    <button
                      key={course.id}
                      onClick={() => handleCourseChange(course.id)}
                      className={`group text-left p-5 rounded-xl border transition-all animate-slide-up ${
                        isActive
                          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-md -translate-y-0.5'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-sm'
                      }`}
                      style={{ animationDelay: `${idx * 60}ms` }}
                      data-testid={`course-card-${course.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {course.code && (
                              <span className="text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {course.code}
                              </span>
                            )}
                            {course.semester && course.year && (
                              <span className="text-[10px] text-muted-foreground">{course.semester} {course.year}</span>
                            )}
                          </div>
                          <h3 className="font-semibold text-base line-clamp-2 leading-tight">{course.name}</h3>
                        </div>
                        <ProgressRing value={course.progress_pct || 0} size={52} stroke={5} />
                      </div>

                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 min-h-[2rem]">{course.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> {course.leader_name}</span>
                        <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {course.student_count}</span>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                        <div className="flex gap-3">
                          <span className="text-muted-foreground">
                            <span className="font-semibold text-foreground">{course.assignments_count}</span> total
                          </span>
                          <span className="text-muted-foreground">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{course.submitted_count}</span> done
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:translate-x-0.5'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Course Detail */}
            {currentCourse && (
              <div className="space-y-6 animate-fade-in-up" data-testid="course-detail">
                {/* Course Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {currentCourse.code && (
                        <span className="text-xs font-mono tracking-wider uppercase px-2 py-1 rounded-md bg-primary/10 text-primary">
                          {currentCourse.code}
                        </span>
                      )}
                      {currentCourse.semester && currentCourse.year && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {currentCourse.semester} {currentCourse.year}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">· Led by {currentCourse.leader_name}</span>
                    </div>
                    <h2 className="text-2xl font-semibold font-['Outfit'] dark:text-white">{currentCourse.name}</h2>
                    {currentCourse.description && (
                      <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{currentCourse.description}</p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatPill icon={FileText} label="Assignments" value={courseStats.total} accent="text-primary" testId="stat-total" />
                  <StatPill icon={Upload} label="Submitted" value={courseStats.submitted} accent="text-emerald-600 dark:text-emerald-400" testId="stat-submitted" />
                  <StatPill icon={Hourglass} label="In review" value={courseStats.pending} accent="text-sky-600 dark:text-sky-400" testId="stat-pending" />
                  <StatPill icon={CheckCircle2} label="Feedback" value={courseStats.reviewed} accent="text-violet-600 dark:text-violet-400" testId="stat-reviewed" />
                </div>

                {/* Overall progress bar */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" /> Course progress
                    </span>
                    <span className="text-sm text-muted-foreground">{courseStats.submitted}/{courseStats.total} submitted</span>
                  </div>
                  <Progress value={courseStats.progress} className="h-2" data-testid="course-progress" />
                </div>

                {/* Next Deadline Callout */}
                {nextDeadlineAssignment && (() => {
                  const rel = relativeDeadline(nextDeadlineAssignment.due_date);
                  return (
                    <button
                      onClick={() => {
                        setSelectedAssignment(nextDeadlineAssignment);
                        setFiles([{ id: '1', filename: 'main.py', content: '# Your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n' }]);
                        setActiveFileId('1');
                        setShowSubmitDialog(true);
                      }}
                      className="w-full text-left p-5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 hover:shadow-md transition-shadow flex items-center justify-between gap-4"
                      data-testid="next-deadline-card"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-semibold">Next deadline</p>
                          <p className="font-semibold truncate">{nextDeadlineAssignment.title}</p>
                          <p className={`text-xs ${urgencyColor(rel?.urgency)}`}>{rel?.text} · {rel?.full}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    </button>
                  );
                })()}

                {/* Filters Bar */}
                {assignments.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search assignments..."
                        className="pl-9 h-10"
                        data-testid="assignment-search"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-x-auto">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'todo', label: 'To do' },
                        { key: 'pending', label: 'In review' },
                        { key: 'reviewed', label: 'Completed' },
                      ].map((f) => (
                        <button
                          key={f.key}
                          onClick={() => setFilterState(f.key)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                            filterState === f.key
                              ? 'bg-white dark:bg-slate-700 text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          data-testid={`filter-${f.key}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Filter className="w-3.5 h-3.5" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="bg-transparent border-none text-xs focus:outline-none cursor-pointer"
                        data-testid="sort-select"
                      >
                        <option value="deadline">By deadline</option>
                        <option value="title">By title</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Assignments List */}
                {assignments.length === 0 ? (
                  <div className="card-clean p-12 text-center dark:bg-slate-800/50 dark:border-slate-700">
                    <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="font-medium">No assignments yet</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">Your instructor hasn't released any assignments. Check back later.</p>
                  </div>
                ) : visibleAssignments.length === 0 ? (
                  <div className="card-clean p-10 text-center dark:bg-slate-800/50 dark:border-slate-700">
                    <Search className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No assignments match your filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleAssignments.map((assignment, idx) => {
                      const submission = getLatestSubmission(assignment.id);
                      const state = deriveAssignmentState(assignment, submission);
                      const cfg = STATUS_CONFIG[state];
                      const isPastDeadline = assignment.is_past_deadline;
                      const attemptCount = submissions.filter((s) => s.assignment_id === assignment.id).length;
                      const maxAttempts = assignment.max_attempts;
                      const canSubmit = !isPastDeadline && (maxAttempts === -1 || attemptCount < maxAttempts);
                      const hasReviewedFeedback = submission?.status === 'feedback_released' || submission?.status === 'no_issues';
                      const rel = relativeDeadline(assignment.due_date);

                      return (
                        <div
                          key={assignment.id}
                          className="group p-5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all animate-slide-up"
                          style={{ animationDelay: `${idx * 40}ms` }}
                          data-testid={`assignment-${assignment.id}`}
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cfg.pill}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.label}
                                </span>
                                {submission?.marks_visible && typeof submission?.marks === 'number' && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
                                    {submission.marks}/{assignment.total_marks || 100}
                                  </span>
                                )}
                                {submission?.issues_count > 0 && hasReviewedFeedback && (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30">
                                    <AlertCircle className="w-3 h-3" /> {submission.issues_count} issue{submission.issues_count > 1 ? 's' : ''}
                                  </span>
                                )}
                                {maxAttempts > 0 && (
                                  <span className="text-[11px] text-muted-foreground">· {attemptCount}/{maxAttempts} attempts</span>
                                )}
                              </div>
                              <h3 className="font-semibold text-base leading-tight">{assignment.title}</h3>
                              {assignment.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assignment.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs mb-4">
                            {rel && (
                              <span className={`flex items-center gap-1.5 ${urgencyColor(rel.urgency)}`}>
                                {rel.urgency === 'urgent' || rel.urgency === 'past' ? <Timer className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                {rel.text}
                              </span>
                            )}
                            {submission?.files?.length > 0 && (
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                {submission.files.length} file{submission.files.length !== 1 ? 's' : ''}
                              </span>
                            )}
                            {assignment.total_marks && (
                              <span className="text-muted-foreground">Worth {assignment.total_marks} marks</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            {hasReviewedFeedback && (
                              <Button
                                variant="outline"
                                onClick={() => navigate(`/student/feedback/${submission.id}`)}
                                className="flex-1"
                                data-testid={`view-feedback-btn-${assignment.id}`}
                              >
                                View Feedback
                              </Button>
                            )}
                            {isPastDeadline && !submission ? (
                              <Button disabled className="flex-1" data-testid={`submit-btn-${assignment.id}`}>
                                <Ban className="w-4 h-4 mr-2" /> Submissions closed
                              </Button>
                            ) : canSubmit ? (
                              <Button
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setFiles([{ id: '1', filename: 'main.py', content: '# Your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n' }]);
                                  setActiveFileId('1');
                                  setShowSubmitDialog(true);
                                }}
                                className="btn-primary flex-1"
                                data-testid={`submit-btn-${assignment.id}`}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                {submission ? 'Resubmit' : 'Submit'}
                              </Button>
                            ) : (
                              !hasReviewedFeedback && (
                                <Button disabled className="flex-1">Max attempts reached</Button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Submit Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Submit: {selectedAssignment?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-t text-sm cursor-pointer transition-colors ${
                    file.id === activeFileId ? 'bg-slate-100 dark:bg-slate-700 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setActiveFileId(file.id)}
                >
                  <input
                    type="text"
                    value={file.filename}
                    onChange={(e) => updateFileName(file.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-none outline-none w-24 text-sm"
                  />
                  {files.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addFile} className="h-7">
                <Plus className="w-3 h-3" />
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".py" multiple className="hidden" />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 ml-auto">
                <Upload className="w-3 h-3 mr-1" /> Upload
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden h-[400px]">
              <Editor
                height="400px"
                defaultLanguage="python"
                value={files.find((f) => f.id === activeFileId)?.content || ''}
                onChange={updateFileContent}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 12 },
                }}
              />
            </div>
            <DialogFooter className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''} ready to submit
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmit} className="btn-primary" data-testid="submit-code-btn">
                  Submit {files.length > 1 ? `${files.length} files` : ''}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Course Management Dialog */}
        <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Manage Courses</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              {courses.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Your Courses</h4>
                  <div className="space-y-2">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {course.code ? `${course.code} – ` : ''}{course.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{course.leader_name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={() => handleUnenrollCourse(course.id)}
                          data-testid={`unenroll-btn-${course.id}`}
                        >
                          Leave
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {unenrolledCourses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Courses</h4>
                  </div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Search courses..."
                      className="pl-9 h-9 text-sm"
                      data-testid="course-search-input"
                    />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredUnenrolled.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No matching courses</p>
                    ) : (
                      filteredUnenrolled.map((course) => (
                        <div
                          key={course.id}
                          className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary/30"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {course.code ? `${course.code} – ` : ''}{course.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {course.leader_name} · {course.student_count} students
                            </p>
                          </div>
                          <Button size="sm" onClick={() => handleEnrollCourse(course.id)} data-testid={`enroll-btn-${course.id}`}>
                            Enrol
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {courses.length === 0 && unenrolledCourses.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No courses available. Contact your instructor.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
