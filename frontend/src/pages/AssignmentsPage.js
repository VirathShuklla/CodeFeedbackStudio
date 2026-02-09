import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Upload,
  Code,
  ArrowRight,
  Search,
  Calendar,
  AlertTriangle,
  Ban,
  BookOpen,
  Users,
  GraduationCap
} from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function AssignmentsPage() {
  const { api, isMarker, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  
  // Course dialog
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', code: '', description: '', year: new Date().getFullYear(), semester: '' });
  
  // Assignment dialog
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ 
    course_id: '', 
    title: '', 
    description: '', 
    due_date: '',
    max_attempts: 3 
  });
  
  // Submit dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [codeContent, setCodeContent] = useState('# Your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n');
  const [submitMethod, setSubmitMethod] = useState('editor');

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const [coursesRes, assignmentsRes, submissionsRes] = await Promise.all([
        api().get('/courses'),
        api().get('/assignments'),
        api().get('/submissions')
      ]);
      setCourses(coursesRes.data);
      setAssignments(assignmentsRes.data);
      setSubmissions(submissionsRes.data);
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
      toast.success('Course created successfully');
      setShowCourseDialog(false);
      setNewCourse({ name: '', code: '', description: '', year: new Date().getFullYear(), semester: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create course');
    }
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.course_id) {
      toast.error('Please select a course');
      return;
    }
    if (!newAssignment.title.trim()) {
      toast.error('Assignment title is required');
      return;
    }
    try {
      // Format the due_date as ISO string if provided
      const payload = { ...newAssignment };
      if (payload.due_date) {
        // Ensure it's in ISO format with timezone
        const date = new Date(payload.due_date);
        payload.due_date = date.toISOString();
      }
      
      await api().post('/assignments', payload);
      toast.success('Assignment created successfully');
      setShowAssignmentDialog(false);
      setNewAssignment({ course_id: '', title: '', description: '', due_date: '', max_attempts: 3 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create assignment');
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !codeContent.trim()) {
      toast.error('Please provide code content');
      return;
    }
    
    // Check deadline on frontend (backend will also enforce)
    if (selectedAssignment.is_past_deadline) {
      toast.error('Submission deadline has passed');
      return;
    }
    
    try {
      await api().post('/submissions', {
        assignment_id: selectedAssignment.id,
        code_content: codeContent,
        filename: 'main.py'
      });
      toast.success('Submission successful!');
      setShowSubmitDialog(false);
      setCodeContent('# Your Python code here\n');
      setSelectedAssignment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.py')) {
        toast.error('Only .py files are allowed');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setCodeContent(e.target?.result);
      };
      reader.readAsText(file);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="badge-pending">Pending</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="badge-review">In Review</Badge>;
      case 'feedback_released':
        return <Badge variant="secondary" className="badge-fixed">Feedback Ready</Badge>;
      case 'no_issues':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">No Issues</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubmissionsForAssignment = (assignmentId) => {
    return submissions.filter(s => s.assignment_id === assignmentId);
  };

  const getAssignmentsForCourse = (courseId) => {
    return assignments.filter(a => a.course_id === courseId);
  };

  // Filter assignments by course and search
  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = selectedCourseFilter === 'all' || a.course_id === selectedCourseFilter;
    return matchesSearch && matchesCourse;
  });

  const formatDeadline = (dueDate) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 md:p-12" data-testid="assignments-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-['Manrope'] text-foreground">Assignments</h1>
            <p className="text-muted-foreground mt-1">
              {isMarker ? 'Manage courses and review submissions' : 'View and submit your assignments'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="search-input"
              />
            </div>
            
            {isMarker && (
              <>
                <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-full gap-2" data-testid="create-course-btn">
                      <Plus className="w-4 h-4" /> Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Course</DialogTitle>
                      <DialogDescription>Add a new course to organize assignments</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Course Code</Label>
                          <Input
                            value={newCourse.code}
                            onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                            placeholder="e.g., CS101"
                            data-testid="course-code-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Year</Label>
                          <Input
                            type="number"
                            value={newCourse.year}
                            onChange={(e) => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })}
                            data-testid="course-year-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Course Name *</Label>
                        <Input
                          value={newCourse.name}
                          onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                          placeholder="e.g., Introduction to Python"
                          data-testid="course-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Semester</Label>
                        <Input
                          value={newCourse.semester}
                          onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                          placeholder="e.g., Fall 2024"
                          data-testid="course-semester-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newCourse.description}
                          onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                          placeholder="Course description..."
                          data-testid="course-description-input"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCourseDialog(false)}>Cancel</Button>
                      <Button onClick={handleCreateCourse} data-testid="save-course-btn">Create Course</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
                  <DialogTrigger asChild>
                    <Button className="rounded-full gap-2" data-testid="create-assignment-btn" disabled={courses.length === 0}>
                      <Plus className="w-4 h-4" /> Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>Add a new assignment with optional deadline</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Course *</Label>
                        <Select 
                          value={newAssignment.course_id} 
                          onValueChange={(v) => setNewAssignment({ ...newAssignment, course_id: v })}
                        >
                          <SelectTrigger data-testid="assignment-course-select">
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                {course.code ? `${course.code} - ` : ''}{course.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                          placeholder="e.g., Python Basics - Week 1"
                          data-testid="assignment-title-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newAssignment.description}
                          onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                          placeholder="Assignment instructions..."
                          data-testid="assignment-description-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Submission Deadline</Label>
                          <Input
                            type="datetime-local"
                            value={newAssignment.due_date}
                            onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                            data-testid="due-date-input"
                          />
                          <p className="text-xs text-muted-foreground">Leave empty for no deadline</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Max Attempts</Label>
                          <Input
                            type="number"
                            value={newAssignment.max_attempts}
                            onChange={(e) => setNewAssignment({ ...newAssignment, max_attempts: parseInt(e.target.value) })}
                            min={1}
                            max={10}
                            data-testid="max-attempts-input"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Cancel</Button>
                      <Button onClick={handleCreateAssignment} data-testid="save-assignment-btn">Create Assignment</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Marker: Show Courses Section First */}
        {isMarker && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold font-['Manrope'] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Your Courses ({courses.length})
              </h2>
            </div>
            
            {courses.length === 0 ? (
              <Card className="card-default">
                <CardContent className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No courses yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first course to start adding assignments</p>
                  <Button 
                    className="mt-4 rounded-full"
                    onClick={() => setShowCourseDialog(true)}
                    data-testid="empty-create-course-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Create Course
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {courses.map((course) => {
                  const courseAssignments = getAssignmentsForCourse(course.id);
                  const pendingSubmissions = submissions.filter(s => 
                    courseAssignments.some(a => a.id === s.assignment_id) && s.status === 'pending'
                  ).length;
                  
                  return (
                    <Card 
                      key={course.id} 
                      className={`card-interactive cursor-pointer ${selectedCourseFilter === course.id ? 'ring-2 ring-primary' : ''}`}
                      onClick={() => setSelectedCourseFilter(selectedCourseFilter === course.id ? 'all' : course.id)}
                      data-testid={`course-card-${course.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-primary" />
                          </div>
                          {pendingSubmissions > 0 && (
                            <Badge variant="secondary" className="badge-review">
                              {pendingSubmissions} pending
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground line-clamp-1">
                          {course.code ? `${course.code} - ` : ''}{course.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {course.year && course.semester ? `${course.semester} ${course.year}` : course.year || course.semester || 'No term set'}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {courseAssignments.length} assignments
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {course.student_count} students
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Course Filter for Marker */}
        {isMarker && courses.length > 0 && (
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold font-['Manrope']">Assignments</h2>
            {selectedCourseFilter !== 'all' && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary/20"
                onClick={() => setSelectedCourseFilter('all')}
              >
                Filtered by course ✕
              </Badge>
            )}
          </div>
        )}

        {/* Assignments Grid */}
        {filteredAssignments.length === 0 ? (
          <Card className="card-default">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {selectedCourseFilter !== 'all' ? 'No assignments in this course' : 'No assignments yet'}
              </p>
              <p className="text-muted-foreground mt-1">
                {isMarker 
                  ? (courses.length === 0 
                      ? 'Create a course first, then add assignments' 
                      : 'Create your first assignment to get started')
                  : 'Check back later for new assignments'}
              </p>
              {isMarker && courses.length > 0 && (
                <Button 
                  className="mt-4 rounded-full"
                  onClick={() => setShowAssignmentDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Assignment
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const assignmentSubmissions = getSubmissionsForAssignment(assignment.id);
              const latestSubmission = assignmentSubmissions[0];
              const isPastDeadline = assignment.is_past_deadline;
              
              return (
                <Card 
                  key={assignment.id} 
                  className={`card-interactive ${isPastDeadline ? 'opacity-75' : ''}`}
                  data-testid={`assignment-card-${assignment.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        {isPastDeadline && (
                          <Badge variant="secondary" className="bg-red-100 text-red-700">
                            <Ban className="w-3 h-3 mr-1" /> Closed
                          </Badge>
                        )}
                        {latestSubmission && getStatusBadge(latestSubmission.status)}
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold mt-3">{assignment.title}</CardTitle>
                    {isMarker && (
                      <p className="text-xs text-primary font-medium">{assignment.course_name}</p>
                    )}
                    <CardDescription className="line-clamp-2">
                      {assignment.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{assignmentSubmissions.length} submission{assignmentSubmissions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Max {assignment.max_attempts} attempts</span>
                      </div>
                      {assignment.due_date && (
                        <div className={`flex items-center gap-1 ${isPastDeadline ? 'text-red-600' : ''}`}>
                          <Calendar className="w-4 h-4" />
                          <span>Due: {formatDeadline(assignment.due_date)}</span>
                        </div>
                      )}
                    </div>
                    
                    {isMarker ? (
                      <Button 
                        variant="outline" 
                        className="w-full rounded-full"
                        onClick={() => {
                          if (assignmentSubmissions.length > 0) {
                            navigate(`/marker/review/${assignmentSubmissions[0].id}`);
                          }
                        }}
                        disabled={assignmentSubmissions.length === 0}
                        data-testid={`review-btn-${assignment.id}`}
                      >
                        Review Submissions
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        {(latestSubmission?.status === 'feedback_released' || latestSubmission?.status === 'no_issues') && (
                          <Button 
                            variant="outline" 
                            className="w-full rounded-full"
                            onClick={() => navigate(`/student/feedback/${latestSubmission.id}`)}
                            data-testid={`view-feedback-btn-${assignment.id}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            View Feedback
                          </Button>
                        )}
                        
                        {/* Submit button with deadline check */}
                        {isPastDeadline ? (
                          <Button 
                            className="w-full rounded-full"
                            disabled
                            data-testid={`submit-btn-${assignment.id}`}
                          >
                            <Ban className="w-4 h-4 mr-2" />
                            Submissions Closed
                          </Button>
                        ) : (
                          <Button 
                            className="w-full rounded-full"
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowSubmitDialog(true);
                            }}
                            disabled={assignmentSubmissions.length >= assignment.max_attempts}
                            data-testid={`submit-btn-${assignment.id}`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {assignmentSubmissions.length > 0 ? 'Resubmit' : 'Submit'}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submit Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Submit Assignment: {selectedAssignment?.title}</DialogTitle>
              <DialogDescription>
                Write or upload your Python code
                {selectedAssignment?.due_date && (
                  <span className="block mt-1 text-amber-600">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Due: {formatDeadline(selectedAssignment.due_date)}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {selectedAssignment?.is_past_deadline ? (
              <div className="py-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Deadline Passed</p>
                <p className="text-muted-foreground mt-1">
                  Submissions are no longer accepted for this assignment.
                </p>
              </div>
            ) : (
              <>
                <Tabs value={submitMethod} onValueChange={setSubmitMethod} className="mt-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor" className="gap-2" data-testid="editor-tab">
                      <Code className="w-4 h-4" /> Code Editor
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="gap-2" data-testid="upload-tab">
                      <Upload className="w-4 h-4" /> Upload File
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="editor" className="mt-4">
                    <div className="border rounded-lg overflow-hidden h-[400px]">
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
                        }}
                        data-testid="code-editor"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="upload" className="mt-4">
                    <div className="border-2 border-dashed rounded-xl p-12 text-center">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Drop your .py file here or click to browse
                      </p>
                      <Input
                        type="file"
                        accept=".py"
                        onChange={handleFileUpload}
                        className="max-w-xs mx-auto"
                        data-testid="file-upload-input"
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} data-testid="submit-code-btn">
                    Submit Code
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
