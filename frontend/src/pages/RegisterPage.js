import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { Code2, ArrowRight, GraduationCap, Users } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/public/courses`);
        setCourses(response.data || []);
      } catch (error) {
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const toggleCourse = (courseId) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (role === 'student' && selectedCourses.length === 0 && courses.length > 0) {
      toast.error('Please select at least one course');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(email, password, fullName, role, selectedCourses);
      toast.success('Account created!');
      const user = await login(email, password);
      navigate(user.role === 'marker' ? '/marker' : '/student');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" data-testid="register-page">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-foreground font-['Outfit']">CodeFeedback</span>
        </div>
        
        {/* Form Card */}
        <div className="card-clean p-8">
          <h1 className="text-2xl font-semibold text-center mb-2 font-['Outfit']">Create account</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Get started in seconds</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name</Label>
              <Input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                data-testid="register-name-input"
                className="input-clean h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email-input"
                className="input-clean h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                data-testid="register-password-input"
                className="input-clean h-11"
              />
            </div>
            
            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    role === 'student' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                  }`}
                  data-testid="role-student-btn"
                >
                  <GraduationCap className={`w-5 h-5 mx-auto mb-1 ${role === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${role === 'student' ? 'text-primary' : 'text-foreground'}`}>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('marker')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    role === 'marker' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/30'
                  }`}
                  data-testid="role-marker-btn"
                >
                  <Users className={`w-5 h-5 mx-auto mb-1 ${role === 'marker' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${role === 'marker' ? 'text-primary' : 'text-foreground'}`}>Marker</span>
                </button>
              </div>
            </div>
            
            {/* Course Selection for Students - Multi-select */}
            {role === 'student' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Your Courses</Label>
                {loadingCourses ? (
                  <div className="h-11 flex items-center text-sm text-muted-foreground">Loading...</div>
                ) : courses.length === 0 ? (
                  <p className="text-sm text-amber-600 p-3 bg-amber-50 rounded-lg">
                    No courses available. Contact your instructor.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3" data-testid="course-list">
                    {courses.map((course) => (
                      <div 
                        key={course.id} 
                        className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-md cursor-pointer"
                        onClick={() => toggleCourse(course.id)}
                      >
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={selectedCourses.includes(course.id)}
                          onCheckedChange={() => toggleCourse(course.id)}
                          data-testid={`course-checkbox-${course.id}`}
                        />
                        <label 
                          htmlFor={`course-${course.id}`} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          <span className="font-medium">
                            {course.code ? `${course.code} – ` : ''}{course.name}
                          </span>
                          {course.year && (
                            <span className="text-muted-foreground ml-1">({course.year})</span>
                          )}
                          <br />
                          <span className="text-xs text-muted-foreground">
                            Led by {course.leader_name}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedCourses.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-11 btn-primary"
              disabled={isLoading || (role === 'student' && courses.length === 0)}
              data-testid="register-submit-btn"
            >
              {isLoading ? 'Creating...' : 'Create account'}
              {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </form>
          
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
