import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, FileText, Clock, ChevronRight, Users, Crown } from 'lucide-react';

export default function MarkerCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment creation
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ 
    title: '', 
    description: '', 
    due_date: '',
    max_attempts: -1  // -1 means unlimited
  });

  useEffect(() => {
    fetchData();
  }, [api, courseId]);

  const fetchData = async () => {
    try {
      const [courseRes, assignmentsRes, submissionsRes] = await Promise.all([
        api().get(`/courses/${courseId}`),
        api().get(`/assignments?course_id=${courseId}`),
        api().get(`/submissions?course_id=${courseId}`)
      ]);
      setCourse(courseRes.data);
      setAssignments(assignmentsRes.data);
      setSubmissions(submissionsRes.data);
    } catch (error) {
      toast.error('Failed to load course');
      navigate('/marker');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.title.trim()) {
      toast.error('Assignment title is required');
      return;
    }
    try {
      const payload = { 
        ...newAssignment, 
        course_id: courseId,
        due_date: newAssignment.due_date ? new Date(newAssignment.due_date).toISOString() : null
      };
      await api().post('/assignments', payload);
      toast.success('Assignment created');
      setShowAssignmentDialog(false);
      setNewAssignment({ title: '', description: '', due_date: '', max_attempts: -1 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    }
  };

  const getSubmissionsForAssignment = (assignmentId) => {
    return submissions.filter(s => s.assignment_id === assignmentId);
  };

  const getPendingCount = (assignmentId) => {
    return submissions.filter(s => s.assignment_id === assignmentId && (s.status === 'pending' || s.status === 'in_review')).length;
  };

  const formatDeadline = (dueDate) => {
    if (!dueDate) return 'No deadline';
    return new Date(dueDate).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
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

  const pendingSubmissions = submissions.filter(s => s.status === 'pending' || s.status === 'in_review');
  const isLeader = course?.leader_id === user?.id;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="marker-course-page">
        {/* Back + Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/marker')}
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold font-['Outfit']">
                  {course?.code ? `${course.code} – ` : ''}{course?.name}
                </h1>
                {isLeader ? (
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="w-3 h-3 mr-1" /> Leader
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Collaborator</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {course?.semester && course?.year ? `${course.semester} ${course.year}` : ''}
                {course?.student_count > 0 && ` · ${course.student_count} students`}
              </p>
            </div>
            
            {isLeader && (
              <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
                <DialogTrigger asChild>
                  <Button className="btn-primary gap-2" data-testid="create-assignment-btn">
                    <Plus className="w-4 h-4" /> New Assignment
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-['Outfit']">Create Assignment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Title *</Label>
                    <Input
                      value={newAssignment.title}
                      onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                      placeholder="Week 1 – Variables"
                      className="input-clean"
                      data-testid="assignment-title-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Description</Label>
                    <Textarea
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                      placeholder="Instructions for students..."
                      className="input-clean min-h-[80px]"
                      data-testid="assignment-description-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={newAssignment.due_date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                        className="input-clean"
                        data-testid="due-date-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Max Attempts</Label>
                      <Input
                        type="number"
                        value={newAssignment.max_attempts}
                        onChange={(e) => setNewAssignment({ ...newAssignment, max_attempts: parseInt(e.target.value) })}
                        min={-1}
                        max={100}
                        className="input-clean"
                        data-testid="max-attempts-input"
                      />
                      <p className="text-xs text-muted-foreground">-1 = unlimited</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Cancel</Button>
                  <Button onClick={handleCreateAssignment} className="btn-primary" data-testid="save-assignment-btn">
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>

        {/* Stats - Minimal */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="card-clean p-5">
            <p className="text-sm text-muted-foreground">Pending Reviews</p>
            <p className="text-3xl font-semibold mt-1 font-['Outfit']">{pendingSubmissions.length}</p>
          </div>
          <div className="card-clean p-5">
            <p className="text-sm text-muted-foreground">Total Submissions</p>
            <p className="text-3xl font-semibold mt-1 font-['Outfit']">{submissions.length}</p>
          </div>
        </div>

        {/* Pending Submissions - Priority */}
        {pendingSubmissions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold font-['Outfit'] mb-4">Pending Reviews</h2>
            <div className="space-y-2">
              {pendingSubmissions.slice(0, 10).map((sub) => (
                <div
                  key={sub.id}
                  className="card-hover p-4 flex items-center justify-between group"
                  onClick={() => navigate(`/marker/review/${sub.id}`)}
                  data-testid={`submission-${sub.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-xs font-medium text-amber-700">
                        {sub.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sub.student_name}</p>
                      <p className="text-xs text-muted-foreground">Attempt {sub.attempt_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={sub.status === 'pending' ? 'status-pending' : 'text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700'}>
                      {sub.status === 'pending' ? 'Pending' : 'In Review'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div>
          <h2 className="text-lg font-semibold font-['Outfit'] mb-4">Assignments</h2>
          {assignments.length === 0 ? (
            <div className="card-clean p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No assignments yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Create an assignment to receive submissions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const assignmentSubs = getSubmissionsForAssignment(assignment.id);
                const pending = getPendingCount(assignment.id);
                const isPastDeadline = assignment.is_past_deadline;
                
                return (
                  <div
                    key={assignment.id}
                    className={`card-clean p-5 ${isPastDeadline ? 'opacity-60' : ''}`}
                    data-testid={`assignment-card-${assignment.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{assignment.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDeadline(assignment.due_date)}
                          </span>
                          <span>{assignmentSubs.length} submission{assignmentSubs.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {pending > 0 && (
                        <span className="status-pending">{pending} pending</span>
                      )}
                      {isPastDeadline && pending === 0 && (
                        <span className="status-closed">Closed</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
