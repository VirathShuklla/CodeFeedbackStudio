import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Target,
  BookOpen
} from 'lucide-react';

export default function StudentDashboard() {
  const { api, user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, progressRes] = await Promise.all([
          api().get('/submissions'),
          api().get('/analytics/student')
        ]);
        setSubmissions(subsRes.data);
        setProgress(progressRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api]);

  const feedbackReadySubmissions = submissions.filter(s => s.status === 'feedback_released');
  const pendingSubmissions = submissions.filter(s => s.status === 'pending' || s.status === 'in_review');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="badge-pending">Submitted</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="badge-review">In Review</Badge>;
      case 'feedback_released':
        return <Badge variant="secondary" className="badge-fixed">Feedback Ready</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const resolutionRate = progress?.total_issues > 0 
    ? Math.round((progress.fixed_issues / progress.total_issues) * 100) 
    : 0;

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 md:p-12" data-testid="student-dashboard">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-['Manrope'] text-foreground">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">Track your progress and view feedback on your submissions</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-default" data-testid="stat-submissions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Submissions</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{progress?.total_submissions || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-issues">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Issues</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{progress?.total_issues || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-fixed">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Issues Fixed</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{progress?.fixed_issues || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-progress">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Resolution Rate</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{resolutionRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Feedback Ready - Large Card */}
          <Card className="card-default lg:col-span-2" data-testid="feedback-ready-card">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold font-['Manrope']">Feedback Ready</CardTitle>
                  <CardDescription>Review feedback from your marker</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => navigate('/student/assignments')}
                  data-testid="view-all-btn"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {feedbackReadySubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No feedback available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back later for your results</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {feedbackReadySubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                        onClick={() => navigate(`/student/feedback/${submission.id}`)}
                        data-testid={`submission-${submission.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{submission.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              Attempt {submission.attempt_number} • {submission.issues_count} issues
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(submission.status)}
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Progress Card */}
          <Card className="card-default" data-testid="progress-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold font-['Manrope']">Your Progress</CardTitle>
              <CardDescription>Issue resolution tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-medium">{resolutionRate}%</span>
                </div>
                <Progress value={resolutionRate} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">Fixed</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{progress?.fixed_issues || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs text-amber-700 font-medium">Open</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{progress?.open_issues || 0}</p>
                </div>
              </div>

              {Object.keys(progress?.issues_by_category || {}).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Issues by Category</p>
                  {Object.entries(progress?.issues_by_category || {}).slice(0, 5).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{category}</span>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                className="w-full rounded-full" 
                variant="outline"
                onClick={() => navigate('/student/assignments')}
                data-testid="submit-new-btn"
              >
                <Target className="w-4 h-4 mr-2" />
                Submit New Assignment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
