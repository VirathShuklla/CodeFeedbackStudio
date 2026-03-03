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

  const register = async (email, password, fullName, role, courseIds = []) => {
    const payload = {
      email,
      password,
      full_name: fullName,
      role,
      course_ids: role === 'student' ? courseIds : []
    };
    const response = await axios.post(`${API_URL}/api/auth/register`, payload);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Refresh user data
  const refreshUser = async () => {
    if (token) {
      try {
        const response = await api().get('/auth/me');
        setUser(response.data);
        return response.data;
      } catch (error) {
        console.error('Refresh user error:', error);
      }
    }
    return null;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    api,
    refreshUser,
    isStudent: user?.role === 'student',
    isMarker: user?.role === 'marker' || user?.role === 'moderator' || user?.role === 'module_leader',
    isModerator: user?.role === 'moderator' || user?.role === 'module_leader',
    isModuleLeader: user?.role === 'module_leader'
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
