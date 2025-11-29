import { useState, useEffect } from 'react';
import { api, DashboardData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchDashboardData = async (forceRefresh = false) => {
    if (!isAuthenticated) return;
    
    try {
      if (forceRefresh || !data) {
        setIsLoading(true);
      }
      setError(null);
      
      const response = await api.getDashboardData();
      
      if (response.status === 'success' && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchDashboardData(true);
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Listen for profile updates to refresh dashboard data
    const handleProfileUpdate = (event: CustomEvent) => {
      const { codingHandlesUpdated, physicalMetricsUpdated } = event.detail;
      
      // Refresh dashboard data when profile is updated
      setTimeout(() => {
        fetchDashboardData();
      }, 1000); // Small delay to ensure backend has processed the updates
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [isAuthenticated]);

  return {
    data,
    isLoading,
    error,
    refreshData
  };
};
