import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { FileText, Clock, Upload, CheckCircle2, AlertCircle, Ban } from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function StudentDashboard() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Submit dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [codeContent, setCodeContent] = useState('# Your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n');

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const [assignmentsRes, submissionsRes] = await Promise.all([
        api().get('/assignments'),
        api().get('/submissions')
      ]);
      setAssignments(assignmentsRes.data);
      setSubmissions(submissionsRes.data);
      
      // Get course info
      if (user?.course_id) {
        try {
          const courseRes = await api().get(`/courses/${user.course_id}`);
          setCourse(courseRes.data);
        } catch (e) {
          // Course might not exist
        }
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !codeContent.trim()) {
      toast.error('Please provide code');
      return;
    }
    
    try {
      await api().post('/submissions', {
        assignment_id: selectedAssignment.id,
        code_content: codeContent,
        filename: 'main.py'
      });
      toast.success('Submitted successfully!');
      setShowSubmitDialog(false);
      setCodeContent('# Your Python code here\n');
      setSelectedAssignment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    }
  };

  const getLatestSubmission = (assignmentId) => {
    return submissions.find(s => s.assignment_id === assignmentId);
  };

  const getStatusDisplay = (submission) => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'pending':
      case 'in_review':
        return { label: 'Pending review', class: 'status-pending', icon: Clock };
      case 'feedback_released':
        return { label: 'Reviewed – feedback available', class: 'status-reviewed', icon: AlertCircle };
      case 'no_issues':
        return { label: 'Reviewed – no issues found', class: 'status-reviewed', icon: CheckCircle2 };
      default:
        return { label: submission.status, class: 'status-pending', icon: Clock };
    }
  };

  const formatDeadline = (dueDate) => {
    if (!dueDate) return null;
    return new Date(dueDate).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
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

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-6 py-8" data-testid="student-dashboard">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold font-['Outfit']">
            {course ? `${course.code ? `${course.code} – ` : ''}${course.name}` : 'Your Assignments'}
          </h1>
          {course && (
            <p className="text-sm text-muted-foreground mt-1">
              {course.semester && course.year ? `${course.semester} ${course.year}` : ''}
            </p>
          )}
        </div>

        {/* Assignments */}
        {assignments.length === 0 ? (
          <div className="card-clean p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No assignments yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Check back later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const submission = getLatestSubmission(assignment.id);
              const status = getStatusDisplay(submission);
              const isPastDeadline = assignment.is_past_deadline;
              const canSubmit = !isPastDeadline && (!submission || submissions.filter(s => s.assignment_id === assignment.id).length < assignment.max_attempts);
              const hasReviewedFeedback = submission?.status === 'feedback_released' || submission?.status === 'no_issues';
              
              return (
                <div key={assignment.id} className="card-clean p-5" data-testid={`assignment-${assignment.id}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{assignment.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Deadline */}
                  {assignment.due_date && (
                    <div className={`flex items-center gap-1.5 text-sm mb-4 ${isPastDeadline ? 'text-red-600' : 'text-muted-foreground'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {isPastDeadline ? 'Closed' : `Due ${formatDeadline(assignment.due_date)}`}
                      </span>
                    </div>
                  )}
                  
                  {/* Status */}
                  {status && (
                    <div className="flex items-center gap-2 mb-4">
                      <status.icon className="w-4 h-4" />
                      <span className={status.class}>{status.label}</span>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-3">
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
                    
                    {isPastDeadline ? (
                      <Button disabled className="flex-1" data-testid={`submit-btn-${assignment.id}`}>
                        <Ban className="w-4 h-4 mr-2" /> Submissions closed
                      </Button>
                    ) : canSubmit ? (
                      <Button 
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowSubmitDialog(true);
                        }}
                        className="btn-primary flex-1"
                        data-testid={`submit-btn-${assignment.id}`}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {submission ? 'Resubmit' : 'Submit'}
                      </Button>
                    ) : !hasReviewedFeedback && (
                      <Button disabled className="flex-1">
                        Max attempts reached
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Submit: {selectedAssignment?.title}</DialogTitle>
            </DialogHeader>
            
            <div className="mt-4 border rounded-lg overflow-hidden h-[400px]">
              <Editor
                height="400px"
                defaultLanguage="python"
                value={codeContent}
                onChange={(value) => setCodeContent(value || '')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: { top: 12 }
                }}
              />
            </div>
            
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="btn-primary" data-testid="submit-code-btn">
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
