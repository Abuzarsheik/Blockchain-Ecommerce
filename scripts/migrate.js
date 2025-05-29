const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
    console.log('🚀 Starting Blocmerce database migration...');

    // Database connection
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/blocmerce',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
        // Test connection
        console.log('📊 Testing database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database connection successful');

        // Read migration file
        const migrationPath = path.join(__dirname, '..', 'backend', 'migrations', '001_initial_schema.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        console.log('📄 Migration file loaded successfully');

        // Run migration
        console.log('⚙️  Executing database migration...');
        await pool.query(migrationSQL);
        console.log('✅ Database migration completed successfully!');

        // Verify tables were created
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('📋 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Check sample data
        const productsCount = await pool.query('SELECT COUNT(*) FROM products');
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');

        console.log('\n📊 Sample data:');
        console.log(`   - Users: ${usersCount.rows[0].count}`);
        console.log(`   - Products: ${productsCount.rows[0].count}`);

        console.log('\n🎉 Migration completed successfully!');
        console.log('🔑 Default admin login: admin@blocmerce.com / admin123');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    runMigration();
}

module.exports = runMigration; 