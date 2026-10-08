import fs from 'fs';
import path from 'path';
import { query, testConnection } from '../models/db';

async function migrate() {
  console.log('🚀 Running database migrations...');

  const connected = await testConnection();
  if (!connected) {
    console.error('Cannot run migrations without database connection.');
    process.exit(1);
  }

  const migrationFile = path.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationFile, 'utf-8');

  try {
    await query(sql);
    console.log('✓ Migration 001_initial_schema.sql applied successfully');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }

  console.log('✅ All migrations completed');
  process.exit(0);
}

migrate();
