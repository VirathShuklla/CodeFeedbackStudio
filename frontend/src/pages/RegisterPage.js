import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { Code2, ArrowRight, GraduationCap, Users, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [courseId, setCourseId] = useState('');
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  // Fetch available courses for student registration
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Public endpoint to list courses for registration
        const response = await axios.get(`${API_URL}/api/courses`, {
          headers: {} // No auth needed for listing
        });
        setCourses(response.data || []);
      } catch (error) {
        // If no courses exist yet, that's okay
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: students must select a course
    if (role === 'student' && !courseId && courses.length > 0) {
      toast.error('Please select your course/module');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await register(email, password, fullName, role, role === 'student' ? courseId : null);
      toast.success('Account created successfully!');
      // Auto login after registration
      const user = await login(email, password);
      navigate(user.role === 'marker' ? '/marker' : '/student');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="register-page">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-primary/5 to-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnptMCAyMGMtNC40MTggMC04LTMuNTgyLTgtOHMzLjU4Mi04IDgtOCA4IDMuNTgyIDggOC0zLjU4MiA4LTggOHoiIGZpbGw9IiMxOTUyRTYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-40" />
        
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground font-['Manrope']">CodeFeedback Studio</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight font-['Manrope']">
            Join the feedback<br />revolution
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Whether you're a teacher providing structured feedback or a student improving your code, we've got you covered.
          </p>
          
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50">
              <Users className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-semibold text-foreground">For Markers</h3>
              <p className="text-sm text-muted-foreground">Review code, annotate issues, track patterns</p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-white/50">
              <GraduationCap className="w-6 h-6 text-primary mb-2" />
              <h3 className="font-semibold text-foreground">For Students</h3>
              <p className="text-sm text-muted-foreground">Submit work, get feedback, improve skills</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Register Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md border-0 shadow-none lg:shadow-sm lg:border">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:hidden mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold font-['Manrope']">CodeFeedback Studio</span>
            </div>
            <CardTitle className="text-2xl font-bold font-['Manrope']">Create an account</CardTitle>
            <CardDescription>Get started with structured code feedback</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  data-testid="register-name-input"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="register-email-input"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="register-password-input"
                  className="h-11"
                />
              </div>
              
              <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup value={role} onValueChange={setRole} className="grid grid-cols-2 gap-4">
                  <Label
                    htmlFor="student"
                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all ${
                      role === 'student' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="student" id="student" className="sr-only" />
                    <GraduationCap className={`w-6 h-6 mb-2 ${role === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`font-medium ${role === 'student' ? 'text-primary' : 'text-foreground'}`}>Student</span>
                    <span className="text-xs text-muted-foreground">Submit & learn</span>
                  </Label>
                  <Label
                    htmlFor="marker"
                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-4 cursor-pointer transition-all ${
                      role === 'marker' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="marker" id="marker" className="sr-only" />
                    <Users className={`w-6 h-6 mb-2 ${role === 'marker' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`font-medium ${role === 'marker' ? 'text-primary' : 'text-foreground'}`}>Marker</span>
                    <span className="text-xs text-muted-foreground">Review & teach</span>
                  </Label>
                </RadioGroup>
              </div>
              
              {/* Course selection for students */}
              {role === 'student' && (
                <div className="space-y-2">
                  <Label htmlFor="course">Your Course / Module *</Label>
                  {loadingCourses ? (
                    <div className="h-11 flex items-center justify-center text-sm text-muted-foreground">
                      Loading courses...
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-700">
                        No courses available yet. Please contact your instructor to create a course first.
                      </div>
                    </div>
                  ) : (
                    <Select value={courseId} onValueChange={setCourseId}>
                      <SelectTrigger className="h-11" data-testid="course-select">
                        <SelectValue placeholder="Select your course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code ? `${course.code} - ` : ''}{course.name}
                            {course.year ? ` (${course.year})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-11 rounded-full font-medium"
                disabled={isLoading || (role === 'student' && courses.length === 0)}
                data-testid="register-submit-btn"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
                {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium" data-testid="login-link">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
