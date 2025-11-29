import { useState, useEffect } from 'react';
import { api, TrackerData } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export const useTracker = () => {
  const [data, setData] = useState<TrackerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const fetchTrackerData = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getTrackerData();
      
      if (response.status === 'success' && response.data) {
        setData(response.data);
      } else {
        setError(response.message || 'Failed to fetch tracker data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tracker data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    fetchTrackerData();
  };

  useEffect(() => {
    fetchTrackerData();
  }, [isAuthenticated]);

  return {
    data,
    isLoading,
    error,
    refreshData
  };
};
