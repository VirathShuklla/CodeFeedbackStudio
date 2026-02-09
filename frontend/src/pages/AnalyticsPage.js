import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
  FileText, 
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from 'lucide-react';

const COLORS = ['hsl(220, 80%, 50%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(260, 60%, 55%)'];

export default function AnalyticsPage() {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const params = selectedCourse !== 'all' ? `?course_id=${selectedCourse}` : '';
        const response = await api().get(`/analytics/marker${params}`);
        setAnalytics(response.data);
      } catch (error) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [api, selectedCourse]);

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
        </div>
      </AppLayout>
    );
  }

  // Aggregate stats across courses or single course
  const courses = analytics?.courses || [];
  const totalSubmissions = courses.reduce((sum, c) => sum + c.total_submissions, 0);
  const totalPending = courses.reduce((sum, c) => sum + c.pending_reviews, 0);
  const totalCompleted = courses.reduce((sum, c) => sum + c.completed_reviews + c.no_issues_count, 0);
  
  // Calculate average turnaround
  const turnaroundValues = courses
    .filter(c => c.avg_turnaround_hours !== null)
    .map(c => c.avg_turnaround_hours);
  const avgTurnaround = turnaroundValues.length > 0 
    ? (turnaroundValues.reduce((a, b) => a + b, 0) / turnaroundValues.length).toFixed(1)
    : null;

  // Prepare chart data for submission status by course
  const courseStatusData = courses.map(c => ({
    name: c.course_name.length > 15 ? c.course_name.substring(0, 15) + '...' : c.course_name,
    fullName: c.course_name,
    pending: c.pending_reviews,
    inReview: c.in_review_count,
    completed: c.completed_reviews,
    noIssues: c.no_issues_count
  }));

  // Pie chart data for overall status
  const statusPieData = [
    { name: 'Pending', value: totalPending, color: 'hsl(215, 16%, 47%)' },
    { name: 'Completed', value: totalCompleted, color: 'hsl(142, 71%, 45%)' },
  ].filter(d => d.value > 0);

  return (
    <AppLayout>
      <div className="p-8 md:p-12" data-testid="analytics-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold font-['Manrope'] text-foreground">Analytics</h1>
            <p className="text-muted-foreground mt-1">Course-scoped review metrics and insights</p>
          </div>
          
          {/* Course Filter */}
          <div className="w-64">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger data-testid="course-filter">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.course_id} value={course.course_id}>
                    {course.course_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats - High Signal, Low Noise */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-default" data-testid="stat-total-feedback">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total Feedback Given</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.total_feedback_given || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-pending-reviews">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pending Reviews</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.total_pending_reviews || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-active-courses">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Active Courses</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{analytics?.active_courses || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-default" data-testid="stat-avg-turnaround">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Avg Turnaround</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {avgTurnaround ? `${avgTurnaround}h` : '—'}
                  </p>
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
          {/* Submissions by Course */}
          <Card className="card-default" data-testid="chart-by-course">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-['Manrope']">Submissions by Course</CardTitle>
              <CardDescription>Review status breakdown per course</CardDescription>
            </CardHeader>
            <CardContent>
              {courseStatusData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No course data available
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseStatusData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid hsl(214, 32%, 91%)',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name) => [value, name.charAt(0).toUpperCase() + name.slice(1)]}
                      />
                      <Legend />
                      <Bar dataKey="pending" name="Pending" stackId="a" fill="hsl(215, 16%, 70%)" />
                      <Bar dataKey="inReview" name="In Review" stackId="a" fill="hsl(38, 92%, 50%)" />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="hsl(220, 80%, 50%)" />
                      <Bar dataKey="noIssues" name="No Issues" stackId="a" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Review Status */}
          <Card className="card-default" data-testid="chart-overall-status">
            <CardHeader>
              <CardTitle className="text-lg font-semibold font-['Manrope']">Overall Review Status</CardTitle>
              <CardDescription>Completed vs pending reviews</CardDescription>
            </CardHeader>
            <CardContent>
              {statusPieData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No submissions yet
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-Course Details Table */}
        <Card className="card-default" data-testid="course-details-table">
          <CardHeader>
            <CardTitle className="text-lg font-semibold font-['Manrope']">Course Details</CardTitle>
            <CardDescription>Detailed metrics per course</CardDescription>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No courses with submissions yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Course</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Total</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Pending</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">In Review</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Completed</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">No Issues</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.course_id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{course.course_name}</td>
                        <td className="text-right py-3 px-4">{course.total_submissions}</td>
                        <td className="text-right py-3 px-4">
                          {course.pending_reviews > 0 ? (
                            <span className="text-amber-600 font-medium">{course.pending_reviews}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-4">{course.in_review_count}</td>
                        <td className="text-right py-3 px-4">{course.completed_reviews}</td>
                        <td className="text-right py-3 px-4">
                          {course.no_issues_count > 0 ? (
                            <span className="text-green-600 font-medium">{course.no_issues_count}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="text-right py-3 px-4">
                          {course.avg_turnaround_hours ? `${course.avg_turnaround_hours}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
