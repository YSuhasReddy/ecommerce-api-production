require('dotenv').config();
const { resetDatabase } = require('../database/seedData');
const { pool } = require('../database/connection');

async function main() {
try {
console.log(' Starting manual database reset...');
await resetDatabase();
console.log(' Database reset completed successfully');
process.exit(0);
} catch (error) {
console.error(' Database reset failed:', error);
process.exit(1);
} finally {
await pool.end();
}
}

main();
