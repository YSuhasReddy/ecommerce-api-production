const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load .env file from the ecommerce-api directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
const requiredEnvVars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
console.error(`\n Missing required environment variables: ${missingVars.join(', ')}`);
console.error(`\n Please create a .env file in the ecommerce-api directory with:`);
console.error(`
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce_db
NODE_ENV=development
PORT=5000
`);
process.exit(1);
}

// Common pool configuration
const poolConfig = {
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
database: process.env.DB_NAME,
max: parseInt(process.env.DB_POOL_MAX || '20', 10),
min: parseInt(process.env.DB_POOL_MIN || '5', 10),
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 5000,
statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10),
query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10),
application_name: 'ecommerce-api',
};

// Primary database pool (for writes and consistent reads)
const pool = new Pool({
...poolConfig,
host: process.env.DB_HOST,
port: parseInt(process.env.DB_PORT, 10),
});

// Read replica pool (optional, for read-heavy operations)
let readPool = null;
if (process.env.DB_READ_REPLICA_HOST) {
readPool = new Pool({
...poolConfig,
host: process.env.DB_READ_REPLICA_HOST,
port: parseInt(process.env.DB_READ_REPLICA_PORT || process.env.DB_PORT, 10),
max: parseInt(process.env.DB_READ_POOL_MAX || '30', 10), // More connections for reads
});
logger.info('Database', 'Read replica pool configured', {
host: process.env.DB_READ_REPLICA_HOST,
});
} else {
// Fallback to primary pool if no replica configured
readPool = pool;
logger.info('Database', 'No read replica configured, using primary for all queries');
}

let isShuttingDown = false;

pool.on('connect', () => {
if (process.env.NODE_ENV !== 'test') {
logger.debug('Database', 'Primary pool connection established');
}
});

pool.on('error', (err, client) => {
logger.error('Database', 'Unexpected error on idle client (primary)', { error: err.message });
process.exitCode = 1;
});

pool.on('remove', () => {
if (process.env.NODE_ENV !== 'test') {
logger.debug('Database', 'Client removed from primary pool');
}
});

if (readPool !== pool) {
readPool.on('connect', () => {
if (process.env.NODE_ENV !== 'test') {
logger.debug('Database', 'Read replica pool connection established');
}
});

readPool.on('error', (err, client) => {
logger.error('Database', 'Unexpected error on idle client (replica)', { error: err.message });
});
}

/**
* Smart query router
* Routes read queries to replica, write queries to primary
*/
async function query(sql, params = [], options = {}) {
const isWrite = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)/i.test(sql);
const targetPool = (isWrite || options.forcePrimary) ? pool : readPool;

const start = Date.now();
try {
const result = await targetPool.query(sql, params);
const duration = (Date.now() - start) / 1000;

logger.debug('Database', 'Query executed', {
type: isWrite ? 'write' : 'read',
pool: (isWrite || options.forcePrimary) ? 'primary' : 'replica',
duration: `${duration.toFixed(3)}s`,
rows: result.rowCount,
});

return result;
} catch (error) {
const duration = (Date.now() - start) / 1000;
logger.error('Database', 'Query failed', {
type: isWrite ? 'write' : 'read',
duration: `${duration.toFixed(3)}s`,
error: error.message,
});
throw error;
}
}

/**
* Get pool statistics for monitoring
*/
function getPoolStats() {
return {
primary: {
total: pool.totalCount,
idle: pool.idleCount,
waiting: pool.waitingCount,
},
replica: readPool !== pool ? {
total: readPool.totalCount,
idle: readPool.idleCount,
waiting: readPool.waitingCount,
} : null,
};
}

// Graceful shutdown function
async function closePool() {
if (isShuttingDown) return;
isShuttingDown = true;

try {
logger.info('Database', 'Closing database connection pools...');

await pool.end();
logger.info('Database', 'Primary pool closed successfully');

if (readPool !== pool) {
await readPool.end();
logger.info('Database', 'Read replica pool closed successfully');
}
} catch (error) {
logger.error('Database', 'Error closing pools', { error: error.message });
throw error;
}
}

module.exports = {
pool, // Primary pool for direct access
readPool, // Read replica pool for direct access
query, // Smart query router
getPoolStats,
closePool,
};
