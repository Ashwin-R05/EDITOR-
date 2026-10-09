"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../models/db");
async function migrate() {
    console.log('🚀 Running database migrations...');
    const connected = await (0, db_1.testConnection)();
    if (!connected) {
        console.error('Cannot run migrations without database connection.');
        process.exit(1);
    }
    // Look for migrations in multiple possible deployment locations
    const candidateDirs = [
        process.env.MIGRATIONS_DIR,
        path_1.default.resolve(__dirname, '../../../database/migrations'),
        path_1.default.resolve(__dirname, '../../database/migrations'),
        path_1.default.resolve(process.cwd(), '../database/migrations'),
        path_1.default.resolve(process.cwd(), 'database/migrations'),
        path_1.default.resolve(process.cwd(), 'migrations'),
    ].filter(Boolean);
    const migrationsDir = candidateDirs.find((dir) => fs_1.default.existsSync(dir));
    if (!migrationsDir) {
        console.error('✗ Migration directory not found. Candidates checked:', candidateDirs);
        process.exit(1);
    }
    console.log(`📁 Applying migrations from: ${migrationsDir}`);
    const files = fs_1.default.readdirSync(migrationsDir).sort();
    for (const file of files) {
        if (file.endsWith('.sql')) {
            const filePath = path_1.default.join(migrationsDir, file);
            const sql = fs_1.default.readFileSync(filePath, 'utf-8');
            try {
                console.log(`Applying ${file}...`);
                await (0, db_1.query)(sql);
                console.log(`✓ Migration ${file} applied successfully`);
            }
            catch (error) {
                // If enum already added or duplicate object, log and continue
                if (error.code === '42710' || error.message?.includes('already exists')) {
                    console.log(`ℹ Migration ${file} already applied or object exists`);
                }
                else {
                    console.error(`✗ Migration ${file} failed:`, error.message);
                }
            }
        }
    }
    console.log('✅ All migrations verified successfully');
    process.exit(0);
}
migrate().catch((err) => {
    console.error('Migration process failed:', err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map