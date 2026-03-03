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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, FileText, Clock, ChevronRight, Users, Crown, Upload, Shield, Calendar } from 'lucide-react';

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
    max_attempts: -1,
    total_marks: 100,
    marks_release_date: ''
  });
  
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
    try {
      const payload = { 
        ...newAssignment, 
        course_id: courseId,
        due_date: newAssignment.due_date ? new Date(newAssignment.due_date).toISOString() : null,
        marks_release_date: newAssignment.marks_release_date ? new Date(newAssignment.marks_release_date).toISOString() : null
      };
      await api().post('/assignments', payload);
      toast.success('Assignment created');
      setShowAssignmentDialog(false);
      setNewAssignment({ title: '', description: '', due_date: '', max_attempts: -1, total_marks: 100, marks_release_date: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
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
      // Refresh data - user may no longer have access
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
              
              {/* Team Management - Leader only */}
              {isLeader && (
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {/* Collaborators */}
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
                  
                  {/* Moderators */}
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
                  
                  {/* Transfer Leadership */}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Total Marks</Label>
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
                    <div className="space-y-2">
                      <Label className="text-sm">Release Marks At</Label>
                      <Input
                        type="datetime-local"
                        value={newAssignment.marks_release_date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, marks_release_date: e.target.value })}
                        className="input-clean"
                        data-testid="release-date-input"
                      />
                      <p className="text-xs text-muted-foreground">Optional scheduled release</p>
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
                      <div className="flex-1">
                        <h3 className="font-medium">{assignment.title}</h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDeadline(assignment.due_date)}
                          </span>
                          <span>{assignmentSubs.length} submission{assignmentSubs.length !== 1 ? 's' : ''}</span>
                          <span>·</span>
                          <span>{assignment.total_marks || 100} marks</span>
                        </div>
                        
                        {/* Marking scheme info */}
                        <div className="flex items-center gap-3 mt-2">
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
                          
                          {assignment.marks_release_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Marks release: {formatDeadline(assignment.marks_release_date)}
                            </span>
                          )}
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

        {/* Add Moderator Dialog */}
        <Dialog open={showModeratorDialog} onOpenChange={setShowModeratorDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Manage Moderators</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Current moderators */}
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
              
              {/* Add new moderator */}
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
              {/* Current collaborators */}
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
              
              {/* Add new collaborator */}
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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
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
                    {/* Show collaborators and moderators as potential leaders */}
                    {[...(course?.collaborators || []), ...(course?.moderators || [])]
                      .filter((person, idx, arr) => arr.findIndex(p => p.id === person.id) === idx) // Remove duplicates
                      .map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name} ({person.role || 'marker'})
                        </SelectItem>
                      ))}
                    {/* Also show other markers not in the course */}
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
      </div>
    </AppLayout>
  );
}
