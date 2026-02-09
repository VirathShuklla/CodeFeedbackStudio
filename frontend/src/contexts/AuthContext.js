import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const api = useCallback(() => {
    const instance = axios.create({
      baseURL: `${API_URL}/api`,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return instance;
  }, [token]);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api().get('/auth/me');
          setUser(response.data);
        } catch (error) {
          console.error('Auth init error:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token, api]);

  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, fullName, role, courseId = null) => {
    const payload = {
      email,
      password,
      full_name: fullName,
      role
    };
    // Students must have a course_id
    if (role === 'student' && courseId) {
      payload.course_id = courseId;
    }
    const response = await axios.post(`${API_URL}/api/auth/register`, payload);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Fetch courses (public for registration)
  const fetchCoursesPublic = async () => {
    // This needs a token, so we use a workaround for registration
    // Courses are fetched after a temporary marker creates them
    // For now, we'll need to fetch without auth or handle differently
    try {
      const response = await axios.get(`${API_URL}/api/courses`);
      return response.data;
    } catch {
      return [];
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    api,
    fetchCoursesPublic,
    isMarker: user?.role === 'marker',
    isStudent: user?.role === 'student'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
