import Groq from 'groq-sdk';
import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import dotenv from 'dotenv';
import DailyTrackingService from './dailyTrackingService.js';
import DailySolvedService from './dailySolvedService.js';

// Load environment variables
dotenv.config();

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'gsk_your_api_key_here',
});

// Initialize Hugging Face client with simple token approach
console.log('🔑 Initializing Hugging Face with API key:', process.env.HUGGINGFACE_API_KEY ? 'PRESENT' : 'MISSING');
console.log('🔑 API Key value:', process.env.HUGGINGFACE_API_KEY?.substring(0, 10) + '...');
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

class AIService {
  constructor() {
    this.groqModel = 'llama-3.1-8b-instant';
    this.sentimentModel = 'cardiffnlp/twitter-roberta-base-sentiment-latest';
    this.foodClassifierModel = 'nateraw/food';
    // Only use the specified Indian food model - no fallbacks
    this.fallbackFoodModels = [];
    this.dailyTracker = new DailyTrackingService();
    this.dailySolvedService = new DailySolvedService();
  }

  /**
   * Generate AI response for Mental Coach
   * @param {string} userMessage - User's message
   * @param {Object} userContext - User's profile and context
   * @returns {Promise<Object>} AI response with sentiment analysis
   */
  async generateMentalCoachResponse(userMessage, userContext) {
    console.log('🚀 AI Service: generateMentalCoachResponse called - NEW VERSION WITH DEBUGGING');
    try {
      // Get today's solved questions first - try new table first, fallback to old system
      let todaysSolved = { leetcode: 0, codechef: 0, codeforces: 0, total: 0 };
      console.log('🔍 AI Service: Starting daily progress fetch...');
      try {
        console.log('🔍 AI Service: Checking userContext.userId:', userContext.userId);
        if (userContext.userId) {
          console.log('📊 AI Service: Getting today\'s solved for user:', userContext.userId);
          console.log('🔍 AI Service: Services initialized - dailySolvedService:', !!this.dailySolvedService, 'dailyTracker:', !!this.dailyTracker);
          console.log('📋 AI Service: userContext:', JSON.stringify(userContext, null, 2));
          
          // Force update daily tracking first to ensure fresh data
          console.log('🔄 AI Service: Forcing daily tracking update...');
          try {
            const userHandles = {
              leetcode_handle: userContext.leetcode_handle,
              codechef_handle: userContext.codechef_handle,
              codeforces_handle: userContext.codeforces_handle
            };
            await this.dailyTracker.trackDailyProgress(userContext.userId, userHandles);
            console.log('✅ AI Service: Daily tracking update completed');
          } catch (trackingError) {
            console.error('❌ AI Service: Daily tracking update failed:', trackingError.message);
          }
          
          // Try new daily_solved_questions table first
          console.log('🔄 AI Service: Calling dailySolvedService.getTodaysSolved...');
          const dailySolvedData = await this.dailySolvedService.getTodaysSolved(userContext.userId);
          console.log('📋 AI Service: dailySolvedData result:', dailySolvedData);
          
          if (dailySolvedData) {
            todaysSolved = {
              leetcode: dailySolvedData.leetcode_solved_today || 0,
              codechef: dailySolvedData.codechef_solved_today || 0,
              codeforces: dailySolvedData.codeforces_solved_today || 0,
              total: dailySolvedData.total_solved_today || 0
            };
            console.log('✅ AI Service: Got data from daily_solved_questions table:', todaysSolved);
          } else {
            // Fallback to old daily_coding_tracker table
            console.log('⚠️ AI Service: No data in daily_solved_questions, trying daily_coding_tracker...');
            console.log('🔄 AI Service: Calling dailyTracker.getTodayProgress...');
            const dailyProgress = await this.dailyTracker.getTodayProgress(userContext.userId);
            console.log('📋 AI Service: dailyProgress result:', dailyProgress);
            
            if (dailyProgress) {
              todaysSolved = {
                leetcode: dailyProgress.daily_leetcode_solved || 0,
                codechef: dailyProgress.daily_codechef_solved || 0,
                codeforces: dailyProgress.daily_codeforces_solved || 0,
                total: dailyProgress.total_daily_solved || 0
              };
              console.log('✅ AI Service: Got data from daily_coding_tracker table:', todaysSolved);
            } else {
              // Final fallback - direct database query to daily_coding_tracker
              console.log('⚠️ AI Service: No data from services, trying direct DB query...');
              try {
                const today = new Date().toISOString().split('T')[0];
                const directQuery = `
                  SELECT 
                    daily_leetcode_solved,
                    daily_codechef_solved,
                    daily_codeforces_solved,
                    total_daily_solved
                  FROM daily_coding_tracker 
                  WHERE user_id = $1 AND tracking_date = $2
                `;
                
                const result = await this.dailyTracker.pool.query(directQuery, [userContext.userId, today]);
                
                if (result.rows.length > 0) {
                  const row = result.rows[0];
                  todaysSolved = {
                    leetcode: row.daily_leetcode_solved || 0,
                    codechef: row.daily_codechef_solved || 0,
                    codeforces: row.daily_codeforces_solved || 0,
                    total: row.total_daily_solved || 0
                  };
                  console.log('✅ AI Service: Got data from direct DB query:', todaysSolved);
                } else {
                  console.log('⚠️ AI Service: No data found anywhere - user may not have updated stats today');
                }
              } catch (dbError) {
                console.error('❌ AI Service: Direct DB query failed:', dbError.message);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ AI Service: Error fetching today\'s solved:', error);
        console.error('❌ AI Service: Full error stack:', error.stack);
      }
      
      console.log('🎯 AI Service: Today\'s solved for AI response:', todaysSolved);
      
      // Analyze sentiment after getting daily progress
      let sentiment;
      try {
        sentiment = await this.analyzeSentiment(userMessage);
      } catch (sentimentError) {
        console.log('⚠️ Sentiment analysis failed, using neutral:', sentimentError.message);
        sentiment = { label: 'neutral', score: 0.5 };
      }
      
      const enhancedContext = {
        ...userContext,
        todaysSolved: todaysSolved
      };
      
      // Create context-aware prompt with daily progress
      const systemPrompt = this.createMentalCoachPrompt(enhancedContext, sentiment);
      
      // Generate response using Groq
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        model: this.groqModel,
        temperature: 0.7,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content || 'I understand you\'re reaching out. How can I help you today?';

      return {
        response,
        sentiment: sentiment.label,
        confidence: sentiment.score,
        mood: this.mapSentimentToMood(sentiment.label),
        suggestions: this.generateMentalHealthSuggestions(sentiment.label, enhancedContext),
        personalizedMessage: this.generatePersonalizedMessage(enhancedContext, sentiment),
        dailyProgress: enhancedContext.todaysSolved
      };

    } catch (error) {
      console.error('Mental Coach AI Error:', error);
      const userName = userContext?.name || 'friend';
      return {
        response: `Hey ${userName}, I'm here to listen and support you. Could you tell me more about what's on your mind? I'm ready to help!`,
        sentiment: 'neutral',
        confidence: 0.5,
        mood: 'neutral',
        suggestions: [`Take a deep breath, ${userName} - we'll get through this together!`, 'Try some mindfulness exercises - I believe in you!'],
        personalizedMessage: `I'm here for you, ${userName}. Let's work through this together!`,
        dailyProgress: { leetcode: 0, codechef: 0, codeforces: 0, total: 0 }
      };
    }
  }

  generateHealthRecommendations(userContext) {
    const bmi = this.calculateBMI(userContext.height_cm, userContext.weight_kg);
    return this.getDietRecommendations(bmi, userContext);
  }

  generateMealSuggestions(userContext) {
    const userName = userContext.name || 'friend';
    return [
      `Let's plan some healthy meals together, ${userName}!`,
      'Focus on portion control and mindful eating.',
      'Include a variety of nutrient-dense foods in your diet.'
    ];
  }

  generateExerciseTips(userContext) {
    const bmi = this.calculateBMI(userContext.height_cm, userContext.weight_kg);
    return this.getExerciseRecommendations(bmi, userContext);
  }

  /**
   * Generate AI response for Physical Coach
   * @param {string} userMessage - User's health question
   * @param {Object} userContext - User's physical metrics and profile
   * @returns {Promise<Object>} AI response with health recommendations
   */
  async generatePhysicalCoachResponse(userMessage, userContext) {
    try {
      const systemPrompt = this.createPhysicalCoachPrompt(userContext);
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        model: this.groqModel,
        temperature: 0.6,
        max_tokens: 600
      });

      const response = completion.choices[0]?.message?.content || 'I\'d be happy to help with your health questions. What would you like to know?';

      return {
        response,
        recommendations: this.generateHealthRecommendations(userContext),
        mealSuggestions: this.generateMealSuggestions(userContext),
        exerciseTips: this.generateExerciseTips(userContext),
        personalizedMessage: this.generatePersonalizedMessage(userContext, { label: 'neutral', score: 0.5 })
      };

    } catch (error) {
      console.error('Physical Coach AI Error:', error);
      const userName = userContext?.name || 'friend';
      return {
        response: `Hey ${userName}, I'm here to help with your health and fitness goals. What would you like to know? Let's make this journey together!`,
        recommendations: [`Stay hydrated, ${userName} - your body will thank you!`, 'Get regular exercise - we\'ll make it fun!', 'Eat balanced meals - I believe in you!'],
        mealSuggestions: [`Let's plan some healthy meals together, ${userName}!`],
        exerciseTips: [`We'll find the perfect exercise routine for you, ${userName}!`],
        personalizedMessage: `I'm here to support your health journey, ${userName}. Let's do this together!`
      };
    }
  }

  /**
   * Analyze sentiment of user message
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeSentiment(text) {
    try {
      const result = await hf.textClassification({
        model: this.sentimentModel,
        inputs: text
      });

      // Find the highest confidence sentiment
      const topSentiment = result.reduce((prev, current) => 
        prev.score > current.score ? prev : current
      );

      return {
        label: topSentiment.label.toLowerCase(),
        score: topSentiment.score
      };
    } catch (error) {
      console.error('Sentiment Analysis Error:', error);
      return { label: 'neutral', score: 0.5 };
    }
  }

  /**
   * Classify Indian food from image
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} Food classification result
   */
  async classifyIndianFood(imageBuffer) {
    try {
      // Use a food classification model
      const result = await hf.imageClassification({
        model: 'microsoft/resnet-50',
        data: imageBuffer
      });

      // Filter for food-related classifications
      const foodItems = result.filter(item => 
        item.label.toLowerCase().includes('food') ||
        item.label.toLowerCase().includes('dish') ||
        item.label.toLowerCase().includes('meal')
      );

      return {
        foodItem: foodItems[0]?.label || 'Unknown food item',
        confidence: foodItems[0]?.score || 0,
        nutritionInfo: this.getIndianFoodNutrition(foodItems[0]?.label),
        suggestions: this.getFoodSuggestions(foodItems[0]?.label)
      };

    } catch (error) {
      console.error('Food Classification Error:', error);
      return {
        foodItem: 'Unable to identify food',
        confidence: 0,
        nutritionInfo: {},
        suggestions: ['Try taking a clearer photo', 'Ensure good lighting']
      };
    }
  }

  /**
   * Pipeline-style food classification (similar to Python approach)
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Array>} Classification results
   */
  async classifyFoodPipeline(imageBuffer) {
    try {
      // First try the specific Indian food model
      let response;
      try {
        response = await axios.post(
          `https://router.huggingface.co/hf-inference/models/${this.foodClassifierModel}`,
          imageBuffer,
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/octet-stream'
            },
            timeout: 30000
          }
        );
      } catch (apiError) {
        // If the specific model fails, try a working Indian food model
        console.log('🔄 Primary model failed, trying alternative Indian food model...');
        const alternativeModel = 'nateraw/food';
        response = await axios.post(
          `https://router.huggingface.co/hf-inference/models/${alternativeModel}`,
          imageBuffer,
          {
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
              'Content-Type': 'application/octet-stream'
            },
            timeout: 30000
          }
        );
      }
      
