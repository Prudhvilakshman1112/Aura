import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Generate a test JWT token
const testUser = {
  userId: 1,
  email: 'test@example.com',
  name: 'Test User'
};

const token = jwt.sign(testUser, process.env.JWT_SECRET, {
  expiresIn: '1h'
});

console.log('Generated test JWT token:');
console.log(token);
console.log('\nUse this token in your API requests:');
console.log(`Authorization: Bearer ${token}`);
