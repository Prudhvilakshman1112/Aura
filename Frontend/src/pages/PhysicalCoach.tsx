import React, { useState, useRef } from 'react';
import { Layout } from "@/components/Layout";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { PhysicalMetrics } from "@/components/dashboard/PhysicalMetrics";
import HealthChatBoard from "@/components/HealthChatBoard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Heart, 
  Apple, 
  Dumbbell, 
  Droplets,
  Clock,
  Camera,
  Calendar,
  MessageCircle,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  Crown,
  X
} from "lucide-react";

const PhysicalCoach = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [foodAnalysisResult, setFoodAnalysisResult] = useState<any>(null);
  const [dietPlan, setDietPlan] = useState<any>(null);
  const [exercisePlan, setExercisePlan] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);
  const [isGeneratingExercise, setIsGeneratingExercise] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeFoodImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('foodImage', selectedImage);

      const response = await fetch('http://localhost:3001/api/physical-coach/food-analysis', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setFoodAnalysisResult(data.data);
      } else {
        setError(data.error || 'Failed to analyze food image');
      }
    } catch (error) {
      console.error('Food analysis error:', error);
      setError('Failed to analyze food image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateDietPlan = async () => {
    setIsGeneratingDiet(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/physical-coach/diet-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          activity_level: 'moderate',
          dietary_preferences: [],
          health_goals: []
        })
      });

      const data = await response.json();

      if (data.success) {
        setDietPlan(data.data);
      } else {
        setError(data.error || 'Failed to generate diet plan');
      }
    } catch (error) {
      console.error('Diet plan generation error:', error);
      setError('Failed to generate diet plan. Please try again.');
    } finally {
      setIsGeneratingDiet(false);
    }
  };

  const generateExercisePlan = async () => {
    setIsGeneratingExercise(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/physical-coach/exercise-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fitness_level: 'beginner',
          available_time: '30',
          equipment_available: [],
          fitness_goals: []
        })
      });

      const data = await response.json();

      if (data.success) {
        setExercisePlan(data.data);
      } else {
        setError(data.error || 'Failed to generate exercise plan');
      }
    } catch (error) {
      console.error('Exercise plan generation error:', error);
      setError('Failed to generate exercise plan. Please try again.');
    } finally {
      setIsGeneratingExercise(false);
    }
  };

  const handleConnectTrainer = (trainerName: string) => {
    setShowPremiumPopup(true);
  };

  const PremiumPopup = () => (
    <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300 ${showPremiumPopup ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 transform transition-all duration-300 ${showPremiumPopup ? 'scale-100' : 'scale-95'}`}>
        <div className="text-center space-y-6">
          {/* Close button */}
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPremiumPopup(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Premium icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Crown className="w-10 h-10 text-white" />
          </div>
          
          {/* Title and message */}
          <div className="space-y-3">
            <h3 className="text-2xl font-bold gradient-physical">Premium Feature</h3>
            <p className="text-muted-foreground">
              You need to upgrade to Premium version to access personal trainer connections and get personalized coaching sessions.
            </p>
          </div>
          
          {/* Premium benefits */}
          <div className="text-left space-y-2 bg-gradient-to-br from-physical/10 to-physical/5 p-4 rounded-xl">
            <h4 className="font-semibold text-physical mb-2">Premium Benefits:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Direct access to certified trainers</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Personalized workout plans</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>1-on-1 video coaching sessions</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Priority support and guidance</span>
              </li>
            </ul>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPremiumPopup(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1 bg-gradient-physical hover:opacity-90"
              onClick={() => {
                setShowPremiumPopup(false);
                // Here you can add navigation to premium upgrade page
                console.log('Redirecting to premium upgrade...');
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-fade-in">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-physical flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold gradient-physical">Physical Wellness Coach</h1>
              <p className="text-muted-foreground">Complete physical health management for optimal performance</p>
            </div>
          </div>
        </div>

        {/* Three Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Food Analysis Section */}
          <DashboardCard title="🍎 Food Analysis" variant="physical">
            <div className="space-y-4">
              <div className="text-center">
                <Camera className="w-12 h-12 mx-auto mb-3 text-physical" />
                <h3 className="font-bold text-lg mb-2">Snap & Analyze</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a photo of your food to get instant nutritional analysis
                </p>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              <div 
                className="border-2 border-dashed border-physical/30 rounded-xl p-6 text-center hover:border-physical/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Selected food" className="w-full h-32 object-cover rounded-lg" />
                    <p className="text-sm text-muted-foreground">Click to change image</p>
                  </div>
                ) : (
                  <>
                    <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Click to upload food image</p>
                  </>
                )}
              </div>
              
              <Button 
                className="w-full bg-gradient-physical hover:opacity-90"
                onClick={analyzeFoodImage}
                disabled={!selectedImage || isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Analyze Food
                  </>
                )}
              </Button>
              
              {foodAnalysisResult && (
                <div className="mt-4 p-6 glass rounded-xl border border-green-200/30 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 animate-fade-in">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center mr-3">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <h4 className="font-bold text-green-800 dark:text-green-200 text-lg">Food Analysis Complete!</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Food Item:</span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">{foodAnalysisResult.foodItem}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Confidence:</span>
                      <span className="text-sm font-bold text-green-700 dark:text-green-300">{foodAnalysisResult.confidence}%</span>
                    </div>
                    
                    {foodAnalysisResult.healthStatus && (
                      <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health Status:</span>
                        <span className="text-sm font-bold text-green-700 dark:text-green-300">{foodAnalysisResult.healthStatus}</span>
                      </div>
                    )}
                    
                    <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">💡 Recommendations:</h5>
                      <ul className="space-y-1">
                        {foodAnalysisResult.recommendations?.map((rec: string, index: number) => (
                          <li key={index} className="text-xs text-gray-700 dark:text-gray-300 flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>

          {/* Diet Planner Section */}
          <DashboardCard title="🥗 Diet Planner" variant="physical">
            <div className="space-y-4">
              <div className="text-center">
                <Apple className="w-12 h-12 mx-auto mb-3 text-physical" />
                <h3 className="font-bold text-lg mb-2">Smart Meal Planning</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get a personalized diet plan based on your physical metrics
                </p>
              </div>
              
              <Button 
                className="w-full bg-gradient-physical hover:opacity-90"
                onClick={generateDietPlan}
                disabled={isGeneratingDiet}
              >
                {isGeneratingDiet ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Apple className="w-4 h-4 mr-2" />
                    Generate Diet Plan
                  </>
                )}
              </Button>
              
              {dietPlan && (
                <div className="mt-4 p-6 glass rounded-xl border border-blue-200/30 bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:from-blue-900/20 dark:to-cyan-900/20 max-h-80 overflow-y-auto animate-fade-in">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center mr-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h4 className="font-bold text-blue-800 dark:text-blue-200 text-lg">Your Personalized Diet Plan</h4>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {dietPlan.bmi && (
                      <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your BMI:</span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{dietPlan.bmi} ({dietPlan.healthStatus})</span>
                      </div>
                    )}
                    
                    {dietPlan.dailyCalories && (
                      <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Calories:</span>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{dietPlan.dailyCalories}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                      <Apple className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                      Diet Plan Details
                    </h5>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {dietPlan.dietPlan}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>

          {/* Exercise Planner Section */}
          <DashboardCard title="💪 Exercise Planner" variant="physical">
            <div className="space-y-4">
              <div className="text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-3 text-physical" />
                <h3 className="font-bold text-lg mb-2">Workout Scheduler</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get a customized exercise plan based on your fitness level
                </p>
              </div>
              
              <Button 
                className="w-full bg-gradient-physical hover:opacity-90"
                onClick={generateExercisePlan}
                disabled={isGeneratingExercise}
              >
                {isGeneratingExercise ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Plan...
                  </>
                ) : (
                  <>
                    <Dumbbell className="w-4 h-4 mr-2" />
                    Generate Exercise Plan
                  </>
                )}
              </Button>
              
              {exercisePlan && (
                <div className="mt-4 p-6 glass rounded-xl border border-purple-200/30 bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 max-h-80 overflow-y-auto animate-fade-in">
                  <div className="flex items-center mb-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center mr-3">
                      <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h4 className="font-bold text-purple-800 dark:text-purple-200 text-lg">Your Exercise Plan</h4>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {exercisePlan.bmi && (
                      <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your BMI:</span>
                        <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{exercisePlan.bmi} ({exercisePlan.healthStatus})</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fitness Level:</span>
                      <span className="text-sm font-bold text-purple-700 dark:text-purple-300">{exercisePlan.fitnessLevel}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg mb-4">
                    <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                      <Dumbbell className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                      Workout Plan
                    </h5>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {exercisePlan.exercisePlan}
                    </div>
                  </div>
                  
                  {exercisePlan.quickExercises && (
                    <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg">
                      <h5 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                        Quick Desk Exercises
                      </h5>
                      <ul className="space-y-2">
                        {exercisePlan.quickExercises.map((exercise: string, index: number) => (
                          <li key={index} className="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                            <span className="text-purple-500 mr-2 mt-0.5">•</span>
                            {exercise}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DashboardCard>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Physical Metrics Section */}
        <div className="mb-8">
          <PhysicalMetrics />
        </div>

        {/* Health Query Assistant Chat Board */}
        <DashboardCard title="💬 Health Query Assistant" variant="physical" size="lg">
          <HealthChatBoard />
        </DashboardCard>

        {/* Recommended Trained Physical Mentors */}
        <DashboardCard title="🏋️‍♂️ Recommended Trained Physical Mentors" variant="physical" size="lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Trainer 1 - Sarah Johnson */}
            <div className="p-6 glass rounded-xl border border-physical/20 hover:border-physical/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">SJ</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-physical">Sarah Johnson</h3>
                  <p className="text-sm text-muted-foreground">Certified Personal Trainer</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Weight Loss</Badge>
                    <Badge variant="secondary" className="text-xs">Strength</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 8+ years</p>
                    <p><strong>Specialization:</strong> Weight management and muscle building</p>
                    <p><strong>Best for:</strong> Beginners to intermediate fitness enthusiasts</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.9/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-physical hover:opacity-90 text-sm"
                  onClick={() => handleConnectTrainer('Sarah Johnson')}
                >
                  Connect with Sarah
                </Button>
              </div>
            </div>

            {/* Trainer 2 - Mike Rodriguez */}
            <div className="p-6 glass rounded-xl border border-physical/20 hover:border-physical/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">MR</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-physical">Mike Rodriguez</h3>
                  <p className="text-sm text-muted-foreground">Sports Nutritionist & Trainer</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Nutrition</Badge>
                    <Badge variant="secondary" className="text-xs">Athletics</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 12+ years</p>
                    <p><strong>Specialization:</strong> Sports nutrition and performance optimization</p>
                    <p><strong>Best for:</strong> Athletes and performance-focused individuals</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.8/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-physical hover:opacity-90 text-sm"
                  onClick={() => handleConnectTrainer('Mike Rodriguez')}
                >
                  Connect with Mike
                </Button>
              </div>
            </div>

            {/* Trainer 3 - Emma Chen */}
            <div className="p-6 glass rounded-xl border border-physical/20 hover:border-physical/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">EC</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-physical">Emma Chen</h3>
                  <p className="text-sm text-muted-foreground">Yoga & Wellness Coach</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Yoga</Badge>
                    <Badge variant="secondary" className="text-xs">Mindfulness</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 6+ years</p>
                    <p><strong>Specialization:</strong> Flexibility, stress relief, and mental wellness</p>
                    <p><strong>Best for:</strong> Stress management and flexibility improvement</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.9/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-physical hover:opacity-90 text-sm"
                  onClick={() => handleConnectTrainer('Emma Chen')}
                >
                  Connect with Emma
                </Button>
              </div>
            </div>

            {/* Trainer 4 - David Thompson */}
            <div className="p-6 glass rounded-xl border border-physical/20 hover:border-physical/40 transition-all duration-300 hover:shadow-lg">
              <div className="text-center space-y-4">
                {/* Avatar placeholder */}
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">DT</span>
                </div>
                
                <div>
                  <h3 className="font-bold text-lg text-physical">David Thompson</h3>
                  <p className="text-sm text-muted-foreground">Rehabilitation Specialist</p>
                </div>
                
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">Rehab</Badge>
                    <Badge variant="secondary" className="text-xs">Injury Prevention</Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Experience:</strong> 15+ years</p>
                    <p><strong>Specialization:</strong> Injury recovery and corrective exercises</p>
                    <p><strong>Best for:</strong> Injury recovery and posture correction</p>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-400">★★★★★</span>
                    <span className="text-xs text-muted-foreground">(4.7/5)</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-physical hover:opacity-90 text-sm"
                  onClick={() => handleConnectTrainer('David Thompson')}
                >
                  Connect with David
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              All trainers are certified professionals with verified credentials and positive client reviews.
            </p>
            <Button variant="outline" className="border-physical/30 hover:bg-physical/10">
              View All Trainers
            </Button>
          </div>
        </DashboardCard>
        
        {/* Premium Popup */}
        <PremiumPopup />
      </div>
    </Layout>
  );
};

export default PhysicalCoach;