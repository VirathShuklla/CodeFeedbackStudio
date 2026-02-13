import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Users,
  TrendingUp
} from 'lucide-react';

export default function MarkerAnalyticsPage() {
  const { api } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [api, selectedCourseId]);

  const fetchData = async () => {
    try {
      const [coursesRes, analyticsRes] = await Promise.all([
        api().get('/courses'),
        api().get(`/analytics/marker${selectedCourseId !== 'all' ? `?course_id=${selectedCourseId}` : ''}`)
      ]);
      setCourses(coursesRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-6 py-8" data-testid="marker-analytics-page">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold font-['Outfit']">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Course performance and review statistics
            </p>
          </div>
          
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-48" data-testid="course-filter">
              <SelectValue placeholder="All Courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code || course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card-clean p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold font-['Outfit']">{analytics?.total_pending_reviews || 0}</p>
            <p className="text-sm text-muted-foreground">Pending Reviews</p>
          </div>
          
          <div className="card-clean p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold font-['Outfit']">{analytics?.total_feedback_given || 0}</p>
            <p className="text-sm text-muted-foreground">Feedback Given</p>
          </div>
          
          <div className="card-clean p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold font-['Outfit']">{analytics?.active_courses || 0}</p>
            <p className="text-sm text-muted-foreground">Active Courses</p>
          </div>
          
          <div className="card-clean p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-semibold font-['Outfit']">
              {analytics?.courses?.reduce((sum, c) => sum + c.total_submissions, 0) || 0}
            </p>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </div>
        </div>

        {/* Per-Course Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold font-['Outfit'] mb-4">Course Breakdown</h2>
          
          {analytics?.courses?.length === 0 ? (
            <div className="card-clean p-8 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No course data yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics?.courses?.map((course) => (
                <div key={course.course_id} className="card-clean p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">{course.course_name}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{course.total_students} students</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-xl font-semibold">{course.total_submissions}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-amber-600">{course.pending_reviews}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-blue-600">{course.in_review_count}</p>
                      <p className="text-xs text-muted-foreground">In Review</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-emerald-600">{course.completed_reviews}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-purple-600">{course.no_issues_count}</p>
                      <p className="text-xs text-muted-foreground">No Issues</p>
                    </div>
                  </div>
                  
                  {course.avg_turnaround_hours && (
                    <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
                      Average turnaround: <span className="font-medium text-foreground">{course.avg_turnaround_hours} hours</span>
                    </div>
                  )}
                  
                  {/* Most Common Issues */}
                  {course.most_common_issues?.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Common Issues</p>
                      <div className="flex flex-wrap gap-2">
                        {course.most_common_issues.map((issue, idx) => (
                          <span 
                            key={idx}
                            className="px-2 py-1 bg-slate-100 rounded text-xs"
                          >
                            {issue.category} ({issue.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collaborator Activity (for leaders) */}
        {analytics?.collaborator_activity?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold font-['Outfit'] mb-4">Collaborator Activity</h2>
            <div className="card-clean overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Collaborator</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Course</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Issues Created</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.collaborator_activity.map((activity, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-3 text-sm">{activity.collaborator_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{activity.course_name}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{activity.issues_created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
