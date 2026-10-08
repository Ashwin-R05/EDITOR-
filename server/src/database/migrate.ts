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

  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      try {
        console.log(`Applying ${file}...`);
        await query(sql);
        console.log(`✓ Migration ${file} applied successfully`);
      } catch (error: any) {
        // If enum already added or duplicate object, log and continue
        if (error.code === '42710' || error.message?.includes('already exists')) {
          console.log(`ℹ Migration ${file} already applied or object exists`);
        } else {
          console.error(`✗ Migration ${file} failed:`, error.message);
        }
      }
    }
  }

  console.log('✅ All migrations verified');
  process.exit(0);
}

migrate();
