"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
exports.getClient = getClient;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const config_1 = require("../config");
const poolConfig = {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};
if (config_1.config.db.url) {
    poolConfig.connectionString = config_1.config.db.url;
    if (config_1.config.db.ssl) {
        poolConfig.ssl = { rejectUnauthorized: false };
    }
}
else {
    poolConfig.host = config_1.config.db.host;
    poolConfig.port = config_1.config.db.port;
    poolConfig.database = config_1.config.db.name;
    poolConfig.user = config_1.config.db.user;
    poolConfig.password = config_1.config.db.password;
    if (config_1.config.db.ssl) {
        poolConfig.ssl = { rejectUnauthorized: false };
    }
}
const pool = new pg_1.Pool(poolConfig);
pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config_1.config.nodeEnv === 'development') {
        console.log('[DB]', { text: text.substring(0, 80), duration: `${duration}ms`, rows: result.rowCount });
    }
    return result;
}
async function getClient() {
    const client = await pool.connect();
    return client;
}
async function testConnection() {
    try {
        await pool.query('SELECT NOW()');
        console.log('✓ Database connected successfully');
        return true;
    }
    catch (error) {
        console.error('✗ Database connection failed:', error.message || error);
        return false;
    }
}
exports.default = pool;
//# sourceMappingURL=db.js.map