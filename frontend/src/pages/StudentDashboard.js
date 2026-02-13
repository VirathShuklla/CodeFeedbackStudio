import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  FileText, Clock, Upload, CheckCircle2, AlertCircle, Ban, 
  Plus, X, BookOpen, Settings 
} from 'lucide-react';
import Editor from '@monaco-editor/react';

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
  
  // Submit dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [files, setFiles] = useState([{ id: '1', filename: 'main.py', content: '# Your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n' }]);
  const [activeFileId, setActiveFileId] = useState('1');
  
  // Course management dialog
  const [showCourseDialog, setShowCourseDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [api, selectedCourseId]);

  const fetchData = async () => {
    try {
      // Get enrolled courses
      const enrolledRes = await api().get('/students/courses');
      setCourses(enrolledRes.data);
      
      // Get all available courses for enrollment
      const allCoursesRes = await api().get('/public/courses');
      setAllCourses(allCoursesRes.data);
      
      // Set default selected course
      if (!selectedCourseId && enrolledRes.data.length > 0) {
        setSelectedCourseId(enrolledRes.data[0].id);
      }
      
      // Fetch assignments and submissions for selected course
      if (selectedCourseId) {
        const [assignmentsRes, submissionsRes] = await Promise.all([
          api().get(`/assignments?course_id=${selectedCourseId}`),
          api().get('/submissions')
        ]);
        setAssignments(assignmentsRes.data.filter(a => a.course_id === selectedCourseId));
        setSubmissions(submissionsRes.data);
      } else if (enrolledRes.data.length > 0) {
        const firstCourseId = enrolledRes.data[0].id;
        setSelectedCourseId(firstCourseId);
        const [assignmentsRes, submissionsRes] = await Promise.all([
          api().get(`/assignments?course_id=${firstCourseId}`),
          api().get('/submissions')
        ]);
        setAssignments(assignmentsRes.data.filter(a => a.course_id === firstCourseId));
        setSubmissions(submissionsRes.data);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    setLoading(true);
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      await api().post(`/students/enroll/${courseId}`);
      toast.success('Enrolled successfully!');
      await refreshUser();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enroll');
    }
  };

  const handleUnenrollCourse = async (courseId) => {
    try {
      await api().delete(`/students/enroll/${courseId}`);
      toast.success('Unenrolled from course');
      await refreshUser();
      if (selectedCourseId === courseId) {
        setSelectedCourseId(null);
      }
      fetchData();
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
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);
    if (activeFileId === fileId) {
      setActiveFileId(newFiles[0].id);
    }
  };

  const updateFileContent = (content) => {
    setFiles(files.map(f => f.id === activeFileId ? { ...f, content: content || '' } : f));
  };

  const updateFileName = (fileId, newName) => {
    if (!newName.endsWith('.py')) {
      newName += '.py';
    }
    setFiles(files.map(f => f.id === fileId ? { ...f, filename: newName } : f));
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
      setFiles(prev => [...prev, { id: newId, filename: file.name, content }]);
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
        files: files.map(f => ({ filename: f.filename, content: f.content }))
      });
      toast.success('Submitted successfully!');
      setShowSubmitDialog(false);
      setFiles([{ id: '1', filename: 'main.py', content: '# Your Python code here\n' }]);
      setSelectedAssignment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Submission failed');
    }
  };

  const getLatestSubmission = (assignmentId) => {
    return submissions.find(s => s.assignment_id === assignmentId && s.is_latest_attempt);
  };

  const getStatusDisplay = (submission) => {
    if (!submission) return null;
    
    switch (submission.status) {
      case 'pending':
      case 'in_review':
        return { label: 'Pending review', class: 'text-amber-600', icon: Clock };
      case 'feedback_released':
        return { label: 'Reviewed – feedback available', class: 'text-blue-600', icon: AlertCircle };
      case 'no_issues':
        return { label: 'Reviewed – no issues found', class: 'text-emerald-600', icon: CheckCircle2 };
      default:
        return { label: submission.status, class: 'text-muted-foreground', icon: Clock };
    }
  };

  const formatDeadline = (dueDate) => {
    if (!dueDate) return null;
    return new Date(dueDate).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const unenrolledCourses = allCourses.filter(c => !courses.some(ec => ec.id === c.id));

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
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="student-dashboard">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold font-['Outfit']">My Courses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {courses.length} course{courses.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowCourseDialog(true)}
            data-testid="manage-courses-btn"
          >
            <Settings className="w-4 h-4 mr-2" /> Manage Courses
          </Button>
        </div>

        {/* No courses enrolled */}
        {courses.length === 0 ? (
          <div className="card-clean p-12 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">You're not enrolled in any courses</p>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
              Click "Manage Courses" to enroll in available courses
            </p>
            <Button onClick={() => setShowCourseDialog(true)} className="btn-primary">
              Browse Courses
            </Button>
          </div>
        ) : (
          <>
            {/* Course Tabs */}
            <Tabs value={selectedCourseId} onValueChange={handleCourseChange} className="mb-6">
              <TabsList className="flex-wrap h-auto gap-1 p-1">
                {courses.map((course) => (
                  <TabsTrigger 
                    key={course.id} 
                    value={course.id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-white"
                    data-testid={`course-tab-${course.id}`}
                  >
                    {course.code || course.name.slice(0, 10)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Current Course Info */}
            {currentCourse && (
              <div className="mb-6">
                <h2 className="text-lg font-medium">
                  {currentCourse.code ? `${currentCourse.code} – ` : ''}{currentCourse.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {currentCourse.semester && currentCourse.year ? `${currentCourse.semester} ${currentCourse.year}` : ''}
                  {currentCourse.leader_name && ` · Led by ${currentCourse.leader_name}`}
                </p>
              </div>
            )}

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
                  const attemptCount = submissions.filter(s => s.assignment_id === assignment.id).length;
                  const maxAttempts = assignment.max_attempts;
                  const canSubmit = !isPastDeadline && (maxAttempts === -1 || attemptCount < maxAttempts);
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
                            {isPastDeadline ? 'Submissions closed' : `Due ${formatDeadline(assignment.due_date)}`}
                          </span>
                          {maxAttempts > 0 && (
                            <span className="ml-2">· {attemptCount}/{maxAttempts} attempts</span>
                          )}
                        </div>
                      )}
                      
                      {/* Status */}
                      {status && (
                        <div className="flex items-center gap-2 mb-4">
                          <status.icon className={`w-4 h-4 ${status.class}`} />
                          <span className={`text-sm ${status.class}`}>{status.label}</span>
                          {submission?.files?.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {submission.files.length} file{submission.files.length !== 1 ? 's' : ''}
                            </span>
                          )}
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
          </>
        )}

        {/* Submit Dialog - Multi-file */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Submit: {selectedAssignment?.title}</DialogTitle>
            </DialogHeader>
            
            {/* File tabs */}
            <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
              {files.map((file) => (
                <div 
                  key={file.id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-t text-sm cursor-pointer transition-colors ${
                    file.id === activeFileId ? 'bg-slate-100 font-medium' : 'hover:bg-slate-50'
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
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="p-0.5 hover:bg-slate-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addFile} className="h-7">
                <Plus className="w-3 h-3" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".py"
                multiple
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className="h-7 ml-auto"
              >
                <Upload className="w-3 h-3 mr-1" /> Upload
              </Button>
            </div>
            
            {/* Editor */}
            <div className="border rounded-lg overflow-hidden h-[400px]">
              <Editor
                height="400px"
                defaultLanguage="python"
                value={activeFile?.content || ''}
                onChange={updateFileContent}
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
            
            <div className="space-y-4 py-4">
              {/* Enrolled Courses */}
              {courses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Your Courses</h4>
                  <div className="space-y-2">
                    {courses.map((course) => (
                      <div 
                        key={course.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {course.code ? `${course.code} – ` : ''}{course.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.leader_name}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
              
              {/* Available Courses */}
              {unenrolledCourses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Available Courses</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {unenrolledCourses.map((course) => (
                      <div 
                        key={course.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {course.code ? `${course.code} – ` : ''}{course.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {course.leader_name} · {course.student_count} students
                          </p>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleEnrollCourse(course.id)}
                          data-testid={`enroll-btn-${course.id}`}
                        >
                          Enroll
                        </Button>
                      </div>
                    ))}
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
