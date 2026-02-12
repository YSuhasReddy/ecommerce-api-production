const { pool } = require('./connection');
const fs = require('fs');
const path = require('path');

// Initialize database tables
async function initializeDatabase() {
try {
console.log(' Initializing database tables...');
const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
await pool.query(schemaSQL);
console.log(' Database tables initialized');
} catch (error) {
console.error(' Error initializing database:', error);
throw error;
}
}

// Reset database with seed data
async function resetDatabase() {
const client = await pool.connect();
try {
await client.query('BEGIN');

console.log(' Resetting database...');

// Truncate tables (cascade will handle products)
await client.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');
await client.query('TRUNCATE TABLE api_tokens RESTART IDENTITY CASCADE');
console.log(' Tables truncated');

// Insert categories
const categories = [
{ name: 'Electronics', description: 'Computers, phones, and gadgets' },
{ name: 'Clothing', description: 'Apparel and fashion items' },
{ name: 'Books', description: 'Physical and digital books' },
{ name: 'Home & Garden', description: 'Furniture and home decor' },
{ name: 'Sports', description: 'Sports equipment and outdoor gear' }
];

const categoryIds = [];
for (const category of categories) {
const result = await client.query(
'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
[category.name, category.description]
);
categoryIds.push(result.rows[0].id);
console.log(` Created category: ${category.name}`);
}

// Insert products
const products = [
// Electronics (4 products)
{ name: 'Laptop 15-inch', description: 'High-performance laptop with 16GB RAM', price: 899.99, category_idx: 0, stock: 50 },
{ name: 'Smartphone X', description: '5G smartphone with advanced camera', price: 599.99, category_idx: 0, stock: 100 },
{ name: 'Wireless Headphones', description: 'Noise-canceling Bluetooth headphones', price: 149.99, category_idx: 0, stock: 200 },
{ name: 'USB-C Cable 2m', description: 'Fast charging USB-C cable', price: 12.99, category_idx: 0, stock: 500 },

// Clothing (4 products)
{ name: 'Cotton T-Shirt', description: '100% cotton comfortable t-shirt', price: 19.99, category_idx: 1, stock: 300 },
{ name: 'Blue Jeans', description: 'Classic fit denim jeans', price: 59.99, category_idx: 1, stock: 150 },
{ name: 'Winter Jacket', description: 'Warm waterproof winter jacket', price: 129.99, category_idx: 1, stock: 80 },
{ name: 'Sports Shoes', description: 'Comfortable running shoes', price: 89.99, category_idx: 1, stock: 120 },

// Books (4 products)
{ name: 'JavaScript Guide', description: 'Complete guide to modern JavaScript', price: 39.99, category_idx: 2, stock: 50 },
{ name: 'Python Programming', description: 'Learn Python from scratch', price: 44.99, category_idx: 2, stock: 45 },
{ name: 'Web Design Basics', description: 'Introduction to web design principles', price: 34.99, category_idx: 2, stock: 60 },
{ name: 'Node.js Handbook', description: 'Master backend development with Node.js', price: 49.99, category_idx: 2, stock: 40 },

// Home & Garden (4 products)
{ name: 'Coffee Maker', description: 'Automatic drip coffee maker', price: 79.99, category_idx: 3, stock: 70 },
{ name: 'Wall Clock', description: 'Modern minimalist wall clock', price: 24.99, category_idx: 3, stock: 200 },
{ name: 'Plant Pot Set', description: 'Set of 3 ceramic plant pots', price: 34.99, category_idx: 3, stock: 150 },
{ name: 'Desk Lamp LED', description: 'Adjustable LED desk lamp', price: 44.99, category_idx: 3, stock: 100 },

// Sports (4 products)
{ name: 'Basketball', description: 'Official size basketball', price: 29.99, category_idx: 4, stock: 80 },
{ name: 'Yoga Mat', description: 'Non-slip exercise yoga mat', price: 24.99, category_idx: 4, stock: 120 },
{ name: 'Dumbbells Set 20kg', description: 'Adjustable dumbbell set', price: 99.99, category_idx: 4, stock: 60 },
{ name: 'Running Shoes', description: 'Lightweight running shoes', price: 119.99, category_idx: 4, stock: 90 }
];

for (const product of products) {
await client.query(
'INSERT INTO products (name, description, price, category_id, stock) VALUES ($1, $2, $3, $4, $5)',
[product.name, product.description, product.price, categoryIds[product.category_idx], product.stock]
);
}
console.log(` Created ${products.length} products`);

await client.query('COMMIT');
console.log(' Database populated with seed data');
} catch (error) {
await client.query('ROLLBACK');
console.error(' Error resetting database:', error);
throw error;
} finally {
client.release();
}
}

module.exports = {
initializeDatabase,
resetDatabase,
};
