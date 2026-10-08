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
    const migrationFile = path_1.default.resolve(__dirname, '../../../database/migrations/001_initial_schema.sql');
    const sql = fs_1.default.readFileSync(migrationFile, 'utf-8');
    try {
        await (0, db_1.query)(sql);
        console.log('✓ Migration 001_initial_schema.sql applied successfully');
    }
    catch (error) {
        console.error('✗ Migration failed:', error);
        process.exit(1);
    }
    console.log('✅ All migrations completed');
    process.exit(0);
}
migrate();
//# sourceMappingURL=migrate.js.map