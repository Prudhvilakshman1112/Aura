const API_BASE_URL = 'http://localhost:3001/api';

// Types for API responses
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

export interface User {
  id: number;
  name: string;
  email: string;
  profileImageUrl?: string;
  createdAt: string;
}

export interface UserProfile {
  linkedinHandle?: string;
  leetcodeHandle?: string;
  codechefHandle?: string;
  codeforcesHandle?: string;
  heightCm?: number;
  weightKg?: number;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  studyDomain?: string;
  studyYear?: number;
  skills?: string[];
}

export interface CodingStats {
  leetcode: number;
  codechef: number;
  codeforces: number;
  total: number;
  contestData?: {
    codeforcesContestSolved: number;
    codechefContestsParticipated: number;
  };
  currentStreak?: number;
  lastUpdated?: string;
}

export interface DashboardData {
  userName: string;
  codingStats: CodingStats;
  monthlyProgress: {
    current: number;
    goal: number;
    percentage: number;
  };
  careerPercentage: number;
  recentActivity: Array<{
    date: string;
    problemsSolved: number;
  }>;
}

export interface TrackerData {
  currentStreak: number;
  bestStreak: number;
  activeDaysThisMonth: number;
  totalProblems: number;
  contributionData: Array<{
    date: string;
    count: number;
  }>;
}

