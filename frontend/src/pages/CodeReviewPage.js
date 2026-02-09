import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
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
  DialogDescription,
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
  AlertDialogTrigger,
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
  Code2,
  ChevronRight,
  History,
  ThumbsUp
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
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Issue creation
  const [showIssueDialog, setShowIssueDialog] = useState(false);
  const [selectedLines, setSelectedLines] = useState({ start: 1, end: 1 });
  const [newIssue, setNewIssue] = useState({
    category_id: '',
    title: '',
    explanation: '',
    severity: 'moderate',
    suggested_fix: '',
    verification_criteria: ''
  });
  
  // No issues dialog
  const [showNoIssuesDialog, setShowNoIssuesDialog] = useState(false);
  const [noIssuesComment, setNoIssuesComment] = useState('');
  
  // Decorations for highlighting
  const [decorations, setDecorations] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, issuesRes, categoriesRes, historyRes] = await Promise.all([
        api().get(`/submissions/${submissionId}`),
        api().get(`/issues?submission_id=${submissionId}`),
        api().get('/categories'),
        api().get(`/submissions/${submissionId}/history`)
      ]);
      setSubmission(subRes.data);
      setIssues(issuesRes.data);
      setCategories(categoriesRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error('Failed to load submission');
      navigate('/marker');
    } finally {
      setLoading(false);
    }
  }, [api, submissionId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update decorations when issues change
  useEffect(() => {
    if (editorRef.current && issues.length > 0) {
      const newDecorations = issues.map(issue => ({
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
          glyphMarginHoverMessage: { value: `**${issue.title}**\n\n${issue.explanation}` }
        }
      }));
      
      const editor = editorRef.current;
      setDecorations(prev => editor.deltaDecorations(prev, newDecorations));
    }
  }, [issues]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add selection listener for creating issues
    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      if (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn) {
        setSelectedLines({
          start: Math.min(selection.startLineNumber, selection.endLineNumber),
          end: Math.max(selection.startLineNumber, selection.endLineNumber)
        });
      }
    });
  };

  const handleCreateIssue = async () => {
    if (!newIssue.category_id || !newIssue.title || !newIssue.explanation) {
      toast.error('Please fill in required fields');
      return;
    }
    
    try {
      await api().post('/issues', {
        submission_id: submissionId,
        ...newIssue,
        line_start: selectedLines.start,
        line_end: selectedLines.end
      });
      toast.success('Issue created');
      setShowIssueDialog(false);
      setNewIssue({
        category_id: '',
        title: '',
        explanation: '',
        severity: 'moderate',
        suggested_fix: '',
        verification_criteria: ''
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create issue');
    }
  };

  const handleDeleteIssue = async (issueId) => {
    try {
      await api().delete(`/issues/${issueId}`);
      toast.success('Issue deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete issue');
    }
  };

  const handlePublishFeedback = async () => {
    try {
      await api().post(`/submissions/${submissionId}/publish`);
      toast.success('Feedback published successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to publish feedback');
    }
  };

  const handleMarkNoIssues = async () => {
    try {
      await api().post(`/submissions/${submissionId}/mark-no-issues`, {
        submission_id: submissionId,
        marker_comment: noIssuesComment || 'No issues found. Code is correct.'
      });
      toast.success('Submission marked as fully correct!');
      setShowNoIssuesDialog(false);
      setNoIssuesComment('');
      fetchData();
    } catch (error) {
      toast.error('Failed to mark submission');
    }
  };

  const scrollToLine = (lineNumber) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNumber);
      editorRef.current.setPosition({ lineNumber, column: 1 });
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'moderate':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <Badge className="severity-critical">Critical</Badge>;
      case 'moderate':
        return <Badge className="severity-moderate">Moderate</Badge>;
      default:
        return <Badge className="severity-minor">Minor</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'feedback_released':
        return <Badge variant="secondary" className="badge-fixed">Published</Badge>;
      case 'no_issues':
        return <Badge variant="secondary" className="bg-green-100 text-green-700">No Issues</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="badge-review">In Review</Badge>;
      default:
        return <Badge variant="secondary" className="badge-pending">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading review...</div>
      </div>
    );
  }

  const isCompleted = submission?.status === 'feedback_released' || submission?.status === 'no_issues';

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="code-review-page">
      {/* Header */}
      <header className="glass-header h-14 flex items-center px-4 gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/marker')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          <span className="font-medium">{submission?.student_name}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">{submission?.filename}</span>
          <Badge variant="secondary" className="ml-2">Attempt {submission?.attempt_number}</Badge>
        </div>
        
        <div className="ml-auto flex items-center gap-2">
          {getStatusBadge(submission?.status)}
          
          {!isCompleted && (
            <>
              {/* Mark No Issues Button */}
              <AlertDialog open={showNoIssuesDialog} onOpenChange={setShowNoIssuesDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="rounded-full gap-2"
                    disabled={issues.length > 0}
                    data-testid="no-issues-btn"
                  >
                    <ThumbsUp className="w-4 h-4" /> No Issues
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark as Fully Correct</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark the submission as having no issues. The student will see that their code is correct.
                      This counts as a completed review.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label>Optional Comment</Label>
                    <Textarea
                      value={noIssuesComment}
                      onChange={(e) => setNoIssuesComment(e.target.value)}
                      placeholder="Great work! Your code is well-structured..."
                      className="mt-2"
                      data-testid="no-issues-comment"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkNoIssues} data-testid="confirm-no-issues-btn">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              {/* Publish Feedback Button */}
              <Button 
                className="rounded-full gap-2" 
                onClick={handlePublishFeedback}
                disabled={issues.length === 0}
                data-testid="publish-btn"
              >
                <Send className="w-4 h-4" /> Publish Feedback
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Submission History Panel */}
        <div className="w-56 border-r border-border bg-white p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> History
          </h3>
          <div className="space-y-2">
            {history.map((sub) => (
              <div
                key={sub.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  sub.id === submissionId 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/30'
                }`}
                onClick={() => navigate(`/marker/review/${sub.id}`)}
                data-testid={`history-item-${sub.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Attempt {sub.attempt_number}</span>
                  {sub.status === 'no_issues' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : sub.issues_count > 0 ? (
                    <Badge variant="secondary" className="text-xs">{sub.issues_count}</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(sub.submission_time).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={submission?.code_content || ''}
              onMount={handleEditorDidMount}
              theme="vs-light"
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                glyphMargin: true,
                folding: true,
                lineDecorationsWidth: 10,
              }}
            />
          </div>
          
          {/* Add Issue Button */}
          {!isCompleted && (
            <div className="p-3 border-t border-border bg-white flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Selected: Lines {selectedLines.start}-{selectedLines.end}
              </span>
              <Button 
                size="sm" 
                className="rounded-full gap-2"
                onClick={() => setShowIssueDialog(true)}
                data-testid="add-issue-btn"
              >
                <Plus className="w-4 h-4" /> Add Issue
              </Button>
            </div>
          )}
        </div>

        {/* Issues Panel */}
        <div className="w-80 border-l border-border bg-white flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Issues ({issues.length})</span>
            </h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {submission?.status === 'no_issues' ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-green-700">No Issues Found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {submission?.marker_comment || 'Code is correct.'}
                  </p>
                </div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No issues added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Select lines and click "Add Issue"</p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-all group"
                    onClick={() => scrollToLine(issue.line_start)}
                    data-testid={`issue-item-${issue.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity)}
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">{issue.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Lines {issue.line_start}-{issue.line_end} • {issue.category_name}
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
                          data-testid={`delete-issue-${issue.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{issue.explanation}</p>
                    <div className="mt-2">
                      {getSeverityBadge(issue.severity)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Create Issue Dialog */}
      <Dialog open={showIssueDialog} onOpenChange={setShowIssueDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Issue</DialogTitle>
            <DialogDescription>
              Create feedback for lines {selectedLines.start}-{selectedLines.end}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={newIssue.category_id} 
                  onValueChange={(v) => setNewIssue({ ...newIssue, category_id: v })}
                >
                  <SelectTrigger data-testid="issue-category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Severity</Label>
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
              <Label>Title *</Label>
              <Input
                value={newIssue.title}
                onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                placeholder="Brief description of the issue"
                data-testid="issue-title-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Explanation *</Label>
              <Textarea
                value={newIssue.explanation}
                onChange={(e) => setNewIssue({ ...newIssue, explanation: e.target.value })}
                placeholder="Detailed explanation of why this is an issue..."
                rows={3}
                data-testid="issue-explanation-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Suggested Fix (Optional)</Label>
              <Textarea
                value={newIssue.suggested_fix}
                onChange={(e) => setNewIssue({ ...newIssue, suggested_fix: e.target.value })}
                placeholder="Guidance on how to fix this issue..."
                rows={2}
                data-testid="issue-fix-input"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Verification Criteria (Optional)</Label>
              <Input
                value={newIssue.verification_criteria}
                onChange={(e) => setNewIssue({ ...newIssue, verification_criteria: e.target.value })}
                placeholder="How to verify this issue is fixed"
                data-testid="issue-criteria-input"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIssueDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateIssue} data-testid="save-issue-btn">Create Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
