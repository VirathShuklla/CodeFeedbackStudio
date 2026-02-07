import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  FileText, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const COLORS = ['hsl(220, 80%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(260, 60%, 55%)'];

export default function AnalyticsPage() {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api().get('/analytics/marker');
        setAnalytics(response.data);
      } catch (error) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [api]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </AppLayout>
    );
  }

  // Prepare chart data
  const categoryData = Object.entries(analytics?.issues_by_category || {}).map(([name, value]) => ({
    name,
    value
  }));

  const severityData = Object.entries(analytics?.issues_by_severity || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const statusData = [
    { name: 'Pending', value: analytics?.pending_count || 0, color: 'hsl(215, 16%, 47%)' },
    { name: 'In Review', value: analytics?.in_review_count || 0, color: 'hsl(38, 92%, 50%)' },
    { name: 'Released', value: analytics?.feedback_released_count || 0, color: 'hsl(142, 71%, 45%)' },
  ];

  return (
    <AppLayout>
      <div className="p-8 md:p-12" data-testid="analytics-page">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-['Manrope'] text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Review workload and pedagogical insights</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-default" data-testid="stat-total-submissions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Submissions</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.total_submissions || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-total-issues">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Issues</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.total_issues || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-resolution-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Resolution Rate</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{(analytics?.resolution_rate || 0).toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-avg-review-time">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Avg Review Time</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.avg_review_time_hours || 0}h</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Submission Status Distribution */}
          <Card className="card-default" data-testid="chart-submission-status">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-['Manrope']">Submission Status</CardTitle>
              <CardDescription>Distribution of submissions by review status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Issues by Severity */}
          <Card className="card-default" data-testid="chart-severity">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-['Manrope']">Issues by Severity</CardTitle>
              <CardDescription>Distribution of issues by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={severityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid hsl(214, 32%, 91%)',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="value" fill="hsl(220, 80%, 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues by Category - Full Width */}
        <Card className="card-default" data-testid="chart-category">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-['Manrope']">Issues by Category</CardTitle>
            <CardDescription>Most common issue categories across all submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid hsl(214, 32%, 91%)',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
