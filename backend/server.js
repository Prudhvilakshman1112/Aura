import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { pool } from './config/database.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import dashboardRoutes from './routes/dashboard.js';
import trackerRoutes from './routes/tracker.js';
import scrapeRoutes from './routes/scrape.js';
import activityRoutes from './routes/activity.js';
import physicalCoachRoutes from './routes/physicalCoach.js';
import mentalCoachRoutes from './routes/mentalCoach.js';
import physicalRoutes from './routes/physical.js';
import roadmapRoutes from './routes/roadmaps.js';
import progressRoutes from './routes/progress.js';
import goalsRoutes from './routes/goals.js';
import dailyTrackingRoutes from './routes/dailyTracking.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    res.json({
      status: 'success',
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/scrape', scrapeRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/physical-coach', physicalCoachRoutes);
app.use('/api/mental-coach', mentalCoachRoutes);
app.use('/api/physical', physicalRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/daily-tracking', dailyTrackingRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Aura Synergy Hub Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      user: '/api/user',
      dashboard: '/api/dashboard',
      tracker: '/api/tracker',
      goals: '/api/goals',
      scrape: '/api/scrape',
      physical: '/api/physical',
      roadmaps: '/api/roadmaps',
      progress: '/api/progress',
      activity: '/api/activity',
      dailyTracking: '/api/daily-tracking',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    status: 'error',
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Aura Synergy Hub Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Ensure database columns exist on startup (with delay to avoid connection conflicts)
  setTimeout(async () => {
    try {
      await ensureColumnsExist();
    } catch (error) {
      console.log('⚠️ Migration skipped due to connection limits - will retry on next request');
    }
  }, 2000);
});

export default app;
