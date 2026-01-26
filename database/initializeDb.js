const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load .env file from the ecommerce-api directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
* Create the ecommerce database if it doesn't exist
* This should be run once before the main application starts
*/
async function createDatabaseIfNotExists() {
// Connect to the default postgres database to create our database
const adminPool = new Pool({
user: process.env.DB_USER,
password: process.env.DB_PASSWORD,
host: process.env.DB_HOST,
port: parseInt(process.env.DB_PORT, 10),
database: 'postgres', // Connect to default database
});

try {
console.log(` Checking if database "${process.env.DB_NAME}" exists...`);

// Check if database exists
const result = await adminPool.query(
`SELECT 1 FROM pg_database WHERE datname = $1`,
[process.env.DB_NAME]
);

if (result.rows.length === 0) {
console.log(` Creating database "${process.env.DB_NAME}"...`);
await adminPool.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
console.log(` Database "${process.env.DB_NAME}" created successfully`);
} else {
console.log(` Database "${process.env.DB_NAME}" already exists`);
}
} catch (error) {
console.error(' Error creating database:', error.message);
throw error;
} finally {
await adminPool.end();
}
}

module.exports = {
createDatabaseIfNotExists,
};
