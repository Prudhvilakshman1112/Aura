import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && api.isAuthenticated();

  // Check if user is already logged in on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (api.isAuthenticated()) {
        try {
          const response = await api.getUserProfile();
          if (response.status === 'success' && response.data) {
            setUser({
              id: response.data.id,
              name: response.data.name,
              email: response.data.email,
              profileImageUrl: response.data.profileImageUrl,
              createdAt: response.data.createdAt
            });
          }
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          api.logout();
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });
      if (response.status === 'success' && response.data) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await api.register({ name, email, password });
      if (response.status === 'success' && response.data) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    api.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    if (api.isAuthenticated()) {
      try {
        const response = await api.getUserProfile();
        if (response.status === 'success' && response.data) {
          setUser({
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            profileImageUrl: response.data.profileImageUrl,
            createdAt: response.data.createdAt
          });
        }
      } catch (error) {
        console.error('Failed to refresh user profile:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
