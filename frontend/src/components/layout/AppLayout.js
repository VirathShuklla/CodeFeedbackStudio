import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Code2, LogOut, ChevronDown, BarChart3, Award, BookOpen, Home } from 'lucide-react';

export const AppLayout = ({ children }) => {
  const { user, logout, isMarker, isStudent } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    return name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Clean & Minimal */}
      <header className="header-clean h-14 flex items-center px-6" data-testid="app-header">
        <Link to={isMarker ? '/marker' : '/student'} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold font-['Outfit'] hidden sm:inline">CodeFeedback</span>
        </Link>

        {/* Navigation Links */}
        <nav className="ml-8 flex items-center gap-1">
          {isMarker && (
            <>
              <Link to="/marker">
                <Button 
                  variant={isActive('/marker') ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="gap-2"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Courses</span>
                </Button>
              </Link>
              <Link to="/marker/analytics">
                <Button 
                  variant={isActive('/marker/analytics') ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </Button>
              </Link>
            </>
          )}
          
          {isStudent && (
            <>
              <Link to="/student">
                <Button 
                  variant={isActive('/student') ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Courses</span>
                </Button>
              </Link>
              <Link to="/student/analytics">
                <Button 
                  variant={isActive('/student/analytics') ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Progress</span>
                </Button>
              </Link>
              <Link to="/student/badges">
                <Button 
                  variant={isActive('/student/badges') ? 'secondary' : 'ghost'} 
                  size="sm"
                  className="gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Badges</span>
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* User Menu */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9 px-2" data-testid="user-menu-trigger">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                  {getInitials(user?.full_name)}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{user?.full_name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 text-destructive focus:text-destructive cursor-pointer" 
                onClick={handleLogout}
                data-testid="logout-menu-item"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="animate-fade-in">
        {children}
      </main>
    </div>
  );
};
