const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sri_vinayaka',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const seed = async () => {
  try {
    console.log('🌱 Seeding database...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';

    // Create default admin with bcrypt salt rounds = 12
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET password_hash = $2
       RETURNING id, email`,
      [adminEmail.toLowerCase(), passwordHash, 'Admin']
    );

    const userId = result.rows[0].id;

    await pool.query(
      `INSERT INTO profiles (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [userId, 'Admin']
    );

    console.log('✅ Default admin created:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');
    console.log('⚠️  Change this password after first login!');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    await pool.end();
    process.exit(1);
  }
};

seed();
