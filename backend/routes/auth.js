import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import { validateRequest, registerSchema, loginSchema } from '../middleware/validation.js';

const router = express.Router();

// Register endpoint
router.post('/register', validateRequest(registerSchema), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create user
    const userResult = await client.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, passwordHash]
    );
    
    const user = userResult.rows[0];
    
    // Create related records
    await client.query(
      'INSERT INTO user_profiles (user_id) VALUES ($1)',
      [user.id]
    );
    
    await client.query(
      'INSERT INTO coding_stats (user_id) VALUES ($1)',
      [user.id]
    );
    
    await client.query(
      'INSERT INTO user_goals (user_id) VALUES ($1)',
      [user.id]
    );
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at
        }
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration'
    });
  } finally {
    client.release();
  }
});

// Login endpoint
router.post('/login', validateRequest(loginSchema), async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const userResult = await client.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });
    
    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        userName: user.name,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login'
    });
  } finally {
    client.release();
  }
});

export default router;
