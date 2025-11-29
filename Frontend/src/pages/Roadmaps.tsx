import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  BookOpen, 
  Star, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronRight,
  Grid3X3,
  Trash2
} from "lucide-react";
import { api } from "@/lib/api";
import { RoadmapDetailView } from "@/components/roadmaps/RoadmapDetailView";

interface Module {
  name: string;
  completed: boolean;
  completedAt: string | null;
}

interface CareerPath {
  id: number;
  name: string;
  description: string;
  icon: string;
  difficulty: string;
  estimatedDuration: string;
  progress: number;
  modules: Module[];
  totalModules: number;
  completedModules: number;
  // Database fields for user career paths
  roadmap_id?: number;
  roadmap_name?: string;
  total_modules?: number;
  completed_modules?: number;
}

const Roadmaps = () => {
  const [templates, setTemplates] = useState<CareerPath[]>([]);
  const [userPaths, setUserPaths] = useState<CareerPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['All']));
  const [learningStreak, setLearningStreak] = useState(0);

  useEffect(() => {
    fetchRoadmapData();
  }, []);

  const fetchLearningStreak = async () => {
    try {
      const response = await api.getLearningStreak();
      if (response.status === 'success') {
        setLearningStreak(response.data?.streak || 0);
      }
    } catch (error) {
      console.error('Failed to fetch learning streak:', error);
    }
  };

  const fetchRoadmapData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch templates and user paths with proper headers
      const [templatesResponse, userPathsResponse] = await Promise.all([
        fetch('http://localhost:3001/api/roadmaps/templates', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/roadmaps/user-paths', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.data?.templates || templatesData.templates || []);
      }

      if (userPathsResponse.ok) {
        const userPathsData = await userPathsResponse.json();
        setUserPaths(userPathsData.data?.careerPaths || userPathsData.careerPaths || []);
      } else {
        // If user paths fail, try to initialize tables
        try {
          await fetch('http://localhost:3001/api/roadmaps/init-tables', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Retry fetching user paths
          const retryResponse = await fetch('http://localhost:3001/api/roadmaps/user-paths', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            setUserPaths(retryData.data || retryData || []);
          }
        } catch (initError) {
          console.error('Failed to initialize roadmap tables:', initError);
        }
      }
    } catch (error) {
      console.error('Failed to fetch roadmap data:', error);
    } finally {
      setIsLoading(false);
    }
    
    // Fetch learning streak
    await fetchLearningStreak();
  };


  const handleCloneTemplate = async (templateId: number) => {
    try {
      console.log('Starting roadmap selection for ID:', templateId);
      const response = await api.cloneRoadmapTemplate(templateId);
      
      if (response.status === 'success') {
        console.log('Roadmap selected successfully:', response.data);
        
        // Fetch the roadmap details with user progress
        const roadmapResponse = await fetch(`http://localhost:3001/api/roadmaps/roadmap/${templateId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (roadmapResponse.ok) {
          const roadmapData = await roadmapResponse.json();
          if (roadmapData.status === 'success') {
            console.log('Roadmap details fetched:', roadmapData.data.roadmap);
            setSelectedPath({
              ...roadmapData.data.roadmap,
              id: response.data.careerPathId // Use the career path ID for module updates
            });
          }
        }
        
        await fetchRoadmapData(); // Refresh data
      } else {
        console.error('Failed to select roadmap:', response);
        alert('Failed to start journey: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to clone template:', error);
      alert('Failed to start journey. Please try again.');
    }
  };

  const handleToggleModule = async (moduleName: string, completed: boolean) => {
    try {
      const response = await api.updateModule(selectedPath.id, moduleName, { completed });
      
      if (response.status === 'success') {
        // Update the selected path locally for immediate UI feedback
        if (selectedPath) {
          const updatedModules = selectedPath.modules.map((module: any) => 
            module.name === moduleName ? { ...module, completed, completedAt: completed ? new Date().toISOString() : null } : module
          );
          const completedCount = updatedModules.filter((m: any) => m.completed).length;
          const progress = Math.round((completedCount / updatedModules.length) * 100);
          
          setSelectedPath({
            ...selectedPath,
            modules: updatedModules,
            completedModules: completedCount,
            progress
          });
        }
        
        await fetchRoadmapData(); // Refresh data
        await fetchLearningStreak(); // Update streak after module completion
      }
    } catch (error) {
      console.error('Failed to update module:', error);
    }
  };

  const handleDeleteCareerPath = async (careerPathId: number, pathName: string) => {
    if (!confirm(`Are you sure you want to delete "${pathName}"?\n\nThis will permanently remove:\n• All your progress in this roadmap\n• All completed modules\n• All related learning data\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }

      // Use POST method to delete career path (avoids server restart requirement)
      console.log(`Attempting to delete career path ID: ${careerPathId}`);
      
      const response = await fetch(`http://localhost:3001/api/roadmaps/delete-career-path`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ careerPathId: careerPathId })
      });
      
      console.log(`Delete response status: ${response.status}`);

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Show success message
        alert(`"${pathName}" has been successfully deleted from your career paths.`);
        
        // Refresh the roadmap data to remove the deleted path
        await fetchRoadmapData();
        
        // If we're currently viewing the deleted path, go back to the main view
        if (selectedPath && selectedPath.id === careerPathId) {
          setSelectedPath(null);
        }
      } else {
        // Handle specific error messages from backend
        const errorMessage = data.message || 'Unknown error occurred';
        alert(`Failed to delete career path: ${errorMessage}`);
        console.error('Delete error:', data);
      }
    } catch (error) {
      console.error('Failed to delete career path:', error);
      alert('Network error: Failed to delete career path. Please check your connection and try again.');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const getFilteredTemplates = () => {
    let filtered = templates;
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category using the actual category field from roadmap data
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(template => 
        (template as any).category === selectedCategory
      );
    }
    
    return filtered;
  };

  // Get unique categories from templates for dynamic filtering
  const getAvailableCategories = () => {
    const categories = new Set(['All']);
    templates.forEach(template => {
      if ((template as any).category) {
        categories.add((template as any).category);
      }
    });
    return Array.from(categories);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {selectedPath ? null : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold gradient-career">Career Roadmaps</h1>
                <p className="text-muted-foreground mt-1">
                  Choose your learning path and track your progress
                </p>
              </div>
              
              {/* Learning Streak Display */}
              <div className="glass p-4 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-career flex items-center justify-center">
                    <span className="text-white font-bold text-sm">🔥</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold gradient-career">{learningStreak}</div>
                    <div className="text-xs text-muted-foreground">Day Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedPath ? (
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass p-6 rounded-xl animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-4"></div>
                      <div className="h-8 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* User's Active Paths Section */}
                  {userPaths.length > 0 && (
                    <div className="space-y-4 mb-8">
                      <h2 className="text-2xl font-bold text-foreground">Your Career Paths</h2>
                      {userPaths.map((path) => {
                        // Find the template data for this path
                        const template = templates.find(t => t.id === path.roadmap_id);
                        const pathData = {
                          ...path,
                          name: path.roadmap_name,
                          icon: template?.icon || '📚',
                          difficulty: template?.difficulty || 'Unknown',
                          estimatedDuration: template?.estimatedDuration || 'Unknown',
                          progress: path.progress || 0
                        };
                        
                        return (
                          <div 
                            key={path.id}
                            className="cursor-pointer"
                            onClick={async () => {
                              // Fetch roadmap details with user progress
                              try {
                                const response = await fetch(`http://localhost:3001/api/roadmaps/roadmap/${path.roadmap_id}`, {
                                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                });
                                if (response.ok) {
                                  const data = await response.json();
                                  if (data.status === 'success') {
                                    setSelectedPath({
                                      ...data.data.roadmap,
                                      id: path.id // Use career path ID for module updates
                                    });
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to fetch roadmap details:', error);
                              }
                            }}
                          >
                            <DashboardCard 
                              title={`${pathData.icon} ${pathData.name}`}
                              variant="career"
                              className="ring-2 ring-career/50"
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-gradient-career text-white">
                                    <Star className="w-3 h-3 mr-1" />
                                    Active
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await handleDeleteCareerPath(path.id, pathData.name);
                                    }}
                                    title="Delete Career Path"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span>Progress</span>
                                    <span className="font-medium">
                                      {path.completed_modules || 0}/
                                      {path.total_modules || 0} modules
                                    </span>
                                  </div>
                                  <Progress value={pathData.progress} className="h-2" />
                                </div>

                                <div className="flex items-center space-x-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${getDifficultyColor(pathData.difficulty)}`} />
                                  <span className="text-muted-foreground">{pathData.difficulty}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">{pathData.estimatedDuration}</span>
                                </div>

                                <Button 
                                  variant="secondary"
                                  size="sm" 
                                  className="w-full"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    // Fetch roadmap details with user progress
                                    try {
                                      const response = await fetch(`http://localhost:3001/api/roadmaps/roadmap/${path.roadmap_id}`, {
                                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                                      });
                                      if (response.ok) {
                                        const data = await response.json();
                                        if (data.status === 'success') {
                                          setSelectedPath({
                                            ...data.data.roadmap,
                                            id: path.id // Use career path ID for module updates
                                          });
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch roadmap details:', error);
                                    }
                                  }}
                                >
                                  Continue Learning
                                </Button>
                              </div>
                            </DashboardCard>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Available Templates Section */}
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-foreground">Available Templates</h2>
                    
                    {/* Search and Filter Controls */}
                    <div className="space-y-4 mb-6">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search career paths..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 glass rounded-lg border border-border/50 focus:border-career/50 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                          >
                            <Grid3X3 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={viewMode === 'list' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setViewMode('list')}
                          >
                            <List className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Category Filter */}
                      <div className="flex flex-wrap gap-2">
                        {getAvailableCategories().map((category) => (
                          <Button
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category)}
                            className="text-xs"
                          >
                            {category}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Available Templates */}
                    {Array.isArray(templates) && getFilteredTemplates().map((template) => (
                      <DashboardCard 
                        key={template.id}
                        title={`${template.icon} ${template.name}`}
                        variant="default"
                      >
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {template.description}
                          </p>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${getDifficultyColor(template.difficulty)}`} />
                            <span className="text-muted-foreground">{template.difficulty}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{template.estimatedDuration}</span>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {(template as any).modules?.length || 0} learning modules
                          </div>

                          <Button 
                            variant="outline"
                            size="sm" 
                            className="w-full"
                            onClick={() => handleCloneTemplate(template.id)}
                          >
                            Start Journey
                          </Button>
                        </div>
                      </DashboardCard>
                    ))}
                    
                    {/* Show message if no templates match filter */}
                    {Array.isArray(templates) && getFilteredTemplates().length === 0 && (
                      <div className="text-center py-8 glass rounded-xl">
                        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <h3 className="text-lg font-semibold mb-2">No roadmaps found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm ? `No roadmaps match "${searchTerm}"` : `No roadmaps in "${selectedCategory}" category`}
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('All');
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPath(null)}
                className="flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to All Paths</span>
              </Button>
              <div className="text-sm text-muted-foreground">
                Viewing: <span className="font-medium">{selectedPath.name}</span>
              </div>
            </div>
            
            {/* Detailed Roadmap View */}
            <RoadmapDetailView 
              selectedPath={selectedPath}
              onToggleModule={handleToggleModule}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Roadmaps;
