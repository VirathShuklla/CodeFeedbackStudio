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
  Calendar
} from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function AssignmentsPage() {
  const { api, isMarker } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Course dialog
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: '', description: '' });
  
  // Assignment dialog
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ 
    course_id: '', 
    title: '', 
    description: '', 
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
    try {
      await api().post('/courses', newCourse);
      toast.success('Course created successfully');
      setShowCourseDialog(false);
      setNewCourse({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create course');
    }
  };

  const handleCreateAssignment = async () => {
    try {
      await api().post('/assignments', newAssignment);
      toast.success('Assignment created successfully');
      setShowAssignmentDialog(false);
      setNewAssignment({ course_id: '', title: '', description: '', max_attempts: 3 });
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
    
    try {
      const response = await api().post('/submissions', {
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
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubmissionsForAssignment = (assignmentId) => {
    return submissions.filter(s => s.assignment_id === assignmentId);
  };

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                      <div className="space-y-2">
                        <Label>Course Name</Label>
                        <Input
                          value={newCourse.name}
                          onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                          placeholder="e.g., Introduction to Python"
                          data-testid="course-name-input"
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
                    <Button className="rounded-full gap-2" data-testid="create-assignment-btn">
                      <Plus className="w-4 h-4" /> Assignment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Assignment</DialogTitle>
                      <DialogDescription>Add a new assignment for students</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Course</Label>
                        <Select 
                          value={newAssignment.course_id} 
                          onValueChange={(v) => setNewAssignment({ ...newAssignment, course_id: v })}
                        >
                          <SelectTrigger data-testid="course-select">
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
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

        {/* Assignments Grid */}
        {filteredAssignments.length === 0 ? (
          <Card className="card-default">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No assignments yet</p>
              <p className="text-muted-foreground mt-1">
                {isMarker ? 'Create your first assignment to get started' : 'Check back later for new assignments'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssignments.map((assignment) => {
              const assignmentSubmissions = getSubmissionsForAssignment(assignment.id);
              const latestSubmission = assignmentSubmissions[0];
              
              return (
                <Card 
                  key={assignment.id} 
                  className="card-interactive"
                  data-testid={`assignment-card-${assignment.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      {latestSubmission && getStatusBadge(latestSubmission.status)}
                    </div>
                    <CardTitle className="text-lg font-semibold mt-3">{assignment.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {assignment.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        <span>{assignmentSubmissions.length} submission{assignmentSubmissions.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Max {assignment.max_attempts} attempts</span>
                      </div>
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
                        {latestSubmission?.status === 'feedback_released' && (
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
              </DialogDescription>
            </DialogHeader>
            
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
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
