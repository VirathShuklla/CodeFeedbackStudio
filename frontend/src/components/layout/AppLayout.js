import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { 
  Code2, 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  LogOut,
  User,
  ChevronDown
} from 'lucide-react';

export const AppLayout = ({ children }) => {
  const { user, logout, isMarker } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = isMarker
    ? [
        { path: '/marker', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/marker/assignments', label: 'Assignments', icon: FileText },
        { path: '/marker/analytics', label: 'Analytics', icon: BarChart3 },
      ]
    : [
        { path: '/student', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/student/assignments', label: 'Assignments', icon: FileText },
      ];

  const getInitials = (name) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-header h-16 flex items-center px-6" data-testid="app-header">
        <div className="flex items-center gap-3">
          <Link to={isMarker ? '/marker' : '/student'} className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold font-['Manrope'] hidden sm:inline">CodeFeedback Studio</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 ml-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`gap-2 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2 pr-3" data-testid="user-menu-trigger">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(user?.full_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium">{user?.full_name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">
                  Role: {user?.role}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" data-testid="profile-menu-item">
                <User className="w-4 h-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="gap-2 text-destructive focus:text-destructive" 
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
