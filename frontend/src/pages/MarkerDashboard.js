import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Plus, ChevronRight, BookOpen, Clock, Users, Crown, Shield, BarChart3 } from 'lucide-react';

export default function MarkerDashboard() {
  const { api, user, isModerator, isModuleLeader } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [allMarkers, setAllMarkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, reviewed: 0 });
  
  // Course creation
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', year: new Date().getFullYear(), semester: '' });
  
  // Collaborator management
  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedCollaborator, setSelectedCollaborator] = useState('');

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const [coursesRes, analyticsRes, markersRes] = await Promise.all([
        api().get('/courses'),
        api().get('/analytics/marker'),
        api().get('/public/users')
      ]);
      setCourses(coursesRes.data);
      setAllMarkers(markersRes.data.filter(m => m.id !== user.id)); // Exclude self
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

  const openCollabDialog = (course) => {
    setSelectedCourse(course);
    setSelectedCollaborator('');
    setShowCollabDialog(true);
  };

  const handleAddCollaborator = async () => {
    if (!selectedCollaborator) {
      toast.error('Please select a collaborator');
      return;
    }
    
    try {
      const newCollaborators = [...(selectedCourse.collaborator_ids || []), selectedCollaborator];
      await api().put(`/courses/${selectedCourse.id}`, {
        collaborator_ids: newCollaborators
      });
      toast.success('Collaborator added');
      setShowCollabDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (course, collabId) => {
    try {
      const newCollaborators = course.collaborator_ids.filter(id => id !== collabId);
      await api().put(`/courses/${course.id}`, {
        collaborator_ids: newCollaborators
      });
      toast.success('Collaborator removed');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to remove collaborator');
    }
  };

  const isLeader = (course) => course.leader_id === user.id;

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="marker-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-slide-down">
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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-clean p-5 animate-slide-up animate-stagger-1">
            <p className="text-sm text-muted-foreground">Pending Reviews</p>
            <p className="text-3xl font-semibold mt-1 font-['Outfit']">{stats.pending}</p>
          </div>
          <div className="card-clean p-5 animate-slide-up animate-stagger-2">
            <p className="text-sm text-muted-foreground">Feedback Given</p>
            <p className="text-3xl font-semibold mt-1 font-['Outfit']">{stats.reviewed}</p>
          </div>
          {isModerator && (
            <div 
              className="card-hover p-5 cursor-pointer"
              onClick={() => navigate('/marker/moderation')}
              data-testid="moderation-card"
            >
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Moderation
              </p>
              <p className="text-lg font-semibold mt-1 font-['Outfit'] text-primary">View Queue</p>
            </div>
          )}
          <div 
            className="card-hover p-5 cursor-pointer"
            onClick={() => navigate('/marker/analytics')}
            data-testid="analytics-card"
          >
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </p>
            <p className="text-lg font-semibold mt-1 font-['Outfit'] text-primary">View Stats</p>
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
            {courses.map((course) => {
              const leader = isLeader(course);
              const availableCollaborators = allMarkers.filter(
                m => !(course.collaborator_ids || []).includes(m.id)
              );
              
              return (
                <div
                  key={course.id}
                  className="card-clean p-5"
                  data-testid={`course-card-${course.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-4 flex-1 cursor-pointer"
                      onClick={() => navigate(`/marker/course/${course.id}`)}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {course.code ? `${course.code} – ` : ''}{course.name}
                          </h3>
                          {leader ? (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" /> Leader
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Collaborator</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {course.semester && course.year ? `${course.semester} ${course.year}` : course.year || 'No term'}
                          {' · '}{course.student_count} student{course.student_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Collaborators display */}
                      {(course.collaborators?.length > 0 || leader) && (
                        <div className="flex items-center gap-1 mr-2">
                          {course.collaborators?.slice(0, 3).map((collab) => (
                            <div 
                              key={collab.id}
                              className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium border-2 border-white -ml-2 first:ml-0"
                              title={collab.name}
                            >
                              {collab.name?.charAt(0)}
                            </div>
                          ))}
                          {leader && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCollabDialog(course);
                              }}
                              className="h-7 w-7 p-0"
                              data-testid={`add-collab-btn-${course.id}`}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      
                      <ChevronRight 
                        className="w-5 h-5 text-muted-foreground/50 cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/marker/course/${course.id}`)}
                      />
                    </div>
                  </div>
                  
                  {/* Collaborator tags */}
                  {leader && course.collaborators?.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                      {course.collaborators.map((collab) => (
                        <Badge 
                          key={collab.id} 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          onClick={() => handleRemoveCollaborator(course, collab.id)}
                        >
                          <Users className="w-3 h-3 mr-1" />
                          {collab.name}
                          <span className="ml-1 opacity-50">×</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Collaborator Dialog */}
        <Dialog open={showCollabDialog} onOpenChange={setShowCollabDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Add Collaborator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                Add a marker to collaborate on "{selectedCourse?.name}"
              </p>
              <div className="space-y-2">
                <Label className="text-sm">Select Marker</Label>
                <Select value={selectedCollaborator} onValueChange={setSelectedCollaborator}>
                  <SelectTrigger data-testid="collab-select">
                    <SelectValue placeholder="Choose a marker" />
                  </SelectTrigger>
                  <SelectContent>
                    {allMarkers
                      .filter(m => !(selectedCourse?.collaborator_ids || []).includes(m.id))
                      .map((marker) => (
                        <SelectItem key={marker.id} value={marker.id}>
                          {marker.full_name} ({marker.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {allMarkers.filter(m => !(selectedCourse?.collaborator_ids || []).includes(m.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No available markers to add.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCollabDialog(false)}>Cancel</Button>
              <Button 
                onClick={handleAddCollaborator} 
                className="btn-primary"
                disabled={!selectedCollaborator}
                data-testid="add-collab-confirm-btn"
              >
                Add Collaborator
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
