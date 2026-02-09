import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
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
  const [loading, setLoading] = useState(true);
  const [decorations, setDecorations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, issuesRes] = await Promise.all([
          api().get(`/submissions/${submissionId}`),
          api().get(`/issues?submission_id=${submissionId}`)
        ]);
        setSubmission(subRes.data);
        setIssues(issuesRes.data);
      } catch (error) {
        toast.error('Failed to load feedback');
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api, submissionId, navigate]);

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
            ? 'bg-emerald-50' 
            : `code-highlight-${issue.severity === 'critical' ? 'error' : issue.severity === 'moderate' ? 'warning' : 'info'}`,
          glyphMarginClassName: issue.student_status === 'fixed'
            ? 'issue-gutter-marker bg-emerald-500'
            : `issue-gutter-marker issue-gutter-${issue.severity}`,
        }
      }));
      
      setDecorations(prev => editorRef.current.deltaDecorations(prev, newDecorations));
    }
  }, [issues]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  const handleMarkFixed = async (issueId) => {
    try {
      await api().post(`/issues/${issueId}/mark-fixed`);
      toast.success('Marked as fixed');
      const issuesRes = await api().get(`/issues?submission_id=${submissionId}`);
      setIssues(issuesRes.data);
    } catch (error) {
      toast.error('Failed to mark');
    }
  };

  const scrollToLine = (lineNumber) => {
    if (editorRef.current) {
      editorRef.current.revealLineInCenter(lineNumber);
    }
  };

  const getSeverityIcon = (severity, status) => {
    if (status === 'fixed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'moderate': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const isNoIssues = submission?.status === 'no_issues';

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50" data-testid="student-feedback-page">
      {/* Header */}
      <header className="header-clean h-14 flex items-center px-4 gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/student')}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        
        <div className="flex items-center gap-2">
          <span className="font-medium">{submission?.filename}</span>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Attempt {submission?.attempt_number}</span>
        </div>
        
        {isNoIssues && (
          <div className="ml-auto flex items-center gap-2 text-emerald-600">
            <ThumbsUp className="w-4 h-4" />
            <span className="font-medium">No issues found</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className="flex-1">
          <Editor
            height="100%"
            defaultLanguage="python"
            value={submission?.code_content || ''}
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

        {/* Feedback Panel */}
        <div className="w-96 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium">Feedback</h3>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {isNoIssues ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <ThumbsUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-700 mb-1">No Issues Found</h3>
                  <p className="text-sm text-muted-foreground">Your code is correct. Great work!</p>
                  {submission?.marker_comment && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-left text-sm text-emerald-800">
                      {submission.marker_comment}
                    </div>
                  )}
                </div>
              ) : issues.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No issues found</p>
                </div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      issue.student_status === 'fixed'
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => scrollToLine(issue.line_start)}
                    data-testid={`feedback-item-${issue.id}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {getSeverityIcon(issue.severity, issue.student_status)}
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${issue.student_status === 'fixed' ? 'line-through text-muted-foreground' : ''}`}>
                          {issue.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Line {issue.line_start}{issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''} · {issue.category_name}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">{issue.explanation}</p>
                    
                    {issue.suggested_fix && (
                      <div className="p-2 rounded bg-blue-50 border border-blue-100 mb-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">Suggested fix</p>
                        <p className="text-xs text-blue-600">{issue.suggested_fix}</p>
                      </div>
                    )}
                    
                    {issue.student_status === 'fixed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Fixed
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
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
