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
  FileCode
} from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function CodeReviewPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const editorRef = useRef(null);
  
  const [submission, setSubmission] = useState(null);
  const [issues, setIssues] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-file handling
  const [activeFileId, setActiveFileId] = useState(null);
  
  // Issue creation
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [selectedLines, setSelectedLines] = useState({ start: 1, end: 1 });
  const [newIssue, setNewIssue] = useState({
    category_id: '',
    title: '',
    explanation: '',
    severity: 'moderate',
    suggested_fix: ''
  });
  
  // No issues dialog
  const [showNoIssuesDialog, setShowNoIssuesDialog] = useState(false);
  const [decorations, setDecorations] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, issuesRes, categoriesRes] = await Promise.all([
        api().get(`/submissions/${submissionId}`),
        api().get(`/issues?submission_id=${submissionId}`),
        api().get('/categories')
      ]);
      setSubmission(subRes.data);
      setIssues(issuesRes.data);
      setCategories(categoriesRes.data);
      
      // Set first file as active
      if (subRes.data.files?.length > 0 && !activeFileId) {
        setActiveFileId(subRes.data.files[0].id);
      }
    } catch (error) {
      toast.error('Failed to load submission');
      navigate('/marker');
    } finally {
      setLoading(false);
    }
  }, [api, submissionId, navigate, activeFileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update decorations when active file or issues change
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
          className: `code-highlight-${issue.severity === 'critical' ? 'error' : issue.severity === 'moderate' ? 'warning' : 'info'}`,
          glyphMarginClassName: `issue-gutter-marker issue-gutter-${issue.severity}`,
        }
      }));
      
      const editor = editorRef.current;
      setDecorations(prev => editor.deltaDecorations(prev, newDecorations));
    }
  }, [issues, activeFileId]);

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
        line_end: selectedLines.end
      });
      toast.success('Issue added');
      setShowIssueDialog(false);
      setNewIssue({ category_id: '', title: '', explanation: '', severity: 'moderate', suggested_fix: '' });
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
    } catch (error) {
      toast.error('Failed to remove issue');
    }
  };

  const handlePublishFeedback = async () => {
    try {
      await api().post(`/submissions/${submissionId}/publish`);
      toast.success('Feedback published');
      navigate('/marker');
    } catch (error) {
      toast.error('Failed to publish');
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
    } catch (error) {
      toast.error('Failed to mark');
    }
  };

  const scrollToLine = (lineNumber, fileId) => {
    if (fileId !== activeFileId) {
      setActiveFileId(fileId);
    }
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
      }
    }, 100);
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isCompleted = submission?.status === 'feedback_released' || submission?.status === 'no_issues';

  return (
    <div className="h-screen flex flex-col bg-slate-50" data-testid="code-review-page">
      {/* Header */}
      <header className="header-clean h-14 flex items-center px-4 gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">{submission?.student_name}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">
            {submission?.files?.length || 0} file{(submission?.files?.length || 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Attempt {submission?.attempt_number}</span>
        </div>
        
        {!isCompleted && (
          <div className="ml-auto flex items-center gap-2">
            <AlertDialog open={showNoIssuesDialog} onOpenChange={setShowNoIssuesDialog}>
              <Button 
                variant="outline"
                onClick={() => setShowNoIssuesDialog(true)}
                disabled={issues.length > 0}
                data-testid="no-issues-btn"
              >
                <ThumbsUp className="w-4 h-4 mr-2" /> No Issues
              </Button>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mark as Correct</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the submission as having no issues. The student will be notified.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleMarkNoIssues} data-testid="confirm-no-issues-btn">
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button 
              onClick={handlePublishFeedback}
              disabled={issues.length === 0}
              className="btn-primary"
              data-testid="publish-btn"
            >
              <Send className="w-4 h-4 mr-2" /> Publish
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Sidebar */}
        <div className="w-48 border-r bg-white flex flex-col">
          <div className="p-3 border-b text-sm font-medium">Files</div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {submission?.files?.map((file) => {
                const fileIssueCount = getIssuesForFile(file.id).length;
                return (
                  <div
                    key={file.id}
                    className={`p-2 rounded-md cursor-pointer flex items-center justify-between text-sm transition-colors ${
                      file.id === activeFileId 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setActiveFileId(file.id)}
                    data-testid={`file-tab-${file.id}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{file.filename}</span>
                    </div>
                    {fileIssueCount > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 px-1.5">
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
            <div className="p-3 border-t bg-white flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <span className="font-medium">{activeFile?.filename}</span>
                {' · '}Line{selectedLines.start !== selectedLines.end ? 's' : ''} {selectedLines.start}{selectedLines.start !== selectedLines.end ? `–${selectedLines.end}` : ''}
              </span>
              <Button size="sm" onClick={() => setShowIssueDialog(true)} data-testid="add-issue-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Issue
              </Button>
            </div>
          )}
        </div>

        {/* Issues Panel */}
        <div className="w-80 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium">Issues ({issues.length})</h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {submission?.status === 'no_issues' ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-emerald-700">No Issues</p>
                  <p className="text-sm text-muted-foreground mt-1">Code marked as correct</p>
                </div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="text-sm">No issues yet</p>
                  <p className="text-xs mt-1">Select code and click "Add Issue"</p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3 rounded-lg border hover:border-primary/30 cursor-pointer group transition-colors ${
                      issue.file_id === activeFileId ? '' : 'opacity-70'
                    }`}
                    onClick={() => scrollToLine(issue.line_start, issue.file_id)}
                    data-testid={`issue-item-${issue.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{issue.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {issue.filename} · Line {issue.line_start}{issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''}
                          </p>
                        </div>
                      </div>
                      {!isCompleted && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteIssue(issue.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{issue.explanation}</p>
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
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-2 bg-slate-50 rounded text-sm">
              <span className="font-medium">{activeFile?.filename}</span>
              {' · Lines '}{selectedLines.start}–{selectedLines.end}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Category *</Label>
                <Select 
                  value={newIssue.category_id} 
                  onValueChange={(v) => setNewIssue({ ...newIssue, category_id: v })}
                >
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
                <Select 
                  value={newIssue.severity} 
                  onValueChange={(v) => setNewIssue({ ...newIssue, severity: v })}
                >
                  <SelectTrigger data-testid="issue-severity-select">
                    <SelectValue />
                  </SelectTrigger>
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
              <Input
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                placeholder="Brief description"
                className="input-clean"
                data-testid="issue-title-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Explanation *</Label>
              <Textarea
                value={newIssue.explanation}
                onChange={(e) => setNewIssue({ ...newIssue, explanation: e.target.value })}
                placeholder="Why is this an issue?"
                className="input-clean min-h-[80px]"
                data-testid="issue-explanation-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Suggested Fix</Label>
              <Textarea
                value={newIssue.suggested_fix}
                onChange={(e) => setNewIssue({ ...newIssue, suggested_fix: e.target.value })}
                placeholder="How to fix this"
                className="input-clean min-h-[60px]"
                data-testid="issue-fix-input"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateIssue} className="btn-primary" data-testid="save-issue-btn">
              Add Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
