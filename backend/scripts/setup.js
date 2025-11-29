import resetDatabase from './resetDatabase.js';
import createSchema from './createSchema.js';

async function setupDatabase() {
  try {
    console.log('🔄 Starting database setup...\n');
    
    // Step 1: Reset database (drop all tables)
    console.log('Step 1: Resetting database...');
    await resetDatabase();
    console.log('✅ Database reset completed\n');
    
    // Step 2: Create new schema
    console.log('Step 2: Creating database schema...');
    await createSchema();
    console.log('✅ Database schema created\n');
    
    console.log('🎉 Database setup completed successfully!');
    console.log('The backend is now ready to use.');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Setup script failed:', error);
      process.exit(1);
    });
}

export default setupDatabase;
