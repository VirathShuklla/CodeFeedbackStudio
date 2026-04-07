import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Send, 
  Plus, 
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  CheckCircle2,
  ThumbsUp,
  FileCode,
  Award,
  BookOpen,
  Copy,
  Save,
  BookmarkPlus,
  Search,
  CloudOff,
  Cloud,
} from 'lucide-react';
import Editor from '@monaco-editor/react';

const DRAFT_SAVE_INTERVAL = 15000; // 15 seconds

export default function CodeReviewPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const editorRef = useRef(null);
  const draftTimerRef = useRef(null);
  
  const [submission, setSubmission] = useState(null);
  const [issues, setIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFileId, setActiveFileId] = useState(null);
  const [selectedLines, setSelectedLines] = useState({ start: 1, end: 1 });
  const [decorations, setDecorations] = useState([]);
  const [assignment, setAssignment] = useState(null);
  
  // Issue creation
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [newIssue, setNewIssue] = useState({
    category_id: '',
    title: '',
    explanation: '',
    severity: 'moderate',
    suggested_fix: '',
    marks_deduction: 0
  });
  
  // Templates
  const [templates, setTemplates] = useState([]);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [saveTemplateData, setSaveTemplateData] = useState({ title: '', scope: 'module' });
  
  // No issues / grading dialogs
  const [showNoIssuesDialog, setShowNoIssuesDialog] = useState(false);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [gradeData, setGradeData] = useState({ marks: 0, feedback: '' });
  
  // Auto-draft state
  const [draftStatus, setDraftStatus] = useState('saved'); // 'saved' | 'unsaved' | 'saving'
  const [highlightedIssueId, setHighlightedIssueId] = useState(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [subRes, issuesRes, categoriesRes] = await Promise.all([
        api().get(`/submissions/${submissionId}`),
        api().get(`/issues?submission_id=${submissionId}`),
        api().get('/categories'),
      ]);
      setSubmission(subRes.data);
      setIssues(issuesRes.data);
      setCategories(categoriesRes.data);
      
      if (subRes.data.assignment_id) {
        const assignmentRes = await api().get(`/assignments/${subRes.data.assignment_id}`);
        setAssignment(assignmentRes.data);
        const totalDeductions = issuesRes.data.reduce((sum, i) => sum + (i.marks_deduction || 0), 0);
        setGradeData(prev => ({ 
          ...prev, 
          marks: Math.max(0, (assignmentRes.data.total_marks || 100) - totalDeductions) 
        }));
        
        // Fetch module-specific templates
        const courseId = assignmentRes.data.course_id;
        if (courseId) {
          const templatesRes = await api().get(`/issue-templates?course_id=${courseId}`);
          setTemplates(templatesRes.data);
        }
      }
      
      if (subRes.data.files?.length > 0 && !activeFileId) {
        setActiveFileId(subRes.data.files[0].id);
      }
      
      // Restore draft
      try {
        const draftRes = await api().get(`/drafts/${submissionId}`);
        if (draftRes.data?.form_state?.newIssue) {
          setNewIssue(prev => ({ ...prev, ...draftRes.data.form_state.newIssue }));
        }
        if (draftRes.data?.form_state?.gradeData) {
          setGradeData(prev => ({ ...prev, ...draftRes.data.form_state.gradeData }));
        }
      } catch {}
    } catch {
      toast.error('Failed to load submission');
      navigate('/marker');
    } finally {
      setLoading(false);
    }
  }, [api, submissionId, navigate, activeFileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-draft saving
  useEffect(() => {
    draftTimerRef.current = setInterval(async () => {
      if (draftStatus === 'unsaved') {
        setDraftStatus('saving');
        try {
          await api().post('/drafts/save', {
            submission_id: submissionId,
            form_state: { newIssue, gradeData }
          });
          setDraftStatus('saved');
        } catch {
          setDraftStatus('unsaved');
        }
      }
    }, DRAFT_SAVE_INTERVAL);
    return () => clearInterval(draftTimerRef.current);
  }, [api, submissionId, newIssue, gradeData, draftStatus]);

  // Mark draft as unsaved when form changes
  useEffect(() => {
    setDraftStatus('unsaved');
  }, [newIssue, gradeData]);

  // Update code decorations when issues or file changes
  useEffect(() => {
    if (editorRef.current && activeFileId) {
      const fileIssues = issues.filter(i => i.file_id === activeFileId);
      const newDecorations = fileIssues.map(issue => ({
        range: {
          startLineNumber: issue.line_start,
          startColumn: 1,
          endLineNumber: issue.line_end,
          endColumn: 1
        },
        options: {
          isWholeLine: true,
          className: `code-highlight-${issue.severity === 'critical' ? 'error' : issue.severity === 'moderate' ? 'warning' : 'info'} ${highlightedIssueId === issue.id ? 'code-highlight-active' : ''}`,
          glyphMarginClassName: `issue-gutter-marker issue-gutter-${issue.severity}`,
        }
      }));
      const editor = editorRef.current;
      setDecorations(prev => editor.deltaDecorations(prev, newDecorations));
    }
  }, [issues, activeFileId, highlightedIssueId]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      setSelectedLines({
        start: Math.min(selection.startLineNumber, selection.endLineNumber),
        end: Math.max(selection.startLineNumber, selection.endLineNumber)
      });
    });
  };

  const handleCreateIssue = async () => {
    if (!newIssue.category_id || !newIssue.title || !newIssue.explanation) {
      toast.error('Please fill required fields');
      return;
    }
    if (!activeFileId) {
      toast.error('No file selected');
      return;
    }
    try {
      await api().post('/issues', {
        submission_id: submissionId,
        file_id: activeFileId,
        ...newIssue,
        line_start: selectedLines.start,
        line_end: selectedLines.end,
        marks_deduction: newIssue.marks_deduction || 0
      });
      toast.success('Issue added');
      setShowIssueDialog(false);
      setNewIssue({ category_id: '', title: '', explanation: '', severity: 'moderate', suggested_fix: '', marks_deduction: 0 });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add issue');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      await api().delete(`/issues/${issueId}`);
      toast.success('Issue removed');
      fetchData();
    } catch {
      toast.error('Failed to remove issue');
    }
  };

  const handlePublishFeedback = async () => {
    try {
      await api().post(`/submissions/${submissionId}/publish`);
      toast.success('Feedback published');
      navigate('/marker');
    } catch {
      toast.error('Failed to publish');
    }
  };

  const handleGradeSubmission = async () => {
    if (gradeData.marks < 0 || gradeData.marks > (assignment?.total_marks || 100)) {
      toast.error(`Marks must be between 0 and ${assignment?.total_marks || 100}`);
      return;
    }
    try {
      await api().post(`/submissions/${submissionId}/grade`, {
        marks: gradeData.marks,
        feedback: gradeData.feedback
      });
      toast.success('Submission graded successfully');
      setShowGradeDialog(false);
      navigate('/marker');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to grade');
    }
  };

  const handleApplyTemplate = (template) => {
    setNewIssue({
      category_id: template.category_id,
      title: template.title,
      explanation: template.explanation,
      severity: template.severity,
      suggested_fix: template.suggested_fix || '',
      marks_deduction: template.marks_deduction || 0
    });
    setShowTemplatePanel(false);
    setShowIssueDialog(true);
    
    // Increment usage count silently
    if (template.id) {
      api().post(`/issue-templates/${template.id}/use`).catch(() => {});
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!saveTemplateData.title.trim()) {
      toast.error('Template title required');
      return;
    }
    try {
      const payload = {
        title: saveTemplateData.title.trim(),
        explanation: newIssue.explanation,
        category_id: newIssue.category_id,
        severity: newIssue.severity,
        suggested_fix: newIssue.suggested_fix,
        marks_deduction: newIssue.marks_deduction,
        course_id: saveTemplateData.scope === 'module' ? assignment?.course_id : null
      };
      const res = await api().post('/issue-templates', payload);
      setTemplates(prev => [...prev, res.data]);
      toast.success('Template saved!');
      setShowSaveTemplateDialog(false);
      setSaveTemplateData({ title: '', scope: 'module' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId, e) => {
    e.stopPropagation();
    try {
      await api().delete(`/issue-templates/${templateId}`);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleMarkNoIssues = async () => {
    try {
      await api().post(`/submissions/${submissionId}/mark-no-issues`, {
        submission_id: submissionId,
        marker_comment: 'No issues found. Code is correct.'
      });
      toast.success('Marked as correct');
      navigate('/marker');
    } catch {
      toast.error('Failed to mark');
    }
  };

  const scrollToIssue = (issue) => {
    if (issue.file_id !== activeFileId) {
      setActiveFileId(issue.file_id);
    }
    setHighlightedIssueId(issue.id);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(issue.line_start);
        editorRef.current.setSelection({
          startLineNumber: issue.line_start,
          startColumn: 1,
          endLineNumber: issue.line_end,
          endColumn: 1
        });
      }
    }, 100);
    // Clear highlight after 2s
    setTimeout(() => setHighlightedIssueId(null), 2000);
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'moderate': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getIssuesForFile = (fileId) => issues.filter(i => i.file_id === fileId);
  const activeFile = submission?.files?.find(f => f.id === activeFileId);
  const isCompleted = submission?.status === 'feedback_released' || submission?.status === 'no_issues';

  // Filter templates by search
  const filteredTemplates = templates.filter(t => 
    !templateSearch || 
    t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.explanation?.toLowerCase().includes(templateSearch.toLowerCase()) ||
    t.category_name?.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Separate module vs global templates
  const moduleTemplates = filteredTemplates.filter(t => t.course_id === assignment?.course_id);
  const globalTemplates = filteredTemplates.filter(t => !t.course_id);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading submission...
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900" data-testid="code-review-page">
      {/* Header */}
      <header className="header-clean h-14 flex items-center px-4 gap-4 animate-slide-down">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">{submission?.student_name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {submission?.files?.length || 0} file{(submission?.files?.length || 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Attempt {submission?.attempt_number}</span>
        </div>
        
        {/* Draft status indicator */}
        {!isCompleted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
            {draftStatus === 'saved' && <><Cloud className="w-3 h-3 text-emerald-500" /><span>Saved</span></>}
            {draftStatus === 'saving' && <><Cloud className="w-3 h-3 text-amber-500 animate-pulse" /><span>Saving...</span></>}
            {draftStatus === 'unsaved' && <><CloudOff className="w-3 h-3 text-slate-400" /><span>Unsaved</span></>}
          </div>
        )}
        
        {!isCompleted && (
          <div className="ml-auto flex items-center gap-2">
            <AlertDialog open={showNoIssuesDialog} onOpenChange={setShowNoIssuesDialog}>
              <Button variant="outline" size="sm" onClick={() => setShowNoIssuesDialog(true)} disabled={issues.length > 0} data-testid="no-issues-btn">
                <ThumbsUp className="w-4 h-4 mr-1.5" /> No Issues
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark as Correct</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the submission as having no issues and award full marks ({assignment?.total_marks || 100}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkNoIssues} data-testid="confirm-no-issues-btn">Confirm</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline" size="sm" onClick={() => setShowGradeDialog(true)} disabled={issues.length === 0} data-testid="grade-btn">
              <Award className="w-4 h-4 mr-1.5" /> Grade
            </Button>
            
            <Button size="sm" onClick={handlePublishFeedback} disabled={issues.length === 0} className="btn-primary" data-testid="publish-btn">
              <Send className="w-4 h-4 mr-1.5" /> Publish
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Sidebar */}
        <div className="w-48 border-r bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-3 border-b text-sm font-medium">Files</div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {submission?.files?.map((file) => {
                const fileIssueCount = getIssuesForFile(file.id).length;
                return (
                  <div
                    key={file.id}
                    className={`p-2 rounded-md cursor-pointer flex items-center justify-between text-sm transition-all duration-150 ${
                      file.id === activeFileId 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => setActiveFileId(file.id)}
                    data-testid={`file-tab-${file.id}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    {fileIssueCount > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 px-1.5 animate-scale-in">
                        {fileIssueCount}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={activeFile?.content || ''}
              onMount={handleEditorDidMount}
              theme="vs-light"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                glyphMargin: true,
                padding: { top: 12 }
              }}
            />
          </div>
          
          {!isCompleted && (
            <div className="p-3 border-t bg-white dark:bg-slate-900 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium">{activeFile?.filename}</span>
                {' · '}Line{selectedLines.start !== selectedLines.end ? 's' : ''} {selectedLines.start}{selectedLines.start !== selectedLines.end ? `–${selectedLines.end}` : ''}
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowTemplatePanel(true); setTemplateSearch(''); }} data-testid="use-template-btn">
                  <BookOpen className="w-4 h-4 mr-1" /> Templates
                </Button>
                <Button size="sm" onClick={() => setShowIssueDialog(true)} data-testid="add-issue-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Issue
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Issues Panel */}
        <div className="w-80 border-l bg-white dark:bg-slate-900 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-medium">Issues ({issues.length})</h3>
            {issues.length > 0 && (
              <span className="text-xs text-muted-foreground">
                -{issues.reduce((sum, i) => sum + (i.marks_deduction || 0), 0)} marks
              </span>
            )}
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {submission?.status === 'no_issues' ? (
                <div className="py-8 text-center animate-fade-in">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-emerald-700">No Issues</p>
                  <p className="text-sm text-muted-foreground mt-1">Code marked as correct</p>
                </div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground animate-fade-in">
                  <p className="text-sm">No issues yet</p>
                  <p className="text-xs mt-1">Select code and click "Add Issue"</p>
                </div>
              ) : (
                issues.map((issue, idx) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border cursor-pointer group transition-all duration-200 animate-slide-up ${
                      highlightedIssueId === issue.id 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'hover:border-primary/30 hover:shadow-sm'
                    } ${issue.file_id === activeFileId ? '' : 'opacity-60'}`}
                    onClick={() => scrollToIssue(issue)}
                    data-testid={`issue-item-${issue.id}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        {getSeverityIcon(issue.severity)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium line-clamp-1">{issue.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {issue.filename} · L{issue.line_start}{issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''}
                            {issue.marks_deduction > 0 && (
                              <span className="ml-1.5 text-red-500">-{issue.marks_deduction}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {!isCompleted && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost" size="sm"
                            className="h-6 w-6 p-0"
                            title="Reuse as template"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewIssue({
                                category_id: issue.category_id,
                                title: issue.title,
                                explanation: issue.explanation,
                                severity: issue.severity,
                                suggested_fix: issue.suggested_fix || '',
                                marks_deduction: issue.marks_deduction || 0
                              });
                              setShowIssueDialog(true);
                            }}
                          >
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => { e.stopPropagation(); handleDeleteIssue(issue.id); }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{issue.explanation}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Add Issue Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Add Issue</DialogTitle>
            <DialogDescription>
              {activeFile?.filename} · Lines {selectedLines.start}–{selectedLines.end}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Category *</Label>
                <Select value={newIssue.category_id} onValueChange={(v) => setNewIssue({ ...newIssue, category_id: v })}>
                  <SelectTrigger data-testid="issue-category-select">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Severity</Label>
                <Select value={newIssue.severity} onValueChange={(v) => setNewIssue({ ...newIssue, severity: v })}>
                  <SelectTrigger data-testid="issue-severity-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Title *</Label>
              <Input value={newIssue.title} onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })} placeholder="Brief description" data-testid="issue-title-input" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Explanation *</Label>
              <Textarea value={newIssue.explanation} onChange={(e) => setNewIssue({ ...newIssue, explanation: e.target.value })} placeholder="Why is this an issue?" className="min-h-[80px]" data-testid="issue-explanation-input" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Suggested Fix</Label>
              <Textarea value={newIssue.suggested_fix} onChange={(e) => setNewIssue({ ...newIssue, suggested_fix: e.target.value })} placeholder="How to fix this" className="min-h-[60px]" data-testid="issue-fix-input" />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Marks Deduction</Label>
              <Input type="number" value={newIssue.marks_deduction || 0} onChange={(e) => setNewIssue({ ...newIssue, marks_deduction: parseInt(e.target.value) || 0 })} min={0} max={100} className="w-24" data-testid="marks-deduction-input" />
            </div>
          </div>
          
          <DialogFooter className="flex !justify-between items-center">
            <Button
              variant="ghost" size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (newIssue.title && newIssue.category_id) {
                  setSaveTemplateData({ title: newIssue.title, scope: 'module' });
                  setShowSaveTemplateDialog(true);
                } else {
                  toast.error('Fill title and category first to save as template');
                }
              }}
              data-testid="save-as-template-btn"
            >
              <BookmarkPlus className="w-4 h-4 mr-1" /> Save as Template
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateIssue} className="btn-primary" data-testid="save-issue-btn">Add Issue</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-primary" /> Save as Template
            </DialogTitle>
            <DialogDescription>This template will be available for future reviews</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Template Name</Label>
              <Input value={saveTemplateData.title} onChange={e => setSaveTemplateData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. Missing null check" data-testid="template-name-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Scope</Label>
              <Select value={saveTemplateData.scope} onValueChange={v => setSaveTemplateData(prev => ({ ...prev, scope: v }))}>
                <SelectTrigger data-testid="template-scope-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="module">This module only</SelectItem>
                  <SelectItem value="global">All modules</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs text-muted-foreground">
              <p>Category: {categories.find(c => c.id === newIssue.category_id)?.name || 'N/A'}</p>
              <p>Severity: {newIssue.severity}</p>
              <p>Deduction: -{newIssue.marks_deduction} marks</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAsTemplate} data-testid="confirm-save-template-btn">
              <Save className="w-4 h-4 mr-1" /> Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Picker Panel */}
      <Dialog open={showTemplatePanel} onOpenChange={setShowTemplatePanel}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-['Outfit'] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Feedback Templates
            </DialogTitle>
            <DialogDescription>Select a template to auto-fill the issue form. Templates are module-specific.</DialogDescription>
          </DialogHeader>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={templateSearch}
              onChange={e => setTemplateSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9"
              data-testid="template-search-input"
            />
          </div>
          
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-4">
              {/* Module templates */}
              {moduleTemplates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Module Templates</p>
                  <div className="space-y-2">
                    {moduleTemplates.map((template) => (
                      <TemplateCard key={template.id} template={template} onApply={handleApplyTemplate} onDelete={handleDeleteTemplate} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Global templates */}
              {globalTemplates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Global Templates</p>
                  <div className="space-y-2">
                    {globalTemplates.map((template) => (
                      <TemplateCard key={template.id} template={template} onApply={handleApplyTemplate} onDelete={handleDeleteTemplate} />
                    ))}
                  </div>
                </div>
              )}
              
              {filteredTemplates.length === 0 && (
                <div className="py-8 text-center text-muted-foreground animate-fade-in">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{templateSearch ? 'No templates match your search' : 'No templates yet'}</p>
                  <p className="text-xs mt-1">Create one from the "Add Issue" dialog</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-['Outfit']">Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm"><strong>Student:</strong> {submission?.student_name}</p>
              <p className="text-sm"><strong>Issues found:</strong> {issues.length}</p>
              <p className="text-sm"><strong>Total deductions:</strong> {issues.reduce((sum, i) => sum + (i.marks_deduction || 0), 0)} marks</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Marks (out of {assignment?.total_marks || 100})</Label>
              <Input type="number" value={gradeData.marks} onChange={(e) => setGradeData({ ...gradeData, marks: parseInt(e.target.value) || 0 })} min={0} max={assignment?.total_marks || 100} data-testid="grade-marks-input" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Additional Feedback</Label>
              <Textarea value={gradeData.feedback} onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })} placeholder="Overall comments..." className="min-h-[80px]" data-testid="grade-feedback-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>Cancel</Button>
            <Button onClick={handleGradeSubmission} className="btn-primary" data-testid="submit-grade-btn">
              <Award className="w-4 h-4 mr-1" /> Submit Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCard({ template, onApply, onDelete }) {
  return (
    <div
      className="p-3 border rounded-lg hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all duration-150 group"
      onClick={() => onApply(template)}
      data-testid={`template-${template.id}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{template.title}</span>
        <div className="flex items-center gap-2">
          {template.usage_count > 0 && (
            <span className="text-[10px] text-muted-foreground">{template.usage_count}x used</span>
          )}
          <Badge variant="outline" className="text-xs">
            {template.severity}
          </Badge>
          {template.marks_deduction > 0 && (
            <Badge variant="secondary" className="text-xs">
              -{template.marks_deduction}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => onDelete(template.id, e)}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{template.explanation}</p>
      {template.category_name && (
        <Badge variant="secondary" className="text-[10px] mt-1.5">{template.category_name}</Badge>
      )}
    </div>
  );
}
