import pool from '../config/database.js';

// Middleware to ensure proper connection handling
export const withDatabaseConnection = (handler) => {
  return async (req, res, next) => {
    const client = await pool.connect();
    
    try {
      // Add client to request object
      req.dbClient = client;
      
      // Call the handler
      await handler(req, res, next);
      
    } catch (error) {
      console.error('Database operation error:', error);
      
      // Handle specific database errors
      if (error.code === '53300') {
        return res.status(503).json({
          status: 'error',
          message: 'Database temporarily unavailable. Please try again in a moment.',
          code: 'DB_CONNECTION_LIMIT'
        });
      }
      
      if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
          status: 'error',
          message: 'Database connection lost. Please try again.',
          code: 'DB_CONNECTION_ERROR'
        });
      }
      
      // Generic database error
      return res.status(500).json({
        status: 'error',
        message: 'Database operation failed',
        code: 'DB_ERROR'
      });
      
    } finally {
      // Always release the connection
      if (client) {
        client.release();
      }
    }
  };
};

// Helper function to execute queries with automatic retry
export const executeWithRetry = async (queryFn, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.code === '23505' || error.code === '23503') { // Unique violation, foreign key violation
        throw error;
      }
      
      // If connection limit reached, wait and retry
      if (error.code === '53300' && attempt < maxRetries) {
        console.log(`Connection limit reached, retrying in ${attempt * 1000}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
        continue;
      }
      
      // If last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }
  
  throw lastError;
};

// Connection pool health check
export const checkPoolHealth = () => {
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
    maxConnections: pool.options.max,
    healthy: pool.totalCount < pool.options.max && pool.waitingCount === 0
  };
};
