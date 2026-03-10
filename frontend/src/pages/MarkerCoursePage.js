import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  ArrowLeft, Plus, FileText, Clock, ChevronRight, Users, Crown, 
  Upload, Shield, Calendar, Eye, EyeOff, CheckCircle2, AlertTriangle,
  Send, Trash2
} from 'lucide-react';

export default function MarkerCoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [allMarkers, setAllMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Assignment creation
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ 
    title: '', 
    description: '', 
    due_date: '',
    schedule_release_date: '',
    max_attempts: -1,
    total_marks: 100
  });
  const [hasDeadline, setHasDeadline] = useState(false);
  const [hasScheduleRelease, setHasScheduleRelease] = useState(false);
  
  // Publish results dialog
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [selectedAssignmentForPublish, setSelectedAssignmentForPublish] = useState(null);
  const [publishDate, setPublishDate] = useState('');
  const [reviewStatus, setReviewStatus] = useState(null);
  const [loadingReviewStatus, setLoadingReviewStatus] = useState(false);
  
  // Moderator management
  const [showModeratorDialog, setShowModeratorDialog] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState('');
  
  // Collaborator management
  const [showCollaboratorDialog, setShowCollaboratorDialog] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState('');
  
  // Module Leader transfer
  const [showLeaderDialog, setShowLeaderDialog] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState('');
  
  // Marking scheme upload
  const [uploadingScheme, setUploadingScheme] = useState(null);
  
  // Delete assignment
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, [api, courseId]);

  const fetchData = async () => {
    try {
      const [courseRes, assignmentsRes, submissionsRes, markersRes] = await Promise.all([
        api().get(`/courses/${courseId}`),
        api().get(`/assignments?course_id=${courseId}`),
        api().get(`/submissions?course_id=${courseId}`),
        api().get('/public/users')
      ]);
      setCourse(courseRes.data);
      setAssignments(assignmentsRes.data);
      setSubmissions(submissionsRes.data);
      setAllMarkers(markersRes.data.filter(m => m.id !== user.id && m.role !== 'student'));
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
    
    // Validate deadline if enabled
    if (hasDeadline && !newAssignment.due_date) {
      toast.error('Please enter a deadline date/time');
      return;
    }
    
    // Validate release date if enabled
    if (hasScheduleRelease && !newAssignment.schedule_release_date) {
      toast.error('Please enter a release date/time');
      return;
    }
    
    try {
      const payload = { 
        ...newAssignment, 
        course_id: courseId,
        has_deadline: hasDeadline,
        due_date: hasDeadline && newAssignment.due_date ? new Date(newAssignment.due_date).toISOString() : null,
        has_schedule_release: hasScheduleRelease,
        schedule_release_date: hasScheduleRelease && newAssignment.schedule_release_date ? new Date(newAssignment.schedule_release_date).toISOString() : null
      };
      await api().post('/assignments', payload);
      toast.success('Assignment created successfully');
      setShowAssignmentDialog(false);
      setNewAssignment({ title: '', description: '', due_date: '', schedule_release_date: '', max_attempts: -1, total_marks: 100 });
      setHasDeadline(false);
      setHasScheduleRelease(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    }
  };

  const handleOpenPublishDialog = async (assignment) => {
    setSelectedAssignmentForPublish(assignment);
    setPublishDate('');
    setLoadingReviewStatus(true);
    setShowPublishDialog(true);
    
    try {
      const res = await api().get(`/assignments/${assignment.id}/review-status`);
      setReviewStatus(res.data);
    } catch (error) {
      toast.error('Failed to load review status');
    } finally {
      setLoadingReviewStatus(false);
    }
  };

  const handlePublishResults = async () => {
    if (!publishDate) {
      toast.error('Please select a publish date/time');
      return;
    }
    
    try {
      const res = await api().post(`/assignments/${selectedAssignmentForPublish.id}/publish-results`, {
        publish_date: new Date(publishDate).toISOString()
      });
      
      if (res.data.warning) {
        toast.warning(res.data.warning);
      }
      toast.success('Results publication scheduled successfully');
      setShowPublishDialog(false);
      setSelectedAssignmentForPublish(null);
      setPublishDate('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule results publication');
    }
  };

  const handleUploadMarkingScheme = async (assignmentId, file) => {
    if (!file) return;
    
    setUploadingScheme(assignmentId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api().post(`/assignments/${assignmentId}/marking-scheme`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Marking scheme uploaded');
      fetchData();
    } catch (error) {
      toast.error('Failed to upload marking scheme');
    } finally {
      setUploadingScheme(null);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
      await api().delete(`/assignments/${assignmentToDelete.id}`);
      toast.success('Assignment deleted');
      setShowDeleteDialog(false);
      setAssignmentToDelete(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete assignment');
    }
  };

  const handleAddModerator = async () => {
    if (!selectedModerator) {
      toast.error('Please select a moderator');
      return;
    }
    
    try {
      const newModerators = [...(course.moderator_ids || []), selectedModerator];
      await api().put(`/courses/${courseId}`, {
        moderator_ids: newModerators
      });
      toast.success('Moderator added');
      setShowModeratorDialog(false);
      setSelectedModerator('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add moderator');
    }
  };

  const handleRemoveModerator = async (modId) => {
    try {
      const newModerators = course.moderator_ids.filter(id => id !== modId);
      await api().put(`/courses/${courseId}`, {
        moderator_ids: newModerators
      });
      toast.success('Moderator removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove moderator');
    }
  };

  const handleAddCollaborator = async () => {
    if (!selectedCollaborator) {
      toast.error('Please select a marker');
      return;
    }
    
    try {
      const newCollaborators = [...(course.collaborator_ids || []), selectedCollaborator];
      await api().put(`/courses/${courseId}`, {
        collaborator_ids: newCollaborators
      });
      toast.success('Collaborator added');
      setShowCollaboratorDialog(false);
      setSelectedCollaborator('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (collabId) => {
    try {
      const newCollaborators = course.collaborator_ids.filter(id => id !== collabId);
      await api().put(`/courses/${courseId}`, {
        collaborator_ids: newCollaborators
      });
      toast.success('Collaborator removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove collaborator');
    }
  };

  const handleTransferLeadership = async () => {
    if (!selectedNewLeader) {
      toast.error('Please select a new module leader');
      return;
    }
    
    try {
      await api().put(`/courses/${courseId}`, {
        leader_id: selectedNewLeader
      });
      toast.success('Leadership transferred successfully');
      setShowLeaderDialog(false);
      setSelectedNewLeader('');
      navigate('/marker');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to transfer leadership');
    }
  };

  const getSubmissionsForAssignment = (assignmentId) => {
    return submissions.filter(s => s.assignment_id === assignmentId);
  };

  const getPendingCount = (assignmentId) => {
    return submissions.filter(s => s.assignment_id === assignmentId && (s.status === 'pending' || s.status === 'in_review')).length;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const canAccessSubmissions = (assignment) => {
    // If no deadline is set, markers can access submissions immediately
    if (!assignment.has_deadline || !assignment.due_date) return true;
    // If deadline is set, only after it passes
    return assignment.is_past_deadline;
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
              
              {/* Team Management - Leader only */}
              {isLeader && (
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {course?.collaborators?.length || 0} collaborator{(course?.collaborators?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setShowCollaboratorDialog(true)}
                      data-testid="add-collaborator-btn"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      {course?.moderators?.length || 0} moderator{(course?.moderators?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setShowModeratorDialog(true)}
                      data-testid="add-moderator-btn"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowLeaderDialog(true)}
                    data-testid="transfer-leader-btn"
                  >
                    <Crown className="w-3 h-3 mr-1" /> Transfer Leadership
                  </Button>
                </div>
              )}
            </div>
            
            {isLeader && (
              <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
                <DialogTrigger asChild>
                  <Button className="btn-primary gap-2" data-testid="create-assignment-btn">
                    <Plus className="w-4 h-4" /> New Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-['Outfit']">Create Assignment</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Title *</Label>
                      <Input
                        value={newAssignment.title}
                        onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                        placeholder="Week 1 – Variables"
                        className="input-clean"
                        data-testid="assignment-title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <Textarea
                        value={newAssignment.description}
                        onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                        placeholder="Instructions for students..."
                        className="input-clean min-h-[80px]"
                        data-testid="assignment-description-input"
                      />
                    </div>
                    
                    {/* Schedule Release */}
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-blue-500" />
                          <Label className="text-sm font-medium">Schedule Release?</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${!hasScheduleRelease ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>No</span>
                          <Switch
                            checked={hasScheduleRelease}
                            onCheckedChange={setHasScheduleRelease}
                            data-testid="schedule-release-switch"
                          />
                          <span className={`text-xs ${hasScheduleRelease ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Yes</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {hasScheduleRelease 
                          ? 'Students will only see this assignment after the release date' 
                          : 'Assignment will be visible to students immediately after creation'}
                      </p>
                      {hasScheduleRelease && (
                        <Input
                          type="datetime-local"
                          value={newAssignment.schedule_release_date}
                          onChange={(e) => setNewAssignment({ ...newAssignment, schedule_release_date: e.target.value })}
                          className="input-clean"
                          data-testid="schedule-release-input"
                        />
                      )}
                    </div>
                    
                    {/* Set Deadline */}
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <Label className="text-sm font-medium">Set a Deadline?</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${!hasDeadline ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>No</span>
                          <Switch
                            checked={hasDeadline}
                            onCheckedChange={setHasDeadline}
                            data-testid="deadline-switch"
                          />
                          <span className={`text-xs ${hasDeadline ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Yes</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {hasDeadline 
                          ? 'Students can submit until the deadline. You can only review submissions after the deadline.' 
                          : 'No deadline. Submissions visible to you immediately after students submit.'}
                      </p>
                      {hasDeadline && (
                        <Input
                          type="datetime-local"
                          value={newAssignment.due_date}
                          onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                          className="input-clean"
                          data-testid="due-date-input"
                        />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Max Attempts</Label>
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
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Total Marks</Label>
                        <Input
                          type="number"
                          value={newAssignment.total_marks}
                          onChange={(e) => setNewAssignment({ ...newAssignment, total_marks: parseInt(e.target.value) })}
                          min={1}
                          max={1000}
                          className="input-clean"
                          data-testid="total-marks-input"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateAssignment} className="btn-primary" data-testid="save-assignment-btn">
                      Create Assignment
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
                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                        {sub.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sub.student_name}</p>
                      <p className="text-xs text-muted-foreground">Attempt {sub.attempt_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={sub.status === 'pending' ? 'status-pending' : 'text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}>
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
            <div className="space-y-4">
              {assignments.map((assignment) => {
                const assignmentSubs = getSubmissionsForAssignment(assignment.id);
                const pending = getPendingCount(assignment.id);
                const canAccess = canAccessSubmissions(assignment);
                const isPastDeadline = assignment.is_past_deadline;
                const isReleased = assignment.is_released;
                const resultsPublished = assignment.results_published;
                
                return (
                  <div
                    key={assignment.id}
                    className="card-clean p-5"
                    data-testid={`assignment-card-${assignment.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">{assignment.title}</h3>
                          {!isReleased && (
                            <Badge variant="outline" className="text-xs">
                              <EyeOff className="w-3 h-3 mr-1" /> Hidden
                            </Badge>
                          )}
                          {resultsPublished && (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Results Published
                            </Badge>
                          )}
                        </div>
                        
                        {/* Assignment Info Grid */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-muted-foreground mt-3">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                            <span>
                              Release: {assignment.has_schedule_release 
                                ? formatDateTime(assignment.schedule_release_date)
                                : 'Immediate'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                              Deadline: {assignment.has_deadline 
                                ? formatDateTime(assignment.due_date)
                                : 'No deadline'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            <span>
                              {assignment.submissions_reviewed}/{assignment.total_submissions} reviewed
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{assignment.total_marks || 100} marks</span>
                          </div>
                        </div>
                        
                        {/* Marking scheme info */}
                        <div className="flex items-center gap-3 mt-3">
                          {assignment.marking_scheme_url ? (
                            <a 
                              href={`${process.env.REACT_APP_BACKEND_URL}${assignment.marking_scheme_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> View Marking Scheme
                            </a>
                          ) : isLeader && (
                            <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-primary">
                              <Upload className="w-3 h-3" />
                              {uploadingScheme === assignment.id ? 'Uploading...' : 'Upload Marking Scheme'}
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                onChange={(e) => handleUploadMarkingScheme(assignment.id, e.target.files[0])}
                                disabled={uploadingScheme === assignment.id}
                              />
                            </label>
                          )}
                          
                          {assignment.results_publish_date && !resultsPublished && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Results scheduled: {formatDateTime(assignment.results_publish_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {pending > 0 && (
                          <span className="status-pending">{pending} pending</span>
                        )}
                        {isPastDeadline && pending === 0 && assignment.has_deadline && (
                          <span className="status-closed">Closed</span>
                        )}
                        
                        {/* Publish Results Button - only show if there are submissions and not yet published */}
                        {isLeader && assignment.total_submissions > 0 && !resultsPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleOpenPublishDialog(assignment)}
                            data-testid={`publish-results-btn-${assignment.id}`}
                          >
                            <Send className="w-3 h-3 mr-1" /> Publish Results
                          </Button>
                        )}
                        
                        {/* Delete Button - Leader only */}
                        {isLeader && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setAssignmentToDelete(assignment); setShowDeleteDialog(true); }}
                            data-testid={`delete-assignment-btn-${assignment.id}`}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                        )}
                        
                        {/* Access warning */}
                        {!canAccess && assignment.has_deadline && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Awaiting deadline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Publish Results Dialog */}
        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Publish Results</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Schedule when all students will receive their marks and feedback for <strong>{selectedAssignmentForPublish?.title}</strong>.
              </p>
              
              {/* Review Status */}
              {loadingReviewStatus ? (
                <div className="p-4 border rounded-lg text-center text-muted-foreground">
                  Loading review status...
                </div>
              ) : reviewStatus && (
                <div className="space-y-3">
                  <div className={`p-4 border rounded-lg ${
                    reviewStatus.pending_count === 0 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' 
                      : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Review Progress</span>
                      <span className={`text-sm font-medium ${
                        reviewStatus.pending_count === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {reviewStatus.reviewed_count}/{reviewStatus.total_submissions} reviewed
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          reviewStatus.pending_count === 0 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${reviewStatus.total_submissions > 0 ? (reviewStatus.reviewed_count / reviewStatus.total_submissions) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  
                  {reviewStatus.pending_count > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                          {reviewStatus.pending_count} submission{reviewStatus.pending_count !== 1 ? 's' : ''} still pending review
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                          You can still publish results, but students with unreviewed submissions won't receive feedback yet.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {reviewStatus.pending_count === 0 && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm text-emerald-800 dark:text-emerald-300">
                        All submissions have been reviewed. Ready to publish!
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Publish Date/Time */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Publish Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="input-clean"
                  data-testid="publish-date-input"
                />
                <p className="text-xs text-muted-foreground">
                  At this time, all students will be able to see their marks and feedback.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
              <Button 
                onClick={handlePublishResults} 
                className="btn-primary"
                disabled={!publishDate}
                data-testid="confirm-publish-btn"
              >
                <Send className="w-4 h-4 mr-1" /> Schedule Publication
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Moderator Dialog */}
        <Dialog open={showModeratorDialog} onOpenChange={setShowModeratorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Manage Moderators</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {course?.moderators?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Current Moderators</p>
                  <div className="space-y-2">
                    {course.moderators.map((mod) => (
                      <div key={mod.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">{mod.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveModerator(mod.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm">Add Moderator</Label>
                <Select value={selectedModerator} onValueChange={setSelectedModerator}>
                  <SelectTrigger data-testid="moderator-select">
                    <SelectValue placeholder="Choose a marker" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMarkers
                      .filter(m => !(course?.moderator_ids || []).includes(m.id) && !(course?.collaborator_ids || []).includes(m.id))
                      .map((marker) => (
                        <SelectItem key={marker.id} value={marker.id}>
                          {marker.full_name} ({marker.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowModeratorDialog(false)}>Close</Button>
              <Button 
                onClick={handleAddModerator} 
                className="btn-primary"
                disabled={!selectedModerator}
                data-testid="add-moderator-confirm-btn"
              >
                Add Moderator
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Collaborator Dialog */}
        <Dialog open={showCollaboratorDialog} onOpenChange={setShowCollaboratorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Manage Collaborators</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {course?.collaborators?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Current Collaborators</p>
                  <div className="space-y-2">
                    {course.collaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">{collab.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-red-500 hover:text-red-600"
                          onClick={() => handleRemoveCollaborator(collab.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm">Add Collaborator</Label>
                <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                  <SelectTrigger data-testid="collaborator-select">
                    <SelectValue placeholder="Choose a marker" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMarkers
                      .filter(m => !(course?.moderator_ids || []).includes(m.id) && !(course?.collaborator_ids || []).includes(m.id))
                      .map((marker) => (
                        <SelectItem key={marker.id} value={marker.id}>
                          {marker.full_name} ({marker.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCollaboratorDialog(false)}>Close</Button>
              <Button 
                onClick={handleAddCollaborator} 
                className="btn-primary"
                disabled={!selectedCollaborator}
                data-testid="add-collaborator-confirm-btn"
              >
                Add Collaborator
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transfer Leadership Dialog */}
        <Dialog open={showLeaderDialog} onOpenChange={setShowLeaderDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Transfer Module Leadership</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Warning:</strong> Transferring leadership will make the selected marker the new Module Leader of this course. You will remain as a collaborator unless they remove you.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Select New Module Leader</Label>
                <Select value={selectedNewLeader} onValueChange={setSelectedNewLeader}>
                  <SelectTrigger data-testid="new-leader-select">
                    <SelectValue placeholder="Choose a marker" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...(course?.collaborators || []), ...(course?.moderators || [])]
                      .filter((person, idx, arr) => arr.findIndex(p => p.id === person.id) === idx)
                      .map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({person.role || 'marker'})
                        </SelectItem>
                      ))}
                    {allMarkers
                      .filter(m => 
                        !(course?.collaborator_ids || []).includes(m.id) && 
                        !(course?.moderator_ids || []).includes(m.id)
                      )
                      .map((marker) => (
                        <SelectItem key={marker.id} value={marker.id}>
                          {marker.full_name} (external)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLeaderDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleTransferLeadership} 
                className="bg-amber-500 hover:bg-amber-600"
                disabled={!selectedNewLeader}
                data-testid="transfer-leader-confirm-btn"
              >
                <Crown className="w-4 h-4 mr-1" /> Transfer Leadership
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Assignment Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit'] text-destructive">Delete Assignment</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong className="text-foreground">{assignmentToDelete?.title}</strong>?
              </p>
              <p className="text-sm text-destructive mt-2">
                This will permanently delete the assignment and all related submissions and feedback.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleDeleteAssignment}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                data-testid="confirm-delete-btn"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
