import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Users,
  TrendingUp,
  Eye
} from 'lucide-react';

export default function MarkerDashboard() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subsRes, analyticsRes] = await Promise.all([
          api().get('/submissions'),
          api().get('/analytics/marker')
        ]);
        setSubmissions(subsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (error) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [api]);

  const pendingSubmissions = submissions.filter(s => s.status === 'pending');
  const inReviewSubmissions = submissions.filter(s => s.status === 'in_review');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="badge-pending">Pending</Badge>;
      case 'in_review':
        return <Badge variant="secondary" className="badge-review">In Review</Badge>;
      case 'feedback_released':
        return <Badge variant="secondary" className="badge-fixed">Released</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
      <div className="p-8 md:p-12" data-testid="marker-dashboard">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-['Manrope'] text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your review workload and metrics</p>
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-default" data-testid="stat-pending">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending Review</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.pending_count || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-in-review">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">In Progress</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.in_review_count || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-released">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Feedback Released</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.feedback_released_count || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-resolution">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Resolution Rate</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{(analytics?.resolution_rate || 0).toFixed(0)}%</p>
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
          {/* Pending Submissions - Large Card */}
          <Card className="card-default lg:col-span-2" data-testid="pending-submissions-card">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold font-['Manrope']">Pending Submissions</CardTitle>
                  <CardDescription>Submissions waiting for your review</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => navigate('/marker/assignments')}
                  data-testid="view-all-assignments-btn"
                >
                  View all <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingSubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No pending submissions</p>
                  <p className="text-sm text-muted-foreground mt-1">All caught up!</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {pendingSubmissions.slice(0, 10).map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                        onClick={() => navigate(`/marker/review/${submission.id}`)}
                        data-testid={`submission-${submission.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{submission.student_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Attempt {submission.attempt_number} • {submission.filename}
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

          {/* Quick Stats Card */}
          <Card className="card-default" data-testid="quick-stats-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold font-['Manrope']">Issue Overview</CardTitle>
              <CardDescription>Feedback statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Issues</span>
                  <span className="font-semibold text-foreground">{analytics?.total_issues || 0}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">By Severity</p>
                {Object.entries(analytics?.issues_by_severity || {}).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        severity === 'critical' ? 'bg-red-500' :
                        severity === 'moderate' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-sm capitalize">{severity}</span>
                    </div>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-muted-foreground">By Category</p>
                {Object.entries(analytics?.issues_by_category || {}).slice(0, 5).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{category}</span>
                    <Badge variant="secondary" className="bg-primary/10 text-primary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
