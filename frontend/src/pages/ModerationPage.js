import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Eye, 
  Flag, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Clock,
  User
} from 'lucide-react';

export default function ModerationPage() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [moderationIssues, setModerationIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('submissions');
  
  // Raise issue dialog
  const [showRaiseIssueDialog, setShowRaiseIssueDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('moderate');

  // Fetch courses once on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await api().get('/courses');
        setCourses(res.data || []);
        if (res.data?.length > 0) {
          setSelectedCourseId(res.data[0].id);
        }
      } catch {
        // Silently handle — empty courses is a valid state
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [api]);

  // Fetch moderation data when course changes
  const fetchModerationData = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const [subsRes, issuesRes] = await Promise.all([
        api().get(`/submissions?course_id=${selectedCourseId}&for_moderation=true`),
        api().get(`/moderation/issues?course_id=${selectedCourseId}`)
      ]);
      setSubmissions(subsRes.data || []);
      setModerationIssues(issuesRes.data || []);
    } catch {
      toast.error('Failed to load moderation data');
    } finally {
      setLoading(false);
    }
  }, [api, selectedCourseId]);

  useEffect(() => {
    fetchModerationData();
  }, [fetchModerationData]);

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
  };

  const handleRaiseIssue = async () => {
    if (!issueDescription.trim()) {
      toast.error('Please describe the issue');
      return;
    }
    
    try {
      await api().post('/moderation/issues', {
        submission_id: selectedSubmission.id,
        issue_description: issueDescription,
        severity: issueSeverity
      });
      toast.success('Moderation issue raised');
      setShowRaiseIssueDialog(false);
      setIssueDescription('');
      setIssueSeverity('moderate');
      fetchModerationData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to raise issue');
    }
  };

  const handleConfirmNoIssues = async (submissionId) => {
    try {
      await api().post(`/moderation/submissions/${submissionId}/confirm`);
      toast.success('Confirmed no moderation issues');
      fetchModerationData();
    } catch (error) {
      toast.error('Failed to confirm');
    }
  };

  const handleApproveIssue = async (issueId) => {
    try {
      await api().post(`/moderation/issues/${issueId}/approve`);
      toast.success('Issue approved');
      fetchModerationData();
    } catch (error) {
      toast.error('Failed to approve');
    }
  };

  const handleRejectIssue = async (issueId) => {
    try {
      await api().post(`/moderation/issues/${issueId}/reject`);
      toast.success('Issue rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
      case 'flagged':
        return <Badge className="bg-amber-100 text-amber-700">Flagged</Badge>;
      case 'flagged_approved':
        return <Badge className="bg-blue-100 text-blue-700">Flag Approved</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">Pending Review</Badge>;
    }
  };

  const isLeader = user?.role === 'module_leader';
  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const pendingSubmissions = submissions.filter(s => s.moderation_status === 'pending' || !s.moderation_status);
  const openIssues = moderationIssues.filter(i => i.status === 'open');
  const resolvedIssues = moderationIssues.filter(i => i.status !== 'open');

  if (loading && courses.length === 0) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8" data-testid="moderation-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-slide-down">
          <div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/marker')}
              className="mb-2 -ml-2"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-semibold font-['Outfit']">Moderation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review submissions and manage moderation issues
            </p>
          </div>
        </div>

        {/* Course Selector */}
        {courses.length > 0 && (
          <div className="mb-6">
            <Select value={selectedCourseId} onValueChange={handleCourseChange}>
              <SelectTrigger className="w-64" data-testid="course-select">
                <SelectValue placeholder="Select course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.code ? `${course.code} – ` : ''}{course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card-clean p-4 animate-slide-up animate-stagger-1">
            <p className="text-sm text-muted-foreground">Pending Review</p>
            <p className="text-2xl font-semibold mt-1">{pendingSubmissions.length}</p>
          </div>
          <div className="card-clean p-4 animate-slide-up animate-stagger-2">
            <p className="text-sm text-muted-foreground">Open Issues</p>
            <p className="text-2xl font-semibold mt-1">{openIssues.length}</p>
          </div>
          <div className="card-clean p-4 animate-slide-up animate-stagger-3">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-semibold mt-1">{resolvedIssues.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="submissions" data-testid="submissions-tab">
              Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="issues" data-testid="issues-tab">
              Issues ({moderationIssues.length})
            </TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            {submissions.length === 0 ? (
              <div className="card-clean p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No submissions to moderate</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="card-clean p-4"
                    data-testid={`submission-${sub.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium">{sub.student_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Reviewed by {sub.reviewed_by_name || 'Unknown'} · 
                            {sub.marks !== null ? ` ${sub.marks}%` : ' Not graded'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusBadge(sub.moderation_status)}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/marker/review/${sub.id}`)}
                          data-testid={`view-btn-${sub.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        
                        {(sub.moderation_status === 'pending' || !sub.moderation_status) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 border-amber-200 hover:bg-amber-50"
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setShowRaiseIssueDialog(true);
                              }}
                              data-testid={`flag-btn-${sub.id}`}
                            >
                              <Flag className="w-4 h-4 mr-1" /> Flag
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => handleConfirmNoIssues(sub.id)}
                              data-testid={`approve-btn-${sub.id}`}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> OK
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Issues Tab */}
          <TabsContent value="issues">
            {moderationIssues.length === 0 ? (
              <div className="card-clean p-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No moderation issues</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Open Issues */}
                {openIssues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Open Issues ({openIssues.length})
                    </h3>
                    <div className="space-y-3">
                      {openIssues.map((issue) => (
                        <div 
                          key={issue.id} 
                          className="card-clean p-4 border-l-4 border-amber-400"
                          data-testid={`issue-${issue.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <Badge variant="outline" className={
                                  issue.severity === 'critical' ? 'border-red-300 text-red-600' :
                                  issue.severity === 'moderate' ? 'border-amber-300 text-amber-600' :
                                  'border-blue-300 text-blue-600'
                                }>
                                  {issue.severity}
                                </Badge>
                              </div>
                              <p className="text-sm mb-2">{issue.issue_description}</p>
                              <div className="text-xs text-muted-foreground">
                                <span>Raised by {issue.moderator_name}</span>
                                <span className="mx-2">·</span>
                                <span>Against {issue.marker_name}</span>
                              </div>
                            </div>
                            
                            {isLeader && (
                              <div className="flex gap-2 ml-4">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600"
                                  onClick={() => handleApproveIssue(issue.id)}
                                  data-testid={`approve-issue-${issue.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => handleRejectIssue(issue.id)}
                                  data-testid={`reject-issue-${issue.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved Issues */}
                {resolvedIssues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                      Resolved ({resolvedIssues.length})
                    </h3>
                    <div className="space-y-2">
                      {resolvedIssues.map((issue) => (
                        <div 
                          key={issue.id} 
                          className="card-clean p-3 opacity-70"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm">{issue.issue_description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {issue.moderator_name} vs {issue.marker_name}
                              </p>
                            </div>
                            <Badge variant={issue.leader_response === 'approved' ? 'default' : 'secondary'}>
                              {issue.leader_response === 'approved' ? 'Approved' : 'Rejected'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Raise Issue Dialog */}
        <Dialog open={showRaiseIssueDialog} onOpenChange={setShowRaiseIssueDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">Raise Moderation Issue</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {selectedSubmission && (
                <div className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p><strong>Student:</strong> {selectedSubmission.student_name}</p>
                  <p><strong>Reviewed by:</strong> {selectedSubmission.reviewed_by_name}</p>
                  <p><strong>Marks:</strong> {selectedSubmission.marks ?? 'Not graded'}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={issueSeverity} onValueChange={setIssueSeverity}>
                  <SelectTrigger data-testid="severity-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Issue Description *</Label>
                <Textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Describe the problem with this marking..."
                  className="min-h-[100px]"
                  data-testid="issue-description"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRaiseIssueDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRaiseIssue}
                className="bg-amber-500 hover:bg-amber-600"
                data-testid="submit-issue-btn"
              >
                <Flag className="w-4 h-4 mr-1" /> Raise Issue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
