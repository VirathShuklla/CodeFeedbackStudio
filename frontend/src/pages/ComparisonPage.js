import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, GitCompare, Lock, FileCode, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import Editor from '@monaco-editor/react';

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { api } = useAuth();
  const editorARef = useRef(null);
  const editorBRef = useRef(null);
  const scrollingRef = useRef(null);

  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(searchParams.get('assignment') || '');
  const [submissions, setSubmissions] = useState([]);
  const [subAId, setSubAId] = useState(searchParams.get('a') || '');
  const [subBId, setSubBId] = useState(searchParams.get('b') || '');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFileA, setActiveFileA] = useState(null);
  const [activeFileB, setActiveFileB] = useState(null);
  const [syncScroll, setSyncScroll] = useState(true);

  // Fetch assignments
  useEffect(() => {
    api().get('/assignments').then(res => {
      setAssignments(res.data || []);
      if (!selectedAssignment && res.data?.length > 0) {
        setSelectedAssignment(res.data[0].id);
      }
    }).catch(() => toast.error('Failed to load assignments'));
  }, [api, selectedAssignment]);

  // Fetch comparable submissions when assignment changes
  useEffect(() => {
    if (!selectedAssignment) return;
    api().get(`/compare/submissions?assignment_id=${selectedAssignment}`)
      .then(res => setSubmissions(res.data || []))
      .catch(() => {});
  }, [api, selectedAssignment]);

  // Load comparison
  const loadComparison = useCallback(async () => {
    if (!subAId || !subBId) return;
    if (subAId === subBId) { toast.error('Select two different submissions'); return; }
    setLoading(true);
    try {
      const res = await api().get(`/compare/${subAId}/${subBId}`);
      setComparison(res.data);
      if (res.data.submission_a?.files?.length) setActiveFileA(res.data.submission_a.files[0].id);
      if (res.data.submission_b?.files?.length) setActiveFileB(res.data.submission_b.files[0].id);
    } catch { toast.error('Failed to load comparison'); }
    finally { setLoading(false); }
  }, [api, subAId, subBId]);

  useEffect(() => { loadComparison(); }, [loadComparison]);

  // Synchronized scrolling
  const handleEditorMount = (editor, ref) => {
    ref.current = editor;
    editor.onDidScrollChange((e) => {
      if (!syncScroll || scrollingRef.current === ref) return;
      scrollingRef.current = ref;
      const other = ref === editorARef ? editorBRef : editorARef;
      if (other.current) {
        other.current.setScrollTop(e.scrollTop);
      }
      setTimeout(() => { scrollingRef.current = null; }, 50);
    });
  };

  const fileA = comparison?.submission_a?.files?.find(f => f.id === activeFileA);
  const fileB = comparison?.submission_b?.files?.find(f => f.id === activeFileB);
  const issuesA = comparison?.submission_a?.issues || [];

  const getSevIcon = (s) => {
    if (s === 'critical') return <AlertTriangle className="w-3 h-3 text-red-500" />;
    if (s === 'moderate') return <AlertCircle className="w-3 h-3 text-amber-500" />;
    return <Info className="w-3 h-3 text-blue-500" />;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-900" data-testid="comparison-page">
      {/* Header */}
      <header className="header-clean h-14 flex items-center px-4 gap-4 animate-slide-down">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-primary" />
          <span className="font-medium">Cross-Student Comparison</span>
          <Badge variant="outline" className="text-xs"><Lock className="w-3 h-3 mr-1" />Marker Only</Badge>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={syncScroll} onChange={e => setSyncScroll(e.target.checked)} className="rounded" />
            Sync Scroll
          </label>
        </div>
      </header>

      {/* Selector bar */}
      {!comparison && (
        <div className="px-6 py-4 border-b bg-white dark:bg-slate-900 animate-fade-in">
          <div className="max-w-4xl mx-auto space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Assignment</label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger className="w-full" data-testid="assignment-select"><SelectValue placeholder="Select assignment" /></SelectTrigger>
                <SelectContent>
                  {assignments.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.title} — {a.course_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block text-primary">Primary (annotatable)</label>
                <Select value={subAId} onValueChange={setSubAId}>
                  <SelectTrigger data-testid="sub-a-select"><SelectValue placeholder="Student A" /></SelectTrigger>
                  <SelectContent>
                    {submissions.filter(s => s.id !== subBId).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.student_name} (Attempt {s.attempt_number}{s.marks != null ? `, ${s.marks}%` : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Reference (read-only)</label>
                <Select value={subBId} onValueChange={setSubBId}>
                  <SelectTrigger data-testid="sub-b-select"><SelectValue placeholder="Student B" /></SelectTrigger>
                  <SelectContent>
                    {submissions.filter(s => s.id !== subAId).map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.student_name} (Attempt {s.attempt_number}{s.marks != null ? `, ${s.marks}%` : ''})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={loadComparison} disabled={!subAId || !subBId || subAId === subBId || loading} data-testid="compare-btn">
              <GitCompare className="w-4 h-4 mr-1.5" />{loading ? 'Loading...' : 'Compare'}
            </Button>
          </div>
        </div>
      )}

      {/* Comparison panels */}
      {comparison && (
        <div className="flex flex-1 overflow-hidden">
          {/* Panel A — Primary */}
          <div className="flex-1 flex flex-col border-r border-primary/20">
            <div className="px-3 py-2 border-b bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary text-white text-xs">Primary</Badge>
                <span className="text-sm font-medium">{comparison.submission_a?.student_name}</span>
                {comparison.submission_a?.marks != null && <span className="text-xs text-muted-foreground">{comparison.submission_a.marks}%</span>}
              </div>
              <Select value={activeFileA || ''} onValueChange={setActiveFileA}>
                <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {comparison.submission_a?.files?.map(f => <SelectItem key={f.id} value={f.id}>{f.filename}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={fileA?.content || ''}
                  onMount={(e) => handleEditorMount(e, editorARef)}
                  theme="vs-light"
                  options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, fontFamily: "'JetBrains Mono', monospace", glyphMargin: true, padding: { top: 8 } }}
                />
              </div>
              {/* Issues sidebar for A */}
              {issuesA.length > 0 && (
                <div className="w-56 border-l bg-white dark:bg-slate-900 overflow-y-auto">
                  <div className="p-2 text-xs font-medium text-muted-foreground border-b">Issues ({issuesA.length})</div>
                  <div className="p-2 space-y-1.5">
                    {issuesA.filter(i => i.file_id === activeFileA).map(issue => (
                      <div key={issue.id} className="p-2 rounded border text-xs cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => { if (editorARef.current) editorARef.current.revealLineInCenter(issue.line_start); }}>
                        <div className="flex items-center gap-1 mb-0.5">{getSevIcon(issue.severity)}<span className="font-medium truncate">{issue.title}</span></div>
                        <span className="text-muted-foreground">L{issue.line_start}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel B — Reference */}
          <div className="flex-1 flex flex-col">
            <div className="px-3 py-2 border-b bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs"><Lock className="w-3 h-3 mr-0.5" />Reference</Badge>
                <span className="text-sm font-medium">{comparison.submission_b?.student_name}</span>
                {comparison.submission_b?.marks != null && <span className="text-xs text-muted-foreground">{comparison.submission_b.marks}%</span>}
              </div>
              <Select value={activeFileB || ''} onValueChange={setActiveFileB}>
                <SelectTrigger className="w-40 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {comparison.submission_b?.files?.map(f => <SelectItem key={f.id} value={f.id}>{f.filename}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={fileB?.content || ''}
                onMount={(e) => handleEditorMount(e, editorBRef)}
                theme="vs-light"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, fontFamily: "'JetBrains Mono', monospace", padding: { top: 8 } }}
              />
            </div>
          </div>
        </div>
      )}

      {!comparison && !loading && (
        <div className="flex-1 flex items-center justify-center text-center animate-fade-in">
          <div>
            <GitCompare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Compare Submissions</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Select an assignment and two student submissions to view their code side by side. The primary submission can be annotated; the reference is read-only.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