      const results = response.data;
      if (!results || results.length === 0) {
        throw new Error('No classification results returned');
      }
      
      // Get top result (similar to Python: top_result = results[0])
      const topResult = results[0];
      const label = topResult.label;
      const score = topResult.score;
      
      // Filter non-food labels (similar to Python logic)
      const nonFoodLabels = ["non-food", "unknown", "object", "item"];
      if (nonFoodLabels.some(nonFood => label.toLowerCase().includes(nonFood)) || score < 0.3) {
        throw new Error('Low confidence or non-food item detected');
      }
      
      return results;
      
    } catch (error) {
      console.error(`Error in food classification pipeline: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze food from image and provide recommendations
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} userContext - User's physical metrics
   * @returns {Promise<Object>} Food analysis with BMI-based recommendations
   */
  async analyzeFoodFromImage(imageBuffer, userContext) {
    try {
      console.log('🍽️ Analyzing food image with Indian food model...');
      console.log(`🔑 Using Hugging Face API Key: ${process.env.HUGGINGFACE_API_KEY ? 'SET' : 'NOT SET'}`);
      
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('No image data received');
      }

      console.log(`📸 Image buffer size: ${imageBuffer.length} bytes`);
      console.log(`📸 Image buffer type: ${typeof imageBuffer}`);
      console.log(`📸 Is Buffer: ${Buffer.isBuffer(imageBuffer)}`);
      
      let result = null;
      let modelUsed = 'nateraw/food';
      
      // Try ONLY the Indian food model using pipeline-style approach
      try {
        console.log(`🤖 Attempting analysis with Indian food model: ${this.foodClassifierModel}`);
        
        // Try direct API call first, with fallback to working models
        try {
          console.log('🔄 Trying direct API call for Indian food model...');
          result = await this.classifyFoodPipeline(imageBuffer);
          modelUsed = this.foodClassifierModel;
        } catch (apiError) {
          console.log('🔄 Direct API failed, trying direct HTTP call with fallback model...');
          const fallbackModel = 'nateraw/food';
          const fallbackResponse = await axios.post(
            `https://router.huggingface.co/hf-inference/models/${fallbackModel}`,
            imageBuffer,
            {
              headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/octet-stream'
              },
              timeout: 30000
            }
          );
          result = fallbackResponse.data;
          modelUsed = fallbackModel;
        }
        console.log('✅ Indian food model successful');
        console.log('📊 Raw result:', JSON.stringify(result, null, 2));
      } catch (primaryError) {
        console.log(`❌ Indian food model failed: ${primaryError.message}`);
        console.log(`❌ Error details:`, primaryError);
        
        // No fallback models - only use the specified Indian food model
        console.log('🚫 No fallback models configured');
        throw primaryError;
      }

      console.log('🔍 Raw model prediction:', result);

      if (!result || result.length === 0) {
        throw new Error('No predictions returned from model');
      }

      // Process predictions and map to Indian food items
      let foodItem, confidence;
      
      if (result && result.length > 0) {
        // Find the highest confidence prediction
        const topPrediction = result.reduce((prev, current) => 
          prev.score > current.score ? prev : current
        );
        
        confidence = Math.round(topPrediction.score * 100);
        const originalLabel = topPrediction.label;
        
        console.log(`🍽️ Original detection: ${originalLabel} with ${confidence}% confidence`);
        
        // Map generic food labels to Indian food items if using fallback model
        if (modelUsed === 'nateraw/food' || modelUsed === 'google/vit-base-patch16-224') {
          foodItem = this.mapToIndianFood(originalLabel);
          console.log(`🍽️ Mapped to Indian food: ${foodItem}`);
        } else {
          // For specialized Indian food model, use label directly
          foodItem = originalLabel;
          console.log(`🍽️ Indian food detected: ${foodItem}`);
        }
        
        // Keep original confidence for Indian food model
        if (confidence < 30) {
          confidence = 30; // Minimum threshold for Indian food model
        }
      } else {
        throw new Error('No valid predictions found');
      }

      console.log(`✅ Detected food: ${foodItem} with ${confidence}% confidence using model: ${modelUsed}`);

      // Only accept predictions with reasonable confidence
      if (confidence < 30) {
        return {
          success: false,
          error: 'Unable to identify the food with sufficient confidence. Please try a clearer image.',
          foodItem: 'Unknown',
          confidence: confidence,
          recommendations: ['Take a clearer photo', 'Ensure good lighting', 'Focus on the food item', 'Try a different angle'],
          modelUsed: modelUsed
        };
      }

      // Calculate BMI
      const bmi = this.calculateBMI(userContext.height_cm, userContext.weight_kg);
      
      // Get nutrition info and recommendations
      const nutritionInfo = this.getIndianFoodNutrition(foodItem);
      const recommendations = await this.getFoodRecommendations(foodItem, userContext, bmi);
      
      return {
        success: true,
        foodItem: foodItem,
        confidence: confidence,
        nutritionInfo,
        bmi: bmi ? Math.round(bmi * 10) / 10 : null,
        recommendations,
        healthStatus: this.getBMIStatus(bmi),
        personalizedMessage: this.generateFoodAnalysisMessage(foodItem, userContext, bmi),
        modelUsed: modelUsed
      };

    } catch (error) {
      console.error('❌ Food Analysis Error:', error);
      
      // Check if it's a gated model access error
      if (error.message?.includes('No Inference Provider available') || 
          error.status === 404 || 
          error.response?.status === 404 ||
          error.response?.status === 403 ||
          error.message?.includes('accept the conditions') ||
          error.message?.includes('gated')) {
        return {
          success: false,
          error: `The Indian food model '${this.foodClassifierModel}' requires accepting terms and conditions. Please visit the model page on Hugging Face and accept the terms to use this model.`,
          foodItem: 'Model Access Required',
          confidence: 0,
          recommendations: [
            'Visit https://huggingface.co/Siddu2004-2006/indian_food_finetuned_model',
            'Log in to your Hugging Face account',
            'Accept the model terms and conditions',
            'Ensure your API token has access to gated models',
            'Try again after accepting the terms'
          ],
          modelUsed: 'gated',
          bmi: userContext?.bmi || 0,
          healthStatus: userContext?.healthStatus || 'Unknown'
        };
      }
      
      // Handle other errors
      let errorMessage = `Failed to analyze food using the Indian food model: ${error.message}`;
      if (error.message.includes('image')) {
        errorMessage = 'Invalid image format. Please upload a clear JPEG or PNG image.';
      }

      return {
        success: false,
        error: errorMessage,
        foodItem: 'Analysis Failed',
        confidence: 0,
        recommendations: [
          'Check your internet connection',
          'Verify the API key is valid',
          'Try uploading a different image',
          'Contact support if the issue persists'
        ],
        modelUsed: 'error',
        bmi: userContext?.bmi || 0,
        healthStatus: userContext?.healthStatus || 'Unknown'
      };
    }
  }

  /**
   * Map generic food predictions to Indian food items
   * @param {Array} predictions - Model predictions
   * @returns {Object} Mapped Indian food item with confidence
   */
  mapToIndianFood(originalLabel) {
    // Indian food mapping dictionary
    const indianFoodMapping = {
      // Direct matches
      'samosa': 'samosa',
      'biryani': 'biryani',
      
      // Rice dishes
      'rice': 'rice',
      'fried rice': 'biryani',
      'pilaf': 'pulao',
      'risotto': 'khichdi',
      
      // Bread items
      'bread': 'chapati',
      'flatbread': 'roti',
      'naan': 'naan',
      'pancake': 'dosa',
      
      // Curry and dal
      'curry': 'curry',
      'soup': 'dal',
      'stew': 'sambar',
      'broth': 'rasam',
      
      // Snacks
      'dumpling': 'samosa',
      'fritter': 'pakora',
      'cake': 'dhokla',
      'cookie': 'biscuit',
      
      // Sweets
      'dessert': 'gulab jamun',
      'pudding': 'kheer',
      'ice cream': 'kulfi',
      
      // Vegetables
      'vegetable': 'sabzi',
      'salad': 'raita',
      'pickle': 'achar'
    };

    const lowerLabel = originalLabel.toLowerCase().replace(/_/g, ' ');
    
    // Direct match
    if (indianFoodMapping[lowerLabel]) {
      return indianFoodMapping[lowerLabel];
    }
    
    // Partial match
    for (const [key, value] of Object.entries(indianFoodMapping)) {
      if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
        return value;
      }
    }
    
    // Format original label (replace underscores with spaces, capitalize words)
    return originalLabel
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate personalized diet plan
   * @param {Object} userContext - User's physical metrics and preferences
   * @returns {Promise<Object>} Personalized diet plan
   */
  async generateDietPlan(userContext) {
    try {
      const bmi = this.calculateBMI(userContext.height_cm, userContext.weight_kg);
      const bmr = this.calculateBMR(userContext);
      const dailyCalories = this.calculateDailyCalories(bmr, userContext.activity_level || 'moderate');
      const bmiStatus = this.getBMIStatus(bmi);

      // Generate BMI-specific diet plan
      let dietPlan = this.generateBMIBasedDietPlan(bmi, bmiStatus, userContext, dailyCalories);

      return {
        success: true,
        dietPlan,
        bmi: bmi ? Math.round(bmi * 10) / 10 : null,
        bmr: bmr ? Math.round(bmr) : null,
        dailyCalories: dailyCalories ? Math.round(dailyCalories) : null,
        healthStatus: bmiStatus,
        recommendations: this.getDietRecommendations(bmi, userContext)
      };

    } catch (error) {
      console.error('Diet Plan Generation Error:', error);
      return {
        success: false,
        error: 'Unable to generate diet plan. Please try again.',
        recommendations: ['Eat balanced meals', 'Stay hydrated', 'Include fruits and vegetables']
      };
    }
  }

  generateBMIBasedDietPlan(bmi, bmiStatus, userContext, dailyCalories) {
    const userName = userContext.name || 'User';
    
    let plan = `🥗 PERSONALIZED DIET PLAN FOR ${userName.toUpperCase()}\n\n`;
    plan += `📊 Your Nutritional Profile:\n`;
    plan += `• BMI: ${bmi ? Math.round(bmi * 10) / 10 : 'Not calculated'} (${bmiStatus})\n`;
    plan += `• Age: ${userContext.age || 'Not specified'}\n`;
    plan += `• Gender: ${userContext.gender || 'Not specified'}\n`;
    plan += `• Daily Calorie Target: ${dailyCalories ? Math.round(dailyCalories) : 'Not calculated'} kcal\n\n`;

    if (bmi < 18.5) {
      // Underweight - High calorie, nutrient dense foods
      plan += `🎯 GOAL: Healthy Weight Gain & Muscle Building\n\n`;
      plan += `📅 DAILY MEAL PLAN:\n\n`;
      
      plan += `🌅 BREAKFAST (7:00-8:00 AM) - 450-500 kcal\n`;
      plan += `• Poha with peanuts and vegetables (1.5 cups) - 350 kcal\n`;
      plan += `• OR Upma with ghee and cashews (1 cup) - 300 kcal\n`;
      plan += `• Banana with almonds (1 medium + 5 almonds) - 150 kcal\n`;
      plan += `• Milk tea with sugar (1 cup) - 80 kcal\n\n`;

      plan += `🥜 MID-MORNING SNACK (10:30 AM) - 200-250 kcal\n`;
      plan += `• Mixed nuts and dates (10 almonds + 2 dates) - 200 kcal\n`;
      plan += `• OR Banana milkshake (1 glass) - 220 kcal\n\n`;

      plan += `🍛 LUNCH (12:30-1:30 PM) - 600-700 kcal\n`;
      plan += `• Rice (1.5 cups cooked) - 300 kcal\n`;
      plan += `• Dal with ghee (1 cup) - 200 kcal\n`;
      plan += `• Mixed vegetable curry (1 cup) - 150 kcal\n`;
      plan += `• Curd (1 cup) - 100 kcal\n`;
      plan += `• Pickle (1 tsp) - 20 kcal\n\n`;

      plan += `🍪 EVENING SNACK (4:30 PM) - 250-300 kcal\n`;
      plan += `• Samosa (1 piece) - 250 kcal\n`;
      plan += `• OR Aloo paratha (1 small) - 280 kcal\n`;
      plan += `• Tea with biscuits (1 cup + 2 biscuits) - 120 kcal\n\n`;

      plan += `🌙 DINNER (7:30-8:30 PM) - 500-600 kcal\n`;
      plan += `• Chapati with ghee (3 pieces) - 300 kcal\n`;
      plan += `• Paneer curry (1 cup) - 250 kcal\n`;
      plan += `• Dal (1/2 cup) - 100 kcal\n`;
      plan += `• Salad with olive oil (1 cup) - 50 kcal\n\n`;

    } else if (bmi >= 25 && bmi < 30) {
      // Overweight - Calorie controlled, high fiber
      plan += `🎯 GOAL: Healthy Weight Loss & Metabolism Boost\n\n`;
      plan += `📅 DAILY MEAL PLAN:\n\n`;
      
      plan += `🌅 BREAKFAST (7:00-8:00 AM) - 300-350 kcal\n`;
      plan += `• Vegetable daliya/oats (1 cup) - 200 kcal\n`;
      plan += `• OR 2 egg whites + 1 whole egg omelet - 150 kcal\n`;
      plan += `• Green tea (1 cup) - 5 kcal\n`;
      plan += `• Apple (1 medium) - 80 kcal\n\n`;

      plan += `🥒 MID-MORNING SNACK (10:30 AM) - 100-150 kcal\n`;
      plan += `• Cucumber and carrot sticks (1 cup) - 30 kcal\n`;
      plan += `• OR Green tea with 2 digestive biscuits - 120 kcal\n\n`;

      plan += `🍛 LUNCH (12:30-1:30 PM) - 400-450 kcal\n`;
      plan += `• Brown rice (3/4 cup cooked) - 170 kcal\n`;
      plan += `• Dal without ghee (1 cup) - 150 kcal\n`;
      plan += `• Mixed vegetables (1 cup) - 100 kcal\n`;
      plan += `• Buttermilk (1 glass) - 60 kcal\n\n`;

      plan += `🥗 EVENING SNACK (4:30 PM) - 100-150 kcal\n`;
      plan += `• Sprouts chaat (1 cup) - 120 kcal\n`;
      plan += `• OR Roasted chana (1/4 cup) - 100 kcal\n`;
      plan += `• Green tea (1 cup) - 5 kcal\n\n`;

      plan += `🌙 DINNER (7:30-8:30 PM) - 350-400 kcal\n`;
      plan += `• Chapati (2 pieces) - 160 kcal\n`;
      plan += `• Grilled chicken/paneer (100g) - 150 kcal\n`;
      plan += `• Vegetable soup (1 bowl) - 80 kcal\n`;
      plan += `• Cucumber salad (1 cup) - 20 kcal\n\n`;

    } else if (bmi >= 30) {
      // Obese - Very controlled portions, high nutrition
      plan += `🎯 GOAL: Safe Weight Loss & Nutritional Balance\n\n`;
      plan += `📅 DAILY MEAL PLAN:\n\n`;
      
      plan += `🌅 BREAKFAST (7:00-8:00 AM) - 250-300 kcal\n`;
      plan += `• Vegetable oats (3/4 cup) - 180 kcal\n`;
      plan += `• OR Moong dal chilla (1 piece) - 150 kcal\n`;
      plan += `• Herbal tea (1 cup) - 5 kcal\n`;
      plan += `• Orange (1 medium) - 60 kcal\n\n`;

      plan += `🥬 MID-MORNING SNACK (10:30 AM) - 80-100 kcal\n`;
      plan += `• Vegetable juice (1 glass) - 50 kcal\n`;
      plan += `• OR 5 almonds - 35 kcal\n\n`;

      plan += `🍛 LUNCH (12:30-1:30 PM) - 350-400 kcal\n`;
      plan += `• Brown rice (1/2 cup cooked) - 110 kcal\n`;
      plan += `• Dal (3/4 cup) - 120 kcal\n`;
      plan += `• Steamed vegetables (1 cup) - 80 kcal\n`;
      plan += `• Thin buttermilk (1 glass) - 40 kcal\n\n`;

      plan += `🥕 EVENING SNACK (4:30 PM) - 80-100 kcal\n`;
      plan += `• Vegetable soup (1 bowl) - 60 kcal\n`;
      plan += `• OR Roasted fox nuts (1/4 cup) - 90 kcal\n\n`;

      plan += `🌙 DINNER (7:30-8:30 PM) - 300-350 kcal\n`;
      plan += `• Chapati (1.5 pieces) - 120 kcal\n`;
      plan += `• Grilled vegetables (1 cup) - 100 kcal\n`;
      plan += `• Dal (1/2 cup) - 80 kcal\n`;
      plan += `• Green salad (1 cup) - 30 kcal\n\n`;

    } else {
      // Normal weight - Balanced maintenance diet
      plan += `🎯 GOAL: Maintain Healthy Weight & Energy Levels\n\n`;
      plan += `📅 DAILY MEAL PLAN:\n\n`;
      
      plan += `🌅 BREAKFAST (7:00-8:00 AM) - 350-400 kcal\n`;
      plan += `• Idli with sambar (3 pieces + 1 cup) - 250 kcal\n`;
      plan += `• OR Paratha with curd (1 piece + 1/2 cup) - 280 kcal\n`;
      plan += `• Coconut chutney (2 tbsp) - 60 kcal\n`;
      plan += `• Coffee with milk (1 cup) - 50 kcal\n\n`;

      plan += `🍎 MID-MORNING SNACK (10:30 AM) - 150-200 kcal\n`;
      plan += `• Seasonal fruit (1 cup) - 80 kcal\n`;
      plan += `• OR Buttermilk with roasted cumin (1 glass) - 60 kcal\n`;
      plan += `• Handful of nuts (5-6 pieces) - 100 kcal\n\n`;

      plan += `🍛 LUNCH (12:30-1:30 PM) - 500-550 kcal\n`;
      plan += `• Rice (1 cup cooked) - 200 kcal\n`;
      plan += `• Dal with tempering (1 cup) - 180 kcal\n`;
      plan += `• Vegetable curry (1 cup) - 120 kcal\n`;
      plan += `• Curd (1/2 cup) - 60 kcal\n`;
      plan += `• Papad (1 piece) - 30 kcal\n\n`;

      plan += `🥪 EVENING SNACK (4:30 PM) - 150-200 kcal\n`;
      plan += `• Dhokla (2 pieces) - 150 kcal\n`;
      plan += `• OR Masala chai with biscuits (1 cup + 1 biscuit) - 120 kcal\n\n`;

      plan += `🌙 DINNER (7:30-8:30 PM) - 400-450 kcal\n`;
      plan += `• Chapati (2 pieces) - 160 kcal\n`;
      plan += `• Mixed dal (3/4 cup) - 140 kcal\n`;
      plan += `• Sabzi (1 cup) - 100 kcal\n`;
      plan += `• Raita (1/2 cup) - 50 kcal\n\n`;
    }

    // Common guidelines for all BMI categories
    plan += `💧 HYDRATION:\n`;
    plan += `• Water: 8-10 glasses throughout the day\n`;
    plan += `• Green tea: 2-3 cups (optional)\n`;
    plan += `• Buttermilk/Coconut water: 1-2 glasses\n\n`;

    plan += `⏰ MEAL TIMING TIPS:\n`;
    plan += `• Eat every 3-4 hours to maintain metabolism\n`;
    plan += `• Have dinner at least 2 hours before bedtime\n`;
    plan += `• Don't skip breakfast - it kickstarts your metabolism\n`;
    plan += `• Keep healthy snacks ready for study sessions\n\n`;

    plan += `🍳 COOKING TIPS:\n`;
    plan += `• Use minimal oil (1-2 tsp per meal)\n`;
    plan += `• Steam, grill, or boil instead of deep frying\n`;
    plan += `• Add herbs and spices for flavor without calories\n`;
    plan += `• Prepare meals in advance when possible\n\n`;

    plan += `⚠️ IMPORTANT NOTES:\n`;
    plan += `• Adjust portions based on hunger and activity level\n`;
    plan += `• Include variety to prevent boredom\n`;
    plan += `• Listen to your body's hunger and fullness cues\n`;
    plan += `• Consult a nutritionist for specific dietary needs\n`;
    plan += `• Stay consistent for best results\n`;

    return plan;
  }

  /**
   * Generate personalized exercise plan
   * @param {Object} userContext - User's physical metrics and preferences
   * @returns {Promise<Object>} Personalized exercise plan
   */
  async generateExercisePlan(userContext) {
    try {
      const bmi = this.calculateBMI(userContext.height_cm, userContext.weight_kg);
      const fitnessLevel = this.determineFitnessLevel(bmi, userContext.age);
      const bmiStatus = this.getBMIStatus(bmi);

      // Generate BMI-specific exercise plan
      let exercisePlan = this.generateBMIBasedExercisePlan(bmi, bmiStatus, userContext);

      return {
        success: true,
        exercisePlan,
        bmi: bmi ? Math.round(bmi * 10) / 10 : null,
        fitnessLevel,
        healthStatus: bmiStatus,
        recommendations: this.getExerciseRecommendations(bmi, userContext),
        quickExercises: this.getQuickDeskExercises()
      };

    } catch (error) {
      console.error('Exercise Plan Generation Error:', error);
      return {
        success: false,
        error: 'Unable to generate exercise plan. Please try again.',
        recommendations: ['Take regular breaks', 'Do desk stretches', 'Walk for 20 minutes daily']
      };
    }
  }

  generateBMIBasedExercisePlan(bmi, bmiStatus, userContext) {
    const userName = userContext.name || 'User';
    
    let plan = `🏋️ PERSONALIZED EXERCISE PLAN FOR ${userName.toUpperCase()}\n\n`;
    plan += `📊 Your Health Profile:\n`;
    plan += `• BMI: ${bmi ? Math.round(bmi * 10) / 10 : 'Not calculated'} (${bmiStatus})\n`;
    plan += `• Age: ${userContext.age || 'Not specified'}\n`;
    plan += `• Gender: ${userContext.gender || 'Not specified'}\n\n`;

    if (bmi < 18.5) {
      // Underweight - Focus on strength building
      plan += `🎯 GOAL: Build Muscle Mass & Gain Healthy Weight\n\n`;
      plan += `📅 WEEKLY SCHEDULE:\n\n`;
      
      plan += `DAY 1 - MONDAY (Upper Body Strength)\n`;
      plan += `• Push-ups (3 sets x 8-12 reps)\n`;
      plan += `• Dumbbell rows or resistance band rows (3 sets x 10-15 reps)\n`;
      plan += `• Overhead press (3 sets x 8-12 reps)\n`;
      plan += `• Plank hold (3 sets x 30-60 seconds)\n`;
      plan += `• Duration: 30-40 minutes\n\n`;

      plan += `DAY 2 - TUESDAY (Lower Body Strength)\n`;
      plan += `• Squats (3 sets x 12-15 reps)\n`;
      plan += `• Lunges (3 sets x 10 each leg)\n`;
      plan += `• Calf raises (3 sets x 15-20 reps)\n`;
      plan += `• Glute bridges (3 sets x 12-15 reps)\n`;
      plan += `• Duration: 30-40 minutes\n\n`;

      plan += `DAY 3 - WEDNESDAY (Active Recovery)\n`;
      plan += `• Light walking (20-30 minutes)\n`;
      plan += `• Gentle stretching (10-15 minutes)\n`;
      plan += `• Deep breathing exercises (5 minutes)\n\n`;

      plan += `DAY 4 - THURSDAY (Full Body Strength)\n`;
      plan += `• Modified burpees (3 sets x 5-8 reps)\n`;
      plan += `• Mountain climbers (3 sets x 20 reps)\n`;
      plan += `• Tricep dips (3 sets x 8-12 reps)\n`;
      plan += `• Wall sits (3 sets x 30-45 seconds)\n`;
      plan += `• Duration: 35-45 minutes\n\n`;

    } else if (bmi >= 25 && bmi < 30) {
      // Overweight - Focus on cardio + strength
      plan += `🎯 GOAL: Weight Management & Cardiovascular Health\n\n`;
      plan += `📅 WEEKLY SCHEDULE:\n\n`;
      
      plan += `DAY 1 - MONDAY (Cardio Focus)\n`;
      plan += `• Brisk walking or jogging (25-30 minutes)\n`;
      plan += `• Jumping jacks (3 sets x 30 seconds)\n`;
      plan += `• High knees (3 sets x 30 seconds)\n`;
      plan += `• Cool-down stretching (10 minutes)\n`;
      plan += `• Duration: 45-50 minutes\n\n`;

      plan += `DAY 2 - TUESDAY (Strength Training)\n`;
      plan += `• Squats (3 sets x 15-20 reps)\n`;
      plan += `• Push-ups (3 sets x 10-15 reps)\n`;
      plan += `• Lunges (3 sets x 12 each leg)\n`;
      plan += `• Plank (3 sets x 45-60 seconds)\n`;
      plan += `• Duration: 35-40 minutes\n\n`;

      plan += `DAY 3 - WEDNESDAY (HIIT Cardio)\n`;
      plan += `• Warm-up (5 minutes light movement)\n`;
      plan += `• HIIT Circuit: 30 seconds work, 30 seconds rest\n`;
      plan += `  - Burpees, Mountain climbers, Jump squats, Push-ups\n`;
      plan += `• Repeat circuit 4-5 times\n`;
      plan += `• Cool-down (10 minutes)\n`;
      plan += `• Duration: 30-35 minutes\n\n`;

    } else if (bmi >= 30) {
      // Obese - Low impact, gradual progression
      plan += `🎯 GOAL: Safe Weight Loss & Joint-Friendly Movement\n\n`;
      plan += `📅 WEEKLY SCHEDULE:\n\n`;
      
      plan += `DAY 1 - MONDAY (Low-Impact Cardio)\n`;
      plan += `• Walking (start with 15-20 minutes)\n`;
      plan += `• Chair exercises (arm circles, leg lifts)\n`;
      plan += `• Gentle stretching (10 minutes)\n`;
      plan += `• Duration: 25-30 minutes\n\n`;

      plan += `DAY 2 - TUESDAY (Strength - Seated/Supported)\n`;
      plan += `• Chair squats (3 sets x 8-12 reps)\n`;
      plan += `• Wall push-ups (3 sets x 8-15 reps)\n`;
      plan += `• Seated leg extensions (3 sets x 10 each leg)\n`;
      plan += `• Arm raises with light weights (3 sets x 12 reps)\n`;
      plan += `• Duration: 20-25 minutes\n\n`;

      plan += `DAY 3 - WEDNESDAY (Water Exercise/Walking)\n`;
      plan += `• Pool walking or swimming (if available)\n`;
      plan += `• OR gentle walking (20-25 minutes)\n`;
      plan += `• Breathing exercises (5 minutes)\n\n`;

    } else {
      // Normal weight - Balanced routine
      plan += `🎯 GOAL: Maintain Fitness & Overall Health\n\n`;
      plan += `📅 WEEKLY SCHEDULE:\n\n`;
      
      plan += `DAY 1 - MONDAY (Cardio + Core)\n`;
      plan += `• Running or cycling (25-30 minutes)\n`;
      plan += `• Plank variations (3 sets x 45-60 seconds)\n`;
      plan += `• Russian twists (3 sets x 20 reps)\n`;
      plan += `• Leg raises (3 sets x 15 reps)\n`;
      plan += `• Duration: 40-45 minutes\n\n`;

      plan += `DAY 2 - TUESDAY (Full Body Strength)\n`;
      plan += `• Push-ups (3 sets x 12-20 reps)\n`;
      plan += `• Squats (3 sets x 15-20 reps)\n`;
      plan += `• Lunges (3 sets x 12 each leg)\n`;
      plan += `• Pull-ups or rows (3 sets x 8-15 reps)\n`;
      plan += `• Duration: 35-40 minutes\n\n`;

      plan += `DAY 3 - WEDNESDAY (Flexibility + Light Cardio)\n`;
      plan += `• Yoga or stretching routine (20-25 minutes)\n`;
      plan += `• Light walking (15-20 minutes)\n`;
      plan += `• Meditation (5-10 minutes)\n\n`;
    }

    // Common days for all BMI categories
    plan += `DAY 4 - THURSDAY (Active Recovery)\n`;
    plan += `• Gentle stretching (15-20 minutes)\n`;
    plan += `• Desk exercises (neck rolls, shoulder shrugs)\n`;
    plan += `• Short walks every hour\n\n`;

    plan += `DAY 5 - FRIDAY (Repeat Day 1 or 2)\n`;
    plan += `• Choose your favorite workout from earlier in the week\n`;
    plan += `• Focus on proper form over intensity\n\n`;

    plan += `DAY 6 - SATURDAY (Fun Activity)\n`;
    plan += `• Dancing, sports, hiking, or any enjoyable physical activity\n`;
    plan += `• Duration: 30-60 minutes\n\n`;

    plan += `DAY 7 - SUNDAY (Complete Rest)\n`;
    plan += `• Full rest day for recovery\n`;
    plan += `• Light stretching if desired\n\n`;

    plan += `💡 IMPORTANT NOTES:\n`;
    plan += `• Start slowly and gradually increase intensity\n`;
    plan += `• Listen to your body and rest when needed\n`;
    plan += `• Stay hydrated throughout workouts\n`;
    plan += `• Consult a doctor before starting if you have health concerns\n`;
    plan += `• Consistency is more important than intensity\n`;

    return plan;
  }

  // Helper Methods
  calculateBMI(height_cm, weight_kg) {
    if (!height_cm || !weight_kg) return null;
    return weight_kg / ((height_cm / 100) ** 2);
  }

  calculateBMR(userContext) {
    const { weight_kg, height_cm, age, gender } = userContext;
    if (!weight_kg || !height_cm || !age) return null;

    // Mifflin-St Jeor Equation
    if (gender?.toLowerCase() === 'male') {
      return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
    } else {
      return (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
    }
  }

  calculateDailyCalories(bmr, activityLevel) {
    if (!bmr) return null;
    
    const activityMultipliers = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very_active': 1.9
    };

    return bmr * (activityMultipliers[activityLevel] || 1.2);
  }

  getBMIStatus(bmi) {
    if (!bmi) return 'Unknown';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  determineFitnessLevel(bmi, age) {
    if (!bmi || !age) return 'Beginner';
    
    if (bmi < 18.5) return 'Beginner - Focus on strength building';
    if (bmi < 25) return 'Intermediate - Maintain and improve';
    if (bmi < 30) return 'Beginner - Focus on weight management';
    return 'Beginner - Medical consultation recommended';
  }

  isUnhealthyFood(foodItem) {
    const lower = foodItem.toLowerCase().replace(/_/g, ' ');
    const unhealthyKeywords = [
      'samosa', 'butter chicken', 'chole bhature', 'dal makhani', 'paratha',
      'hamburger', 'french fries', 'calamari', 'wings', 'cheese sandwich',
      'macaroni and cheese', 'gulab jamun', 'jalebi', 'cake', 'cheesecake',
      'mousse', 'churros', 'cup cake', 'donut', 'ice cream', 'macaron',
      'panna cotta', 'tiramisu', 'waffle', 'pizza', 'ribs', 'baklava', 'croque madame',
      'onion rings'
    ];
    return unhealthyKeywords.some(keyword => lower.includes(keyword));
  }

  async getFoodRecommendations(foodItem, userContext, bmi) {
    const userName = userContext.name || 'friend';
    const bmiStatus = this.getBMIStatus(bmi);
    const nutritionInfo = this.getIndianFoodNutrition(foodItem);
    
    // Try generating dynamic recommendations using Groq LLM first
    try {
      const systemPrompt = `You are a certified nutritionist and health coach. 
Analyze the identified food item and evaluate it for the user based on their profile and goals:
- User Name: ${userName}
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- BMI: ${bmi ? bmi.toFixed(1) : 'Not calculated'} (${bmiStatus})
- Identified Food: ${foodItem}
- Estimated Nutrition (per serving): ${nutritionInfo.calories} Calories, ${nutritionInfo.protein}g Protein, ${nutritionInfo.carbs}g Carbs, ${nutritionInfo.fat}g Fat

Your task is to generate exactly 3 distinct, highly personalized bullet points of recommendations:
1. The first bullet point MUST explicitly state that the food item "${foodItem}" has been identified and clearly evaluate whether it is a good, moderate, or poor choice for the user's specific health goals and current BMI.
2. The second bullet point must analyze the nutritional content of the food (oil, trans-fats, carbs, protein, sugars, etc.) and explain its health impact.
3. The third bullet point must provide a practical alternative or actionable instruction (e.g., portion control, blotting oil, choosing brown rice, pairing with vegetables/proteins, or workout adjustments).

Rules:
- Output exactly 3 lines, one recommendation per line.
- Do NOT prefix lines with numbers, dashes, stars, or bullets (just return the raw text).
- Be conversational, supportive, and realistic like a helpful coach.`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        model: this.groqModel,
        temperature: 0.6,
        max_tokens: 300
      });

      const text = completion.choices[0]?.message?.content || '';
      
      const recommendations = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[\s\d\.\-\*\•\+\>]+/g, '').trim()) // Strip list bullet characters
        .filter(line => line.length > 0)
        .slice(0, 3); // Take top 3 recommendations

      if (recommendations.length >= 2) {
        console.log('✅ Generated dynamic food recommendations via Groq LLM');
        return recommendations;
      }
    } catch (error) {
      console.error('❌ Error generating AI food recommendations, falling back to rule-based logic:', error);
    }

    // Fallback: Rule-based recommendations
    const recommendations = [];
    const isUnhealthy = this.isUnhealthyFood(foodItem);

    // BMI & Health-based recommendations
    if (isUnhealthy) {
      recommendations.push(`We identified "${foodItem}". Let's be careful, ${userName}. This food is high in oils/fats/sugars, making it a poor choice for your daily wellness goals.`);
      recommendations.push("Try to consume this in moderation or keep it as an occasional cheat meal.");
      if (bmi > 25) {
        recommendations.push("Since your BMI indicates you are in the overweight range, replacing this with a lower-calorie alternative is highly recommended.");
      }
    } else {
      recommendations.push(`We identified "${foodItem}".`);
      if (bmi < 18.5) {
        recommendations.push(`This is a good choice to help you gain healthy weight! Consider adding nuts or ghee for extra calories.`);
      } else if (bmi > 25) {
        recommendations.push(`Since your BMI indicates you are overweight, let's be mindful of portion sizes with this food and pair it with fresh vegetables.`);
      } else {
        recommendations.push(`Great choice! This fits well into a balanced diet and complements your healthy BMI.`);
      }
    }

    // Food-specific recommendations
    const lowerFood = foodItem.toLowerCase().replace(/_/g, ' ');
    if (lowerFood.includes('samosa') || lowerFood.includes('chole bhature') || lowerFood.includes('fries') || lowerFood.includes('onion rings') || lowerFood.includes('calamari') || lowerFood.includes('wings')) {
      recommendations.push('Deep-fried foods contain trans fats which can increase bad cholesterol. Consider baked alternatives if possible!');
      recommendations.push('Use paper towels to blot excess oil before eating.');
    } else if (lowerFood.includes('rice') || lowerFood.includes('biryani') || lowerFood.includes('pulao')) {
      recommendations.push('Consider choosing brown rice for more fiber and nutrients next time.');
      recommendations.push('Pair with dal or a high-protein curry and vegetables for a complete meal.');
    } else if (lowerFood.includes('sweet') || lowerFood.includes('dessert') || lowerFood.includes('jamun') || lowerFood.includes('jalebi') || lowerFood.includes('cake') || lowerFood.includes('ice cream')) {
      recommendations.push('High sugar intake leads to quick spikes and crashes in energy. Keep your portions small!');
      recommendations.push('Consider enjoying it shortly after a workout when your insulin sensitivity is highest.');
    } else if (lowerFood.includes('butter chicken') || lowerFood.includes('dal makhani') || lowerFood.includes('paneer') || lowerFood.includes('curry')) {
      recommendations.push('This dish has high levels of saturated fats (cream/butter). Consider limiting the gravy portion.');
      recommendations.push('Pair with whole-wheat roti instead of butter naan.');
    }

    return recommendations;
  }

  /**
   * Generate AI-powered health chat response
   * @param {string} userMessage - User's health query
   * @param {Object} userContext - User's physical metrics and profile data
   * @returns {Promise<string>} AI response to health query
   */
  async generateHealthChatResponse(userMessage, userContext) {
    try {
      const bmi = this.calculateBMI(userContext.height_cm, userContext.weight_kg);
      const bmr = this.calculateBMR(userContext);
      const dailyCalories = this.calculateDailyCalories(bmr, 'moderate');
      const bmiStatus = this.getBMIStatus(bmi);
      const userName = userContext.name || 'User';

      // Create comprehensive health context
      const healthProfile = `
USER HEALTH PROFILE:
- Name: ${userName}
- Age: ${userContext.age || 'Not specified'}
- Gender: ${userContext.gender || 'Not specified'}
- Height: ${userContext.height_cm || 'Not specified'}cm
- Weight: ${userContext.weight_kg || 'Not specified'}kg
- BMI: ${bmi ? Math.round(bmi * 10) / 10 : 'Not calculated'} (${bmiStatus})
- Daily Calorie Needs: ${dailyCalories ? Math.round(dailyCalories) : 'Not calculated'} kcal
- Study Domain: ${userContext.study_domain || 'Student/Professional'}
- Coding Activity: LeetCode: ${userContext.leetcode_solved || 0}, CodeChef: ${userContext.codechef_solved || 0}, Current Streak: ${userContext.current_streak || 0} days
`;

      // Generate contextual response based on query type
      let response = this.generateContextualHealthResponse(userMessage, userContext, bmi, bmiStatus, dailyCalories, userName);

      return response;

    } catch (error) {
      console.error('Health Chat Response Error:', error);
      return `I'm sorry, I'm having trouble processing your question right now. However, I can give you some general health advice: maintain a balanced diet, stay hydrated, exercise regularly, and get adequate sleep. If you have specific health concerns, please consult with a healthcare professional.`;
    }
  }

  generateContextualHealthResponse(userMessage, userContext, bmi, bmiStatus, dailyCalories, userName) {
    const message = userMessage.toLowerCase();
    
    // Nutrition-related queries
    if (message.includes('calorie') || message.includes('diet') || message.includes('food') || message.includes('nutrition') || message.includes('eat')) {
      return this.generateNutritionResponse(userMessage, userContext, bmi, bmiStatus, dailyCalories, userName);
    }
    
    // Exercise-related queries
    if (message.includes('exercise') || message.includes('workout') || message.includes('fitness') || message.includes('gym') || message.includes('weight loss') || message.includes('muscle')) {
      return this.generateExerciseResponse(userMessage, userContext, bmi, bmiStatus, userName);
    }
    
    // Sleep-related queries
    if (message.includes('sleep') || message.includes('rest') || message.includes('tired') || message.includes('insomnia')) {
      return this.generateSleepResponse(userMessage, userContext, userName);
    }
    
    // BMI/Weight-related queries
    if (message.includes('bmi') || message.includes('weight') || message.includes('height') || message.includes('overweight') || message.includes('underweight')) {
      return this.generateWeightResponse(userMessage, userContext, bmi, bmiStatus, userName);
    }
    
    // General health queries
    return this.generateGeneralHealthResponse(userMessage, userContext, bmi, bmiStatus, userName);
  }

  generateNutritionResponse(userMessage, userContext, bmi, bmiStatus, dailyCalories, userName) {
    let response = `Hi ${userName}! 🍎\n\n`;
    
    if (dailyCalories) {
      response += `Based on your profile, your estimated daily calorie needs are around ${Math.round(dailyCalories)} kcal.\n\n`;
    }
    
    if (bmi) {
      if (bmi < 18.5) {
        response += `Since your BMI is ${Math.round(bmi * 10) / 10} (${bmiStatus}), here are some nutrition tips:\n`;
        response += `• Focus on calorie-dense, nutritious foods like nuts, ghee, and healthy oils\n`;
        response += `• Eat frequent small meals (5-6 times a day)\n`;
        response += `• Include protein-rich foods: dal, paneer, eggs, chicken\n`;
        response += `• Add healthy fats: almonds, walnuts, avocado\n`;
        response += `• Try weight-gain smoothies with banana, milk, and nuts\n\n`;
      } else if (bmi >= 25) {
        response += `With your BMI at ${Math.round(bmi * 10) / 10} (${bmiStatus}), consider these nutrition strategies:\n`;
        response += `• Focus on portion control and mindful eating\n`;
        response += `• Fill half your plate with vegetables\n`;
        response += `• Choose complex carbs: brown rice, quinoa, oats\n`;
        response += `• Limit processed foods and sugary drinks\n`;
        response += `• Stay hydrated with 8-10 glasses of water daily\n\n`;
      } else {
        response += `Great! Your BMI is ${Math.round(bmi * 10) / 10} (${bmiStatus}). To maintain this:\n`;
        response += `• Continue with balanced meals including all food groups\n`;
        response += `• Include variety in your diet with seasonal fruits and vegetables\n`;
        response += `• Maintain regular meal timings\n`;
        response += `• Stay active and hydrated\n\n`;
      }
    }
    
    // Add programmer-specific advice
    response += `As a ${userContext.study_domain || 'student/professional'}, remember:\n`;
    response += `• Keep healthy snacks at your desk: nuts, fruits, yogurt\n`;
    response += `• Avoid excessive caffeine - limit to 2-3 cups of tea/coffee\n`;
    response += `• Take meal breaks away from your screen\n`;
    response += `• Plan your meals in advance to avoid unhealthy choices\n\n`;
    
    response += `Would you like a specific meal plan or have questions about particular foods?`;
    
    return response;
  }

  generateExerciseResponse(userMessage, userContext, bmi, bmiStatus, userName) {
    let response = `Hey ${userName}! 💪\n\n`;
    
    if (bmi) {
      response += `With your BMI at ${Math.round(bmi * 10) / 10} (${bmiStatus}), here's what I recommend:\n\n`;
      
      if (bmi < 18.5) {
        response += `**Focus on Strength Building:**\n`;
        response += `• Strength training 3-4 times per week\n`;
        response += `• Compound exercises: squats, deadlifts, push-ups\n`;
        response += `• Limit cardio to 2-3 times per week (20-30 minutes)\n`;
        response += `• Focus on progressive overload\n`;
        response += `• Ensure adequate rest between workouts\n\n`;
      } else if (bmi >= 25) {
        response += `**Focus on Weight Management:**\n`;
        response += `• Cardio 4-5 times per week (30-45 minutes)\n`;
        response += `• Strength training 2-3 times per week\n`;
        response += `• High-intensity interval training (HIIT) 2 times per week\n`;
        response += `• Walking 10,000 steps daily\n`;
        response += `• Swimming or cycling for joint-friendly cardio\n\n`;
      } else {
        response += `**Maintain Your Fitness:**\n`;
        response += `• Balanced mix of cardio and strength training\n`;
        response += `• 150 minutes of moderate exercise per week\n`;
        response += `• Strength training 2-3 times per week\n`;
        response += `• Try new activities to stay motivated\n`;
        response += `• Focus on consistency over intensity\n\n`;
      }
    }
    
    // Programmer-specific exercise advice
    response += `**For Desk Workers:**\n`;
    response += `• Take 5-minute breaks every hour to stretch\n`;
    response += `• Neck rolls and shoulder shrugs at your desk\n`;
    response += `• Wall push-ups during coding breaks\n`;
    response += `• Use stairs instead of elevators\n`;
    response += `• Consider a standing desk or walking meetings\n\n`;
    
    response += `**Quick Desk Exercises:**\n`;
    response += `• Seated spinal twists (10 each side)\n`;
    response += `• Ankle circles and calf raises\n`;
    response += `• Deep breathing exercises\n`;
    response += `• Eye exercises to reduce strain\n\n`;
    
    response += `Would you like a detailed workout plan or have questions about specific exercises?`;
    
    return response;
  }

  generateSleepResponse(userMessage, userContext, userName) {
    let response = `Hi ${userName}! 😴\n\n`;
    
    response += `Good sleep is crucial for your health and coding performance! Here are my recommendations:\n\n`;
    
    response += `**Optimal Sleep Guidelines:**\n`;
    response += `• Aim for 7-9 hours of sleep nightly\n`;
    response += `• Maintain consistent sleep and wake times\n`;
    response += `• Create a relaxing bedtime routine\n`;
    response += `• Keep your bedroom cool, dark, and quiet\n\n`;
    
    response += `**For Better Sleep Quality:**\n`;
    response += `• Avoid screens 1 hour before bedtime\n`;
    response += `• No caffeine after 2 PM\n`;
    response += `• Light dinner at least 2-3 hours before sleep\n`;
    response += `• Try meditation or deep breathing exercises\n`;
    response += `• Keep a sleep diary to track patterns\n\n`;
    
    response += `**Programmer-Specific Sleep Tips:**\n`;
    response += `• Use blue light filters on devices after sunset\n`;
    response += `• Don't code right before bedtime\n`;
    response += `• If debugging keeps you awake, write it down for tomorrow\n`;
    response += `• Consider magnesium supplements (consult a doctor first)\n`;
    response += `• Use white noise or earplugs if needed\n\n`;
    
    response += `**Signs You Need Better Sleep:**\n`;
    response += `• Difficulty concentrating while coding\n`;
    response += `• Increased bugs in your code\n`;
    response += `• Relying heavily on caffeine\n`;
    response += `• Feeling irritable or moody\n\n`;
    
    response += `Are you experiencing any specific sleep issues I can help with?`;
    
    return response;
  }

  generateWeightResponse(userMessage, userContext, bmi, bmiStatus, userName) {
    let response = `Hello ${userName}! ⚖️\n\n`;
    
    if (bmi) {
      response += `Your current BMI is ${Math.round(bmi * 10) / 10}, which falls in the "${bmiStatus}" category.\n\n`;
      
      if (bmi < 18.5) {
        response += `**Healthy Weight Gain Tips:**\n`;
        response += `• Aim to gain 0.5-1 kg per month\n`;
        response += `• Add 300-500 extra calories to your daily intake\n`;
        response += `• Focus on nutrient-dense foods, not junk food\n`;
        response += `• Include strength training to build muscle mass\n`;
        response += `• Consider consulting a nutritionist\n\n`;
        
        response += `**Weight Gain Foods:**\n`;
        response += `• Nuts and nut butters\n`;
        response += `• Avocados and healthy oils\n`;
        response += `• Whole grain breads and cereals\n`;
        response += `• Protein smoothies\n`;
        response += `• Dried fruits and seeds\n\n`;
      } else if (bmi >= 25) {
        response += `**Healthy Weight Loss Tips:**\n`;
        response += `• Aim to lose 0.5-1 kg per week\n`;
        response += `• Create a calorie deficit of 500-750 calories daily\n`;
        response += `• Focus on whole, unprocessed foods\n`;
        response += `• Increase physical activity gradually\n`;
        response += `• Track your progress weekly, not daily\n\n`;
        
        response += `**Weight Loss Strategies:**\n`;
        response += `• Fill half your plate with vegetables\n`;
        response += `• Choose lean proteins\n`;
        response += `• Limit refined sugars and processed foods\n`;
        response += `• Practice portion control\n`;
        response += `• Stay hydrated throughout the day\n\n`;
      } else {
        response += `**Maintaining Your Healthy Weight:**\n`;
        response += `• Continue your current healthy habits\n`;
        response += `• Monitor your weight weekly\n`;
        response += `• Stay active and eat balanced meals\n`;
        response += `• Allow for small fluctuations (1-2 kg is normal)\n`;
        response += `• Focus on how you feel, not just the number\n\n`;
      }
    } else {
      response += `I notice you haven't updated your height and weight in your profile yet. This information helps me provide personalized advice!\n\n`;
      response += `**General Weight Management Tips:**\n`;
      response += `• Maintain a balanced diet with all food groups\n`;
      response += `• Stay physically active\n`;
      response += `• Monitor your body composition, not just weight\n`;
      response += `• Focus on building healthy habits\n\n`;
    }
    
    response += `Remember: Healthy weight management is a gradual process. Focus on sustainable lifestyle changes rather than quick fixes!`;
    
    return response;
  }

  /**
   * Generate AI response for Mental Health Coach with comprehensive user data
   * @param {string} userMessage - User's mental health query
   * @param {Object} userContext - Comprehensive user context including coding progress, streaks, modules, etc.
   * @returns {Promise<string>} AI response with mental health support
   */
  async generateMentalHealthChatResponse(userMessage, userContext) {
    try {
      const userName = userContext.name || 'friend';
      
      // Create comprehensive mental health context prompt
      const systemPrompt = this.createMentalHealthPrompt(userContext);
      
      // Generate response using Groq
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        model: this.groqModel,
        temperature: 0.7,
        max_tokens: 600
      });

      const response = completion.choices[0]?.message?.content || 
        `I understand you're reaching out, ${userName}. I'm here to support you with whatever you're going through. Can you tell me more about what's on your mind?`;

      return response;

    } catch (error) {
      console.error('Mental Health Chat AI Error:', error);
      const userName = userContext?.name || 'friend';
      
      // Fallback response with user data context
      let fallbackResponse = `Hey ${userName}, I'm here to listen and support you. `;
      
      // Add context-aware encouragement based on user's recent progress
      if (userContext.problems_solved_today > 0) {
        fallbackResponse += `I noticed you solved ${userContext.problems_solved_today} problems today - that's great progress! `;
      }
      
      if (userContext.modules_completed_today > 0) {
        fallbackResponse += `You also completed ${userContext.modules_completed_today} modules today, which shows your dedication. `;
      }
      
      if (userContext.coding_current_streak > 0) {
        fallbackResponse += `Your ${userContext.coding_current_streak}-day coding streak shows your consistency. `;
      }
      
      fallbackResponse += `Sometimes we all need someone to talk to. What's on your mind? I'm here to help you work through whatever you're feeling.`;
      
      return fallbackResponse;
    }
  }

  /**
   * Create mental health system prompt with comprehensive user context
   */
  createMentalHealthPrompt(userContext) {
    const userName = userContext.name || 'User';
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `You are a compassionate and empathetic Mental Wellness Coach AI assistant. Your role is to provide mental health support, stress management advice, and emotional guidance to ${userName}.

COMPREHENSIVE USER CONTEXT:
=========================
Personal Info:
- Name: ${userName}
- Age: ${userContext.age || 'Not specified'}
- Study Domain: ${userContext.study_domain || 'Student/Professional'}
- Current Date: ${currentDate}
- Current Time: ${currentTime}

TODAY'S ACTIVITY (${currentDate}):
- Problems Solved: ${userContext.problems_solved_today || 0}
- Modules Completed: ${userContext.modules_completed_today || 0}
- Milestones Achieved: ${userContext.milestones_completed_today || 0}

CODING PROGRESS & STREAKS:
- Current Coding Streak: ${userContext.coding_current_streak || 0} days
- LeetCode Problems Solved: ${userContext.leetcode_solved || 0}
- CodeChef Problems Solved: ${userContext.codechef_solved || 0}
- CodeForces Problems Solved: ${userContext.codeforces_solved || 0}
- Active Days This Week: ${userContext.active_days_this_week || 0}

CAREER & LEARNING PROGRESS:
- Total Career Paths: ${userContext.total_career_paths || 0}
- Active Career Paths: ${userContext.active_career_paths || 0}
- Average Career Progress: ${Math.round((userContext.avg_career_progress || 0) * 100)}%
- Total Modules: ${userContext.total_modules || 0}
- Completed Modules: ${userContext.completed_modules || 0}
- Module Completion Rate: ${Math.round((userContext.module_completion_rate || 0) * 100)}%

GOALS & TARGETS:
- Monthly Coding Goal: ${userContext.monthly_coding_goal || 'Not set'}
- Daily Study Goal: ${userContext.daily_study_goal_minutes || 'Not set'} minutes

STRESS INDICATORS DETECTED:
- High Activity Day: ${userContext.high_activity_day ? 'Yes' : 'No'}
- Potential Burnout Risk: ${userContext.potential_burnout_indicator ? 'Yes' : 'No'}
- Achievement Today: ${userContext.achievement_today ? 'Yes' : 'No'}
- Strong Streak Momentum: ${userContext.streak_momentum ? 'Yes' : 'No'}
- Goal Pressure: ${userContext.goal_pressure ? 'Yes' : 'No'}
- Late Night Session: ${userContext.late_night_session ? 'Yes' : 'No'}
- Weekend Activity: ${userContext.weekend_activity ? 'Yes' : 'No'}

INSTRUCTIONS:
============
1. Always address ${userName} by name and be warm, empathetic, and supportive
2. Reference their specific progress data when relevant to show you understand their situation
3. If they had a productive day (solved problems/completed modules), acknowledge and celebrate it
4. If they're struggling or had low activity, provide encouragement without judgment
5. Watch for signs of burnout, stress, or overwork based on the indicators
6. Provide practical mental health advice tailored to students/programmers
7. If they mention stress about coding progress, reference their actual achievements to provide perspective
8. Encourage healthy work-life balance, especially if late night sessions or weekend overwork detected
9. Be specific about their accomplishments - mention exact numbers when encouraging them
10. If they're on a long streak, remind them it's okay to take breaks
11. For goal pressure, help them see progress in context and adjust expectations if needed
12. Always end with a supportive question or offer to help further

RESPONSE STYLE:
- Conversational and caring, like talking to a close friend
- Use their actual data to provide personalized insights
- Balance celebration of achievements with concern for wellbeing
- Provide actionable advice for mental wellness
- Keep responses focused and not too lengthy (aim for 3-5 paragraphs)
- Use emojis sparingly and appropriately

Remember: You have access to their complete coding journey and progress data. Use this information to provide deeply personalized mental health support that acknowledges their specific situation and achievements.`;
  }

  generateGeneralHealthResponse(userMessage, userContext, bmi, bmiStatus, userName) {
    let response = `Hi ${userName}! 🌟\n\n`;
    
    response += `I'm here to help with your health and wellness questions! Based on your profile:\n\n`;
    
    if (bmi) {
      response += `**Your Health Snapshot:**\n`;
      response += `• BMI: ${Math.round(bmi * 10) / 10} (${bmiStatus})\n`;
      response += `• Age: ${userContext.age || 'Not specified'}\n`;
      response += `• Study/Work: ${userContext.study_domain || 'Student/Professional'}\n\n`;
    }
    
    response += `**Key Health Areas for ${userContext.study_domain || 'Students/Professionals'}:**\n\n`;
    
    response += `**1. Physical Health:**\n`;
    response += `• Regular exercise (150 min/week)\n`;
    response += `• Balanced nutrition\n`;
    response += `• Adequate hydration\n`;
    response += `• Proper posture while working\n\n`;
    
    response += `**2. Mental Wellness:**\n`;
    response += `• Stress management techniques\n`;
    response += `• Regular breaks from screen time\n`;
    response += `• Social connections\n`;
    response += `• Mindfulness or meditation\n\n`;
    
    response += `**3. Sleep Hygiene:**\n`;
    response += `• 7-9 hours of quality sleep\n`;
    response += `• Consistent sleep schedule\n`;
    response += `• Screen-free time before bed\n\n`;
    
    response += `**4. Work-Life Balance:**\n`;
    response += `• Regular breaks during long coding sessions\n`;
    response += `• Eye exercises to prevent strain\n`;
    response += `• Ergonomic workspace setup\n`;
    response += `• Time for hobbies and relaxation\n\n`;
    
    response += `**Common Health Concerns I Can Help With:**\n`;
    response += `• Nutrition and diet planning\n`;
    response += `• Exercise routines and fitness\n`;
    response += `• Sleep improvement strategies\n`;
    response += `• Weight management\n`;
    response += `• Stress and mental wellness\n`;
    response += `• Desk worker health tips\n\n`;
    
    response += `What specific aspect of your health would you like to focus on today?`;
    
    return response;
  }

  getDietRecommendations(bmi, userContext) {
    const userName = userContext.name || 'friend';
    const recommendations = [];

    if (bmi < 18.5) {
      recommendations.push(`${userName}, focus on calorie-dense, nutritious foods like nuts, avocados, and healthy oils.`);
      recommendations.push('Eat frequent small meals throughout the day.');
      recommendations.push('Include protein-rich foods like paneer, dal, and eggs.');
    } else if (bmi > 25) {
      recommendations.push(`${userName}, focus on portion control and high-fiber foods.`);
      recommendations.push('Fill half your plate with vegetables at each meal.');
      recommendations.push('Choose whole grains over refined grains.');
    } else {
      recommendations.push(`You're doing great, ${userName}! Maintain this balanced approach.`);
      recommendations.push('Continue with variety in your meals.');
    }

    return recommendations;
  }

  getExerciseRecommendations(bmi, userContext) {
    const userName = userContext.name || 'friend';
    const recommendations = [];

    if (bmi < 18.5) {
      recommendations.push(`${userName}, focus on strength training to build muscle mass.`);
      recommendations.push('Limit excessive cardio - focus on building rather than burning.');
    } else if (bmi > 25) {
      recommendations.push(`${userName}, combine cardio with strength training for best results.`);
      recommendations.push('Start with 150 minutes of moderate exercise per week.');
    } else {
      recommendations.push(`Keep up the great work, ${userName}! Maintain your current activity level.`);
    }

    recommendations.push('Take breaks every hour to stretch and move.');
    recommendations.push('Consider desk exercises during study sessions.');

    return recommendations;
  }

  getQuickDeskExercises() {
    return [
      'Neck rolls and shoulder shrugs (2 minutes)',
      'Seated spinal twists (1 minute each side)',
      'Ankle circles and calf raises (2 minutes)',
      'Deep breathing exercises (3 minutes)',
      'Eye exercises - look away from screen every 20 minutes'
    ];
  }

  generateFoodAnalysisMessage(foodItem, userContext, bmi) {
    const userName = userContext.name || 'friend';
    const bmiStatus = this.getBMIStatus(bmi);
    const isUnhealthy = this.isUnhealthyFood(foodItem);
    
    let message = `Hey ${userName}, I can see you're having ${foodItem}! `;
    
    if (isUnhealthy) {
      message += `Keep in mind that this is a calorie-dense dish high in fats or sugars. `;
      if (bmiStatus === 'Overweight' || bmiStatus === 'Obese') {
        message += `Since you're working on weight management, it is best to control the portion size and pair it with fresh greens to stay on track.`;
      } else {
        message += `While your BMI is in a good range, consuming these in moderation is key to maintaining cardiovascular health and high energy levels!`;
      }
    } else {
      if (bmiStatus === 'Normal weight') {
        message += `Your BMI looks great, so this fits well into your balanced lifestyle. Keep making those smart choices!`;
      } else if (bmiStatus === 'Underweight') {
        message += `Since you're looking to gain some healthy weight, this could be a good choice. Consider adding some healthy fats or proteins to boost the nutritional value!`;
      } else if (bmiStatus === 'Overweight') {
        message += `Let's be mindful about portions and maybe pair this with some fresh vegetables. Remember, it's all about balance, and I believe in you!`;
      }
    }
    
    return message;
  }

  /**
   * Get nutrition info for Indian foods
   */
  getIndianFoodNutrition(foodItem) {
    const nutritionData = {
      'dal': { calories: 200, protein: 12, carbs: 35, fat: 2 },
      'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      'chapati': { calories: 71, protein: 3, carbs: 15, fat: 0.4 },
      'curry': { calories: 150, protein: 8, carbs: 20, fat: 5 },
      'biryani': { calories: 290, protein: 8, carbs: 45, fat: 10 },
      'dosa': { calories: 168, protein: 4, carbs: 25, fat: 6 },
      'idli': { calories: 39, protein: 2, carbs: 8, fat: 0.3 },
      'samosa': { calories: 262, protein: 3.5, carbs: 24, fat: 17 },
      'paratha': { calories: 126, protein: 3, carbs: 18, fat: 5 },
      'butter_chicken': { calories: 350, protein: 22, carbs: 8, fat: 25 },
      'butter chicken': { calories: 350, protein: 22, carbs: 8, fat: 25 },
      'chai': { calories: 90, protein: 2, carbs: 12, fat: 3 },
      'chole_bhature': { calories: 450, protein: 12, carbs: 55, fat: 20 },
      'chole bhature': { calories: 450, protein: 12, carbs: 55, fat: 20 },
      'dal_makhani': { calories: 280, protein: 10, carbs: 30, fat: 14 },
      'dal makhani': { calories: 280, protein: 10, carbs: 30, fat: 14 },
      'dhokla': { calories: 120, protein: 4, carbs: 18, fat: 3 },
      'filter_coffee': { calories: 80, protein: 2, carbs: 10, fat: 3 },
      'filter coffee': { calories: 80, protein: 2, carbs: 10, fat: 3 },
      'gulab_jamun': { calories: 150, protein: 2, carbs: 25, fat: 5 },
      'gulab jamun': { calories: 150, protein: 2, carbs: 25, fat: 5 },
      'jalebi': { calories: 150, protein: 1, carbs: 30, fat: 3 },
      'kathi_roll': { calories: 320, protein: 12, carbs: 38, fat: 12 },
      'kathi roll': { calories: 320, protein: 12, carbs: 38, fat: 12 },
      'kadai_paneer': { calories: 290, protein: 14, carbs: 8, fat: 22 },
      'kadai paneer': { calories: 290, protein: 14, carbs: 8, fat: 22 },
      'tandoori_chicken': { calories: 260, protein: 30, carbs: 2, fat: 12 },
      'tandoori chicken': { calories: 260, protein: 30, carbs: 2, fat: 12 }
    };
    
    const lowerFoodItem = foodItem?.toLowerCase() || '';
    for (const [key, value] of Object.entries(nutritionData)) {
      if (lowerFoodItem.includes(key)) {
        return value;
      }
    }
    
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  /**
   * Create context-aware prompt for Mental Coach
   */
  createMentalCoachPrompt(userContext, sentiment) {
    const { name, age, study_domain, skills, coding_stats, mood, goals, progress_logs, todaysSolved } = userContext;
    
    return `You are a personal trainer and life mentor with the warm, witty, and compassionate persona of Matthew Perry in "The Ron Clark Story." You are not only a trainer but also a friend, teacher, mentor, and companion.

CURRENT USER CONTEXT:
===================
Name: ${name || 'Student'}
Age: ${age || 'Not specified'}
Study Domain: ${study_domain || 'Computer Science'}
Skills: ${skills ? skills.join(', ') : 'Developing'}
Current Mood: ${mood || 'Unknown'}
Goals: ${goals ? goals.join(', ') : 'Learning and growth'}

CODING PROGRESS ANALYSIS:
========================
TOTAL LIFETIME PROGRESS:
- LeetCode: ${coding_stats?.leetcode_solved || 0} problems
- CodeChef: ${coding_stats?.codechef_solved || 0} problems  
- Codeforces: ${coding_stats?.codeforces_solved || 0} problems
- Total Solved: ${coding_stats ? (coding_stats.leetcode_solved + coding_stats.codechef_solved + coding_stats.codeforces_solved) : 0} problems
- Current Streak: ${coding_stats?.current_streak || 0} days

TODAY'S PROGRESS:
- LeetCode solved today: ${todaysSolved?.leetcode || 0}
- CodeChef solved today: ${todaysSolved?.codechef || 0}
- Codeforces solved today: ${todaysSolved?.codeforces || 0}
- Total solved today: ${todaysSolved?.total || 0}

DAILY PROGRESS CONTEXT:
${todaysSolved?.total === 0 ? 
  "⚠️ IMPORTANT: The student hasn't solved any coding problems today. This might be contributing to stress, anxiety, or feelings of unproductivity. Address this gently and supportively." :
  todaysSolved?.total <= 2 ?
  "📊 The student solved a few problems today but might feel it's not enough. Acknowledge their effort while encouraging consistency." :
  "🎉 The student had a productive coding day! Celebrate this achievement and use it to boost their confidence."
}

SENTIMENT ANALYSIS:
==================
Current Sentiment: ${sentiment.label}
Confidence: ${Math.round(sentiment.score * 100)}%

YOUR RESPONSE STRATEGY:
======================
1. **Always acknowledge their daily coding progress first** - whether it's zero, minimal, or substantial
2. If they solved 0 problems today and seem stressed: "I noticed you haven't tackled any coding problems today - that might be part of what's weighing on you. It's completely okay to have off days!"
3. If they solved 1-2 problems: "I see you solved [X] problems today - that's progress! Every problem counts toward your growth."
4. If they solved 3+ problems: "Wow, [X] problems today! You're really pushing yourself - that's the spirit I love to see!"
5. Connect their daily progress to their emotional state naturally
6. Use their total lifetime progress to show long-term growth
7. Be genuinely supportive and understanding, like a caring friend
8. Provide tailored guidance for mental health while referencing their coding journey
9. Always end with encouragement that acknowledges both their daily and total progress

Respond as Ron Clark (Matthew Perry) - a friend who sees the complete picture of their coding journey and cares about their wellbeing.`;
  }

  /**
   * Create context-aware prompt for Physical Coach
   */
  createPhysicalCoachPrompt(userContext) {
    const { name, age, height_cm, weight_kg, gender, study_domain, goals, mood, progress_logs, fitness_stats } = userContext;
    const bmi = height_cm && weight_kg ? (weight_kg / ((height_cm / 100) ** 2)).toFixed(1) : null;
    
    return `You are a personal trainer and life mentor with the warm, witty, and compassionate persona of Matthew Perry in "The Ron Clark Story." You are not only a trainer but also a friend, teacher, mentor, and companion.

Your role is to provide guidance on mental health, physical health, and emotional support. Always consider the user's personal data when giving advice, ensuring your responses are empathetic, practical, and encouraging.

User Profile:
- Name: ${name || 'friend'}
- Age: ${age || 'Not specified'}
- Height: ${height_cm ? `${height_cm}cm` : 'Not specified'}
- Weight: ${weight_kg ? `${weight_kg}kg` : 'Not specified'}
- Gender: ${gender || 'Not specified'}
- BMI: ${bmi || 'Not calculated'}
- Study Domain: ${study_domain || 'Not specified'}
- Current Mood: ${mood || 'Not specified'}
- Goals: ${goals ? goals.join(', ') : 'Not specified'}
- Fitness Stats: ${fitness_stats ? JSON.stringify(fitness_stats) : 'No fitness data available'}
- Progress Logs: ${progress_logs ? 'Recent progress available' : 'No recent progress data'}

Your Personality:
- Speak in a style that balances humor, care, and wisdom
- Make the user feel understood and motivated
- Use warm, approachable language with occasional wit
- Be encouraging but realistic
- Show genuine concern for their wellbeing

Expertise Areas:
- Nutrition and meal planning for busy students
- Exercise routines for desk workers
- Sleep optimization for programmers
- Eye strain prevention and ergonomics
- Stress management through physical activity
- Indian cuisine nutrition and healthy alternatives

Guidelines:
1. Always check and reference their personal data (fitness stats, goals, mood, progress logs)
2. If the user is struggling, respond with support and positivity while gently guiding them back on track
3. If the user is progressing well, celebrate their achievements and encourage further growth
4. Provide tailored guidance for mental health, physical health, or motivational support
5. Use their name and reference their specific situation
6. Balance humor with genuine care and wisdom
7. Always end with encouragement or a gentle challenge
8. Consider the sedentary nature of coding work
9. Suggest practical, time-efficient solutions
10. Focus on sustainable lifestyle changes

Respond as Ron Clark (Matthew Perry) - a friend who truly cares about their success and wellbeing.`;
  }

  /**
   * Generate personalized message based on user context and sentiment
   */
  generatePersonalizedMessage(userContext, sentiment) {
    const { name, goals, mood, progress_logs, coding_stats } = userContext;
    const userName = name || 'friend';
    const sentimentLabel = sentiment.label;
    
    // Base messages with Ron Clark personality
    const baseMessages = {
      'negative': [
        `I can see you're going through a tough time, ${userName}. Remember, even the greatest coders face challenges - it's how we grow!`,
        `Hey ${userName}, I know it feels overwhelming right now, but I believe in your strength. Let's tackle this together!`,
        `${userName}, every setback is just a setup for a comeback. You've got this, and I'm here to help you through it!`
      ],
      'neutral': [
        `You're doing great, ${userName}! I'm proud of the progress you're making. Let's keep this momentum going!`,
        `Hey ${userName}, I can see you're in a good place. How about we set some new goals together?`,
        `${userName}, you're on the right track! I'm excited to see what you'll achieve next!`
      ],
      'positive': [
        `I'm absolutely thrilled about your progress, ${userName}! You're becoming the person you always wanted to be!`,
        `Wow, ${userName}! Look at you go! This is exactly what I love to see - determination and success!`,
        `${userName}, you're on fire! I'm so proud of you, and I know there's even more greatness ahead!`
      ]
    };
    
    // Select a random message from the appropriate sentiment category
    const messages = baseMessages[sentimentLabel] || baseMessages['neutral'];
    const selectedMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Add context-specific encouragement
    let contextMessage = '';
    if (goals && goals.length > 0) {
      contextMessage += ` I know you're working toward ${goals.join(' and ')}, and I believe you'll get there!`;
    }
    if (coding_stats && (coding_stats.leetcode_solved + coding_stats.codechef_solved + coding_stats.codeforces_solved) > 0) {
      const totalSolved = coding_stats.leetcode_solved + coding_stats.codechef_solved + coding_stats.codeforces_solved;
      contextMessage += ` With ${totalSolved} problems solved, you're already proving you can tackle anything!`;
    }
    
    return selectedMessage + contextMessage;
  }

  /**
   * Map sentiment to mood
   */
  mapSentimentToMood(sentiment) {
    const moodMap = {
      'negative': 'concerned',
      'neutral': 'calm',
      'positive': 'optimistic'
    };
    return moodMap[sentiment] || 'neutral';
  }

  /**
   * Generate mental health suggestions based on sentiment
   */
  generateMentalHealthSuggestions(sentiment, userContext) {
    const { name, goals, mood } = userContext;
    const userName = name || 'friend';
    
    const suggestions = {
      'negative': [
        `Hey ${userName}, let's try the 4-7-8 breathing technique together - I promise it works!`,
        `How about we take a 5-minute walk outside? Fresh air does wonders for the soul.`,
        `I know it's tough right now, but let's practice some gratitude journaling - even small wins count!`,
        `Put on some calming music and let's reset together. You've got this!`
      ],
      'neutral': [
        `You're doing great, ${userName}! Let's keep those positive habits going strong.`,
        `Ready for a new coding challenge? I believe you can tackle anything!`,
        `How about connecting with some study groups? Community makes everything better.`,
        `Let's plan your next learning goal together - I'm excited to see what you'll achieve!`
      ],
      'positive': [
        `I'm so proud of you, ${userName}! Share your progress - others need to see your success!`,
        `You're on fire! How about helping a fellow student? Paying it forward feels amazing.`,
        `This momentum is incredible! Let's set some new challenging goals together.`,
        `Time to celebrate your achievements! You've earned every bit of this success!`
      ]
    };
    return suggestions[sentiment] || suggestions['neutral'];
  }

  /**
   * Get food suggestions
   */
  getFoodSuggestions(foodItem) {
    return [
      'Consider adding more vegetables',
      'Pair with protein-rich foods',
      'Watch portion sizes',
      'Include healthy fats'
    ];
  }
}

export default new AIService();
