import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, ChevronRight, BookOpen, Clock } from 'lucide-react';

export default function MarkerDashboard() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, reviewed: 0 });
  
  // Course creation
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', year: new Date().getFullYear(), semester: '' });

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const [coursesRes, analyticsRes] = await Promise.all([
        api().get('/courses'),
        api().get('/analytics/marker')
      ]);
      setCourses(coursesRes.data);
      setStats({
        pending: analyticsRes.data.total_pending_reviews,
        reviewed: analyticsRes.data.total_feedback_given
      });
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.name.trim()) {
      toast.error('Course name is required');
      return;
    }
    try {
      await api().post('/courses', newCourse);
      toast.success('Course created');
      setShowCourseDialog(false);
      setNewCourse({ name: '', code: '', year: new Date().getFullYear(), semester: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create course');
    }
  };

  const getPendingCount = (courseId) => {
    // This would ideally come from the backend
    return 0;
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="marker-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold font-['Outfit']">Your Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {stats.pending > 0 ? `${stats.pending} pending reviews` : 'All caught up'}
            </p>
          </div>
          
          <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
            <DialogTrigger asChild>
              <Button className="btn-primary gap-2" data-testid="create-course-btn">
                <Plus className="w-4 h-4" /> New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">Create Course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Course Code</Label>
                    <Input
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                      placeholder="CS101"
                      className="input-clean"
                      data-testid="course-code-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Year</Label>
                    <Input
                      type="number"
                      value={newCourse.year}
                      onChange={(e) => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })}
                      className="input-clean"
                      data-testid="course-year-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Course Name *</Label>
                  <Input
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                    placeholder="Introduction to Programming"
                    className="input-clean"
                    data-testid="course-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Semester</Label>
                  <Input
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                    placeholder="Fall 2026"
                    className="input-clean"
                    data-testid="course-semester-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCourseDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateCourse} className="btn-primary" data-testid="save-course-btn">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Summary - Minimal */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card-clean p-5">
            <p className="text-sm text-muted-foreground">Pending Reviews</p>
            <p className="text-3xl font-semibold mt-1 font-['Outfit']">{stats.pending}</p>
          </div>
          <div className="card-clean p-5">
            <p className="text-sm text-muted-foreground">Feedback Given</p>
            <p className="text-3xl font-semibold mt-1 font-['Outfit']">{stats.reviewed}</p>
          </div>
        </div>

        {/* Course List */}
        {courses.length === 0 ? (
          <div className="card-clean p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No courses yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Create your first course to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="card-hover p-5 flex items-center justify-between group"
                onClick={() => navigate(`/marker/course/${course.id}`)}
                data-testid={`course-card-${course.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">
                      {course.code ? `${course.code} – ` : ''}{course.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {course.semester && course.year ? `${course.semester} ${course.year}` : course.year || 'No term'}
                      {' · '}{course.student_count} student{course.student_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
