import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Code2,
  ChevronRight,
  History,
  ExternalLink,
  ThumbsUp
} from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function StudentFeedbackPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const editorRef = useRef(null);
  
  const [submission, setSubmission] = useState(null);
  const [issues, setIssues] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decorations, setDecorations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, issuesRes, historyRes] = await Promise.all([
          api().get(`/submissions/${submissionId}`),
          api().get(`/issues?submission_id=${submissionId}`),
          api().get(`/submissions/${submissionId}/history`)
        ]);
        setSubmission(subRes.data);
        setIssues(issuesRes.data);
        setHistory(historyRes.data);
      } catch (error) {
        toast.error('Failed to load feedback');
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, submissionId, navigate]);

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
          className: issue.student_status === 'fixed' 
            ? 'bg-green-50' 
            : `code-highlight-${issue.severity === 'critical' ? 'error' : issue.severity === 'moderate' ? 'warning' : 'info'}`,
          glyphMarginClassName: issue.student_status === 'fixed'
            ? 'issue-gutter-marker bg-green-500'
            : `issue-gutter-marker issue-gutter-${issue.severity}`,
        }
      }));
      
      const editor = editorRef.current;
      setDecorations(prev => editor.deltaDecorations(prev, newDecorations));
    }
  }, [issues]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleMarkFixed = async (issueId) => {
    try {
      await api().post(`/issues/${issueId}/mark-fixed`);
      toast.success('Issue marked as fixed');
      // Refresh issues
      const issuesRes = await api().get(`/issues?submission_id=${submissionId}`);
      setIssues(issuesRes.data);
    } catch (error) {
      toast.error('Failed to mark issue as fixed');
    }
  };

  const scrollToLine = (lineNumber) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNumber);
      editorRef.current.setPosition({ lineNumber, column: 1 });
    }
  };

  const getSeverityIcon = (severity, status) => {
    if (status === 'fixed') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
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
        return <Badge variant="secondary" className="badge-fixed text-xs">Feedback Ready</Badge>;
      case 'no_issues':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">No Issues</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="badge-review text-xs">In Review</Badge>;
      default:
        return <Badge variant="secondary" className="badge-pending text-xs">{status}</Badge>;
    }
  };

  const fixedCount = issues.filter(i => i.student_status === 'fixed').length;
  const progressPercent = issues.length > 0 ? (fixedCount / issues.length) * 100 : 100;

  // Check if this is a "no issues" submission
  const isNoIssues = submission?.status === 'no_issues';

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading feedback...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="student-feedback-page">
      {/* Header */}
      <header className="glass-header h-14 flex items-center px-4 gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/student')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          <span className="font-medium">{submission?.filename}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Feedback</span>
          <Badge variant="secondary" className="ml-2">Attempt {submission?.attempt_number}</Badge>
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          {isNoIssues ? (
            <div className="flex items-center gap-2 text-green-600">
              <ThumbsUp className="w-4 h-4" />
              <span className="font-medium">Perfect Score!</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Progress:</span>
                <span className="font-medium">{fixedCount}/{issues.length} fixed</span>
              </div>
              <div className="w-32">
                <Progress value={progressPercent} className="h-2" />
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Submission History Panel */}
        <div className="w-56 border-r border-border bg-white p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <History className="w-4 h-4" /> Submission History
          </h3>
          <div className="space-y-2">
            {history.map((sub) => {
              const canView = sub.status === 'feedback_released' || sub.status === 'no_issues';
              return (
                <div
                  key={sub.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    sub.id === submissionId 
                      ? 'border-primary bg-primary/5' 
                      : canView
                        ? 'border-border hover:border-primary/30'
                        : 'border-border opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (canView) {
                      navigate(`/student/feedback/${sub.id}`);
                    }
                  }}
                  data-testid={`history-item-${sub.id}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Attempt {sub.attempt_number}</span>
                    {getStatusBadge(sub.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(sub.submission_time).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
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

        {/* Feedback Panel */}
        <div className="w-96 border-l border-border bg-white flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              {isNoIssues ? 'Feedback' : `Feedback (${issues.length} issues)`}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isNoIssues ? 'Your code has been reviewed' : 'Click an issue to jump to the code location'}
            </p>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* No Issues - Perfect Score */}
              {isNoIssues ? (
                <div className="py-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <ThumbsUp className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-700 mb-2">No Issues Found!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Your code is correct. Great work on this submission!
                  </p>
                  {submission?.marker_comment && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 text-left">
                      <p className="text-xs font-medium text-green-700 mb-1">Marker's Comment</p>
                      <p className="text-sm text-green-800">{submission.marker_comment}</p>
                    </div>
                  )}
                </div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No issues found!</p>
                  <p className="text-xs text-muted-foreground mt-1">Great work on this submission.</p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      issue.student_status === 'fixed'
                        ? 'border-green-200 bg-green-50/50'
                        : 'border-border hover:border-primary/30 hover:bg-primary/5'
                    }`}
                    onClick={() => scrollToLine(issue.line_start)}
                    data-testid={`feedback-item-${issue.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(issue.severity, issue.student_status)}
                        <div>
                          <p className={`text-sm font-medium ${issue.student_status === 'fixed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {issue.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Lines {issue.line_start}-{issue.line_end} • {issue.category_name}
                          </p>
                        </div>
                      </div>
                      {getSeverityBadge(issue.severity)}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {issue.explanation}
                    </p>
                    
                    {issue.suggested_fix && (
                      <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 mb-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">Suggested Fix</p>
                        <p className="text-xs text-blue-600">{issue.suggested_fix}</p>
                      </div>
                    )}
                    
                    {issue.reference_links && issue.reference_links.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {issue.reference_links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" /> Learn more
                          </a>
                        ))}
                      </div>
                    )}
                    
                    {issue.student_status === 'fixed' ? (
                      <Badge className="badge-fixed">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Fixed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkFixed(issue.id);
                        }}
                        data-testid={`mark-fixed-btn-${issue.id}`}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Mark as Fixed
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
