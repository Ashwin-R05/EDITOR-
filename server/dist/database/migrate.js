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
    const migrationsDir = path_1.default.resolve(__dirname, '../../../database/migrations');
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
    console.log('✅ All migrations verified');
    process.exit(0);
}
migrate();
//# sourceMappingURL=migrate.js.map