// API utility functions
class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('🔐 Auth token found:', !!token);
    console.log('🔐 Token preview:', token ? token.substring(0, 20) + '...' : 'None');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    // Normalize response format - convert backend 'success' field to 'status'
    if (data.success === true && !data.status) {
      return {
        status: 'success' as const,
        message: data.message || 'Success',
        data: data.stats || data.data || data
      };
    }
    
    if (data.success === false && !data.status) {
      return {
        status: 'error' as const,
        message: data.message || 'Error',
        data: data.data || data
      };
    }
    
    return data;
  }

  // Authentication methods
  async register(userData: { name: string; email: string; password: string }): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const result = await this.handleResponse<{ token: string; user: User }>(response);
    
    if (result.data?.token) {
      localStorage.setItem('authToken', result.data.token);
    }
    
    return result;
  }

  async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; userName: string; user: User }>> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    const result = await this.handleResponse<{ token: string; userName: string; user: User }>(response);
    
    if (result.data?.token) {
      localStorage.setItem('authToken', result.data.token);
    }
    
    return result;
  }

  logout(): void {
    localStorage.removeItem('authToken');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  // User profile methods
  async getUserProfile(): Promise<ApiResponse<User & { profile: UserProfile }>> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async updateUserProfile(profileData: Partial<UserProfile & { name?: string }>): Promise<ApiResponse> {
    console.log('🚀 API: Sending profile update request');
    console.log('Data:', profileData);
    console.log('Headers:', this.getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
    
    console.log('📡 API: Response status:', response.status);
    const result = await this.handleResponse(response);
    console.log('📡 API: Response data:', result);
    
    return result;
  }

  async updatePhysicalMetrics(data: any) {
    console.log('API: Updating physical metrics:', data);
    const response = await fetch(`${API_BASE_URL}/physical/metrics`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    console.log('API: Physical metrics update response:', response);
    return this.handleResponse(response);
  }

  // Activity tracking methods
  async getMonthlyGoals(year: number, month: number) {
    console.log(`API: Fetching monthly goals for ${year}-${month}`);
    const response = await fetch(`${API_BASE_URL}/activity/goals/${year}/${month}`, {
      headers: this.getAuthHeaders()
    });
    console.log('API: Monthly goals response:', response);
    return this.handleResponse(response);
  }

  async setMonthlyGoals(goalData: any) {
    console.log('API: Setting monthly goals:', goalData);
    const response = await fetch(`${API_BASE_URL}/activity/goals`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goalData)
    });
    console.log('API: Set monthly goals response:', response);
    return this.handleResponse(response);
  }

  async getDailyActivity(date: string) {
    console.log(`API: Fetching daily activity for ${date}`);
    const response = await fetch(`${API_BASE_URL}/activity/daily/${date}`, {
      headers: this.getAuthHeaders()
    });
    console.log('API: Daily activity response:', response);
    return this.handleResponse(response);
  }

  async updateDailyActivity(activityData: any) {
    console.log('API: Updating daily activity:', activityData);
    const response = await fetch(`${API_BASE_URL}/activity/daily`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(activityData)
    });
    console.log('API: Update daily activity response:', response);
    return this.handleResponse(response);
  }

  async getMonthlyProgress(year: number, month: number) {
    console.log(`API: Fetching monthly progress for ${year}-${month}`);
    const response = await fetch(`${API_BASE_URL}/activity/progress/${year}/${month}`, {
      headers: this.getAuthHeaders()
    });
    console.log('API: Monthly progress response:', response);
    return this.handleResponse(response);
  }

  async getMonthlyActivityRange(year: number, month: number) {
    console.log(`API: Fetching monthly activity range for ${year}-${month}`);
    const response = await fetch(`${API_BASE_URL}/activity/monthly-range/${year}/${month}`, {
      headers: this.getAuthHeaders()
    });
    console.log('API: Monthly activity range response:', response);
    return this.handleResponse(response);
  }

  async syncActivityFromStats() {
    console.log('API: Syncing activity from coding stats');
    const response = await fetch(`${API_BASE_URL}/activity/sync-from-stats`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    console.log('API: Sync activity response:', response);
    return this.handleResponse(response);
  }

  // Streak tracking methods
  async getCurrentStreak() {
    console.log('API: Fetching current streak');
    const response = await fetch(`${API_BASE_URL}/activity/streak/current`, {
      headers: this.getAuthHeaders()
    });
    console.log('API: Current streak response:', response);
    return this.handleResponse(response);
  }

  async getStreakHistory(days: number = 30) {
    console.log(`API: Fetching ${days} days streak history`);
    const response = await fetch(`${API_BASE_URL}/activity/streak/history/${days}`, {
      headers: this.getAuthHeaders()
    });
    console.log('API: Streak history response:', response);
    return this.handleResponse(response);
  }

  async updateStreakTracking() {
    console.log('API: Updating streak tracking');
    const response = await fetch(`${API_BASE_URL}/activity/update-streak`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    console.log('API: Update streak response:', response);
    return this.handleResponse(response);
  }

  async syncCodingStats() {
    console.log('API: Syncing coding stats only');
    const response = await fetch(`${API_BASE_URL}/activity/sync-coding`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    console.log('API: Sync coding stats response:', response);
    return this.handleResponse(response);
  }

  async syncCareerProgress() {
    console.log('API: Syncing career progress only');
    const response = await fetch(`${API_BASE_URL}/activity/sync-career`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    console.log('API: Sync career progress response:', response);
    return this.handleResponse(response);
  }

  // Dashboard methods
  async getDashboardData(): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`, {
        headers: this.getAuthHeaders()
      });
      
      return this.handleResponse(response);
    } catch (error) {
      throw error;
    }
  }

  // Tracker methods
  async getTrackerData(): Promise<ApiResponse<TrackerData>> {
    const response = await fetch(`${API_BASE_URL}/tracker`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Goals methods
  async getGoals(): Promise<ApiResponse<{ monthlyCodingGoal: number; dailyStudyGoalMinutes: number }>> {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async updateGoals(goals: { monthly_coding_goal?: number; daily_study_goal_minutes?: number }): Promise<ApiResponse> {
    const response = await fetch(`${API_BASE_URL}/goals`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goals)
    });
    
    return this.handleResponse(response);
  }

  // Scraping methods
  async updateCodingStats(): Promise<ApiResponse<{ newStats: CodingStats; differences: any; lastUpdated: string }>> {
    console.log('🌐 API: Making request to', `${API_BASE_URL}/scrape/update`);
    console.log('🔐 API: Using headers:', this.getAuthHeaders());
    
    const response = await fetch(`${API_BASE_URL}/scrape/update`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    console.log('📡 API: Response status:', response.status);
    console.log('📡 API: Response ok:', response.ok);
    
    const result = await this.handleResponse<{ newStats: CodingStats; differences: any; lastUpdated: string }>(response);
    console.log('📦 API: Final result:', result);
    
    return result;
  }

  // Physical metrics methods
  async getPhysicalMetrics(): Promise<ApiResponse<{
    height_cm?: number;
    weight_kg?: number;
    age?: number;
    gender?: string;
    bmi?: number;
    bmiCategory?: string;
  }>> {
    const response = await fetch(`${API_BASE_URL}/physical/metrics`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async updatePhysicalMetricsData(data: {
    height_cm?: number;
    weight_kg?: number;
    age?: number;
    gender?: string;
  }): Promise<ApiResponse<{
    height_cm?: number;
    weight_kg?: number;
    age?: number;
    gender?: string;
    bmi?: number;
    bmiCategory?: string;
  }>> {
    const response = await fetch(`${API_BASE_URL}/physical/metrics`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  // Roadmap methods
  async getRoadmapTemplates(): Promise<ApiResponse<{ templates: any[] }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/templates`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getUserCareerPaths(): Promise<ApiResponse<{ careerPaths: any[] }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/user-paths`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getCurrentLearningPath(): Promise<ApiResponse<{ currentPath: any }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/current-learning`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async cloneRoadmapTemplate(templateId: number): Promise<ApiResponse<{ careerPathId: number; message: string }>> {
    const headers = this.getAuthHeaders();
    console.log('Select roadmap API call - Headers:', headers);
    console.log('Select roadmap API call - Roadmap ID:', templateId);
    
    const response = await fetch(`${API_BASE_URL}/roadmaps/select-roadmap`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ roadmapId: templateId })
    });
    
    console.log('Select roadmap API response status:', response.status);
    return this.handleResponse(response);
  }

  async updateMilestone(milestoneId: number, data: { completed: boolean }): Promise<ApiResponse<{ milestone: any }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/milestone/${milestoneId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  async updateModule(careerPathId: number, moduleName: string, data: { completed: boolean }): Promise<ApiResponse<{ module: any }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/module/${careerPathId}/${encodeURIComponent(moduleName)}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    return this.handleResponse(response);
  }

  async seedRoadmapTemplates(): Promise<ApiResponse<{ message: string; count: number }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/seed-templates`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async getLearningStreak(): Promise<ApiResponse<{ streak: number }>> {
    const response = await fetch(`${API_BASE_URL}/roadmaps/learning-streak`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  // Daily tracking methods
  async getTodayProgress(): Promise<ApiResponse<{
    tracking_date: string;
    daily_leetcode_solved: number;
    daily_codechef_solved: number;
    daily_codeforces_solved: number;
    total_daily_solved: number;
  }>> {
    const response = await fetch(`${API_BASE_URL}/daily-tracking/today`, {
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }

  async trackTodayProgress(): Promise<ApiResponse<any>> {
    const response = await fetch(`${API_BASE_URL}/daily-tracking/track-today`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    
    return this.handleResponse(response);
  }


}

export { ApiClient };
export const api = new ApiClient();
