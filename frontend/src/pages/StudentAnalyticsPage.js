import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Award,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function StudentAnalyticsPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [api]);

  const fetchData = async () => {
    try {
      const response = await api().get('/analytics/student');
      setAnalytics(response.data);
      if (response.data.courses?.length > 0 && !selectedCourseId) {
        setSelectedCourseId(response.data.courses[0].course_id);
      }
    } catch (error) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourse = analytics?.courses?.find(c => c.course_id === selectedCourseId);

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
      <div className="max-w-4xl mx-auto px-6 py-8" data-testid="student-analytics-page">
        {/* Header with XP/Level */}
        <div className="card-clean p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{analytics?.level || 1}</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold font-['Outfit']">{analytics?.level_title || 'Novice Coder'}</h1>
                <p className="text-sm text-muted-foreground">{analytics?.total_xp || 0} XP</p>
              </div>
            </div>
            <Button onClick={() => navigate('/student/badges')} variant="outline" className="gap-2">
              <Award className="w-4 h-4" /> View Badges
            </Button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="card-clean p-4 text-center">
            <FileText className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xl font-semibold">{analytics?.overall_stats?.total_submissions || 0}</p>
            <p className="text-xs text-muted-foreground">Submissions</p>
          </div>
          <div className="card-clean p-4 text-center">
            <AlertCircle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-xl font-semibold">{analytics?.overall_stats?.total_issues || 0}</p>
            <p className="text-xs text-muted-foreground">Total Issues</p>
          </div>
          <div className="card-clean p-4 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-xl font-semibold">{analytics?.overall_stats?.fixed_issues || 0}</p>
            <p className="text-xs text-muted-foreground">Fixed</p>
          </div>
          <div className="card-clean p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-semibold">{analytics?.overall_stats?.fix_rate || 0}%</p>
            <p className="text-xs text-muted-foreground">Fix Rate</p>
          </div>
        </div>

        {/* Course-specific Analytics */}
        {analytics?.courses?.length > 0 && (
          <>
            <Tabs value={selectedCourseId} onValueChange={setSelectedCourseId} className="mb-6">
              <TabsList>
                {analytics.courses.map((course) => (
                  <TabsTrigger key={course.course_id} value={course.course_id}>
                    {course.course_name.length > 15 ? course.course_name.slice(0, 15) + '...' : course.course_name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {selectedCourse && (
              <div className="space-y-6">
                {/* Course Progress */}
                <div className="card-clean p-5">
                  <h3 className="font-medium mb-4">{selectedCourse.course_name}</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Assignments Completed</span>
                        <span className="font-medium">{selectedCourse.assignments_completed}/{selectedCourse.total_assignments}</span>
                      </div>
                      <Progress value={(selectedCourse.assignments_completed / selectedCourse.total_assignments) * 100 || 0} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Issues Fixed</span>
                        <span className="font-medium">{selectedCourse.fixed_issues}/{selectedCourse.total_issues}</span>
                      </div>
                      <Progress 
                        value={(selectedCourse.fixed_issues / selectedCourse.total_issues) * 100 || 0} 
                        className="bg-emerald-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Issues by Category */}
                {Object.keys(selectedCourse.issues_by_category || {}).length > 0 && (
                  <div className="card-clean p-5">
                    <h3 className="font-medium mb-4">Issues by Category</h3>
                    <div className="space-y-3">
                      {Object.entries(selectedCourse.issues_by_category).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className="text-sm">{category}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ 
                                  width: `${(count / Math.max(...Object.values(selectedCourse.issues_by_category))) * 100}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvement Trend */}
                {selectedCourse.improvement_trend?.length > 0 && (
                  <div className="card-clean p-5">
                    <h3 className="font-medium mb-4">Submission History</h3>
                    <div className="space-y-2">
                      {selectedCourse.improvement_trend.map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium">Attempt {item.attempt_number}</span>
                            {item.status === 'no_issues' ? (
                              <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                No Issues
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {item.total_issues} issues
                              </span>
                            )}
                          </div>
                          <div className="text-sm">
                            <span className="text-emerald-600">{item.fixed_issues} fixed</span>
                            {item.total_issues - item.fixed_issues > 0 && (
                              <span className="text-muted-foreground"> / {item.total_issues - item.fixed_issues} open</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {analytics?.courses?.length === 0 && (
          <div className="card-clean p-12 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No course data yet</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Enroll in courses and submit assignments to see your progress
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
