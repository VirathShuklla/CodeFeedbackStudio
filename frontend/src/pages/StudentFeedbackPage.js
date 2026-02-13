import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  FileCode,
  Sparkles
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
  
  // Multi-file handling
  const [activeFileId, setActiveFileId] = useState(null);
  const [decorations, setDecorations] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      const [subRes, issuesRes] = await Promise.all([
        api().get(`/submissions/${submissionId}`),
        api().get(`/issues?submission_id=${submissionId}`)
      ]);
      setSubmission(subRes.data);
      setIssues(issuesRes.data);
      
      // Set first file as active
      if (subRes.data.files?.length > 0 && !activeFileId) {
        setActiveFileId(subRes.data.files[0].id);
      }
    } catch (error) {
      toast.error('Failed to load feedback');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  }, [api, submissionId, navigate, activeFileId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update decorations when file or issues change
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
  };

  const handleMarkFixed = async (issueId) => {
    try {
      const res = await api().post(`/issues/${issueId}/mark-fixed`);
      toast.success(`Issue marked as fixed! +${res.data.xp_gained} XP`);
      fetchData();
    } catch (error) {
      toast.error('Failed to mark as fixed');
    }
  };

  const scrollToIssue = (issue) => {
    // Switch to the file containing the issue
    if (issue.file_id !== activeFileId) {
      setActiveFileId(issue.file_id);
    }
    // Wait for editor to update, then scroll
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
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'moderate': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      moderate: 'bg-amber-100 text-amber-700 border-amber-200',
      minor: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[severity] || colors.minor;
  };

  const getIssuesForFile = (fileId) => issues.filter(i => i.file_id === fileId);
  const activeFile = submission?.files?.find(f => f.id === activeFileId);
  const openIssues = issues.filter(i => i.student_status === 'open');
  const fixedIssues = issues.filter(i => i.student_status === 'fixed');

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
          <span className="font-medium">Feedback</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">Attempt {submission?.attempt_number}</span>
          {submission?.status === 'no_issues' && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3 mr-1" /> No Issues
            </Badge>
          )}
        </div>
        
        <div className="ml-auto flex items-center gap-3 text-sm">
          {issues.length > 0 && (
            <>
              <span className="text-muted-foreground">
                {fixedIssues.length}/{issues.length} fixed
              </span>
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(fixedIssues.length / issues.length) * 100}%` }}
                />
              </div>
            </>
          )}
        </div>
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
                const fileOpenCount = getIssuesForFile(file.id).filter(i => i.student_status === 'open').length;
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
                      <Badge 
                        variant={fileOpenCount > 0 ? "destructive" : "secondary"} 
                        className="text-xs h-5 px-1.5"
                      >
                        {fileOpenCount > 0 ? fileOpenCount : <CheckCircle2 className="w-3 h-3" />}
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
          {submission?.status === 'no_issues' ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-emerald-700 mb-2">Excellent Work!</h2>
                <p className="text-muted-foreground max-w-md">
                  Your code has been reviewed and no issues were found. 
                  {submission.marker_comment && (
                    <span className="block mt-2 italic">"{submission.marker_comment}"</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
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
          )}
        </div>

        {/* Issues Panel */}
        <div className="w-96 border-l bg-white flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium">Feedback ({issues.length})</h3>
            {issues.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Click an issue to navigate to the code
              </p>
            )}
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {issues.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-emerald-700">All Clear!</p>
                  <p className="text-sm text-muted-foreground mt-1">No issues to resolve</p>
                </div>
              ) : (
                <>
                  {/* Open Issues */}
                  {openIssues.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Open Issues ({openIssues.length})
                      </h4>
                      <div className="space-y-3">
                        {openIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                              issue.file_id === activeFileId 
                                ? 'border-primary/30 bg-primary/5' 
                                : 'border-border hover:border-primary/20'
                            }`}
                            onClick={() => scrollToIssue(issue)}
                            data-testid={`issue-${issue.id}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-start gap-2">
                                {getSeverityIcon(issue.severity)}
                                <div>
                                  <p className="font-medium text-sm">{issue.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {issue.filename} · Line {issue.line_start}{issue.line_end !== issue.line_start ? `–${issue.line_end}` : ''}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className={`text-xs ${getSeverityBadge(issue.severity)}`}>
                                {issue.severity}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{issue.explanation}</p>
                            
                            {issue.suggested_fix && (
                              <div className="bg-slate-50 rounded p-2 mb-3">
                                <p className="text-xs font-medium mb-1">Suggested Fix:</p>
                                <p className="text-xs text-muted-foreground">{issue.suggested_fix}</p>
                              </div>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkFixed(issue.id);
                              }}
                              data-testid={`mark-fixed-btn-${issue.id}`}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Mark as Fixed
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Fixed Issues */}
                  {fixedIssues.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Fixed ({fixedIssues.length})
                      </h4>
                      <div className="space-y-2">
                        {fixedIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                            onClick={() => scrollToIssue(issue)}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-medium text-emerald-800 line-through">{issue.title}</span>
                            </div>
                            <p className="text-xs text-emerald-600 mt-1">{issue.filename} · Line {issue.line_start}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
