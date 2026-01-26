const { query } = require('../database/connection');
const { AppError, BadRequestError, handleDatabaseError } = require('../utils/errorHandler');
const { getCached, invalidateCache, invalidateCachePattern } = require('../utils/redisClient');
const { logAudit } = require('../utils/auditLogger');
const { recordProductOperation, recordDbQuery } = require('../utils/metrics');
const logger = require('../utils/logger');

// Get all products with cursor-based pagination and caching
async function getAllProductsPaginated(categoryId, cursor, limit = 20, req) {
try {
// Validate cursor format (P0 Fix)
if (cursor !== undefined && cursor !== null && cursor !== '') {
const cursorInt = parseInt(cursor, 10);
if (isNaN(cursorInt) || cursorInt < 1) {
throw new BadRequestError('Invalid cursor format: must be a positive integer', 'INVALID_CURSOR');
}
cursor = cursorInt; // Use validated integer
}

const cacheKey = `products:paginated:${categoryId || 'all'}:${cursor || 'start'}:${limit}`;

return await getCached(cacheKey, async () => {
let sql;
let params;

const start = Date.now();

if (categoryId) {
categoryId = parseInt(categoryId, 10);
if (isNaN(categoryId) || categoryId < 1) {
throw new BadRequestError('Invalid category ID', 'INVALID_CATEGORY_ID');
}

if (cursor) {
sql = `SELECT p.*, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.category_id = $1 AND p.id < $2
ORDER BY p.id DESC
LIMIT $3`;
params = [categoryId, cursor, limit + 1];
} else {
sql = `SELECT p.*, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.category_id = $1
ORDER BY p.id DESC
LIMIT $2`;
params = [categoryId, limit + 1];
}
} else {
if (cursor) {
sql = `SELECT p.*, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.id < $1
ORDER BY p.id DESC
LIMIT $2`;
params = [cursor, limit + 1];
} else {
sql = `SELECT p.*, c.name as category_name
FROM products p
JOIN categories c ON p.category_id = c.id
ORDER BY p.id DESC
LIMIT $1`;
params = [limit + 1];
}
}

const result = await query(sql, params);
const duration = (Date.now() - start) / 1000;
recordDbQuery('select', 'products', duration);

const hasMore = result.rows.length > limit;
const products = hasMore ? result.rows.slice(0, -1) : result.rows;
const nextCursor = hasMore ? products[products.length - 1].id : null;

logger.debug('ProductController', 'getAllProductsPaginated executed', {
categoryId,
cursor,
limit,
rowCount: products.length,
hasMore,
nextCursor,
});

recordProductOperation('read');

return {
products,
nextCursor,
hasMore,
};
}, 300); // Cache for 5 minutes
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('ProductController', 'Error in getAllProductsPaginated', { error: error.message });
throw handleDatabaseError(error, 'ProductController:getAllProductsPaginated');
}
}

// Get single product by ID with caching
async function getProductById(id, req) {
try {
id = parseInt(id, 10);
if (isNaN(id) || id < 1) {
throw new AppError('Invalid product ID', 400, 'INVALID_PRODUCT_ID');
}

const cacheKey = `product:${id}`;

const product = await getCached(cacheKey, async () => {
const start = Date.now();
const result = await query(
'SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = $1',
[id]
);
const duration = (Date.now() - start) / 1000;
recordDbQuery('select', 'products', duration);

return result.rows.length > 0 ? result.rows[0] : null;
}, 900); // Cache for 15 minutes

if (product) {
recordProductOperation('read');
}

return product;
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('ProductController', 'Error in getProductById', { error: error.message, productId: id });
throw handleDatabaseError(error, 'ProductController:getProductById');
}
}

// Create new product with audit logging
async function createProduct(name, description, price, categoryId, stock, req) {
const { pool } = require('../database/connection');
const client = await pool.connect();

try {
categoryId = parseInt(categoryId, 10);
if (isNaN(categoryId) || categoryId < 1) {
throw new AppError('Invalid category ID', 400, 'INVALID_CATEGORY_ID');
}

await client.query('BEGIN');

// Check if category exists (P1 Fix - changed from 404 to 400)
const start = Date.now();
const categoryCheck = await client.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
recordDbQuery('select', 'categories', (Date.now() - start) / 1000);

if (categoryCheck.rows.length === 0) {
await client.query('ROLLBACK');
throw new BadRequestError('Invalid category_id: category does not exist', 'INVALID_CATEGORY');
}

// Create product
const insertStart = Date.now();
const result = await client.query(
'INSERT INTO products (name, description, price, category_id, stock) VALUES ($1, $2, $3, $4, $5) RETURNING *',
[name, description, price, categoryId, stock]
);
recordDbQuery('insert', 'products', (Date.now() - insertStart) / 1000);

await client.query('COMMIT');

const product = result.rows[0];

// Invalidate caches
await invalidateCachePattern('products:*');
await invalidateCache(`category:${categoryId}`);

// Audit log
await logAudit('CREATE', 'product', product.id, null, product, req);

// Metrics
recordProductOperation('create');

logger.info('ProductController', 'Product created successfully', { productId: product.id });

return product;
} catch (error) {
await client.query('ROLLBACK');
if (error instanceof AppError) throw error;
logger.error('ProductController', 'Error in createProduct', { error: error.message });
throw handleDatabaseError(error, 'ProductController:createProduct');
} finally {
client.release();
}
}

// Update product with audit logging
async function updateProduct(id, name, description, price, stock, req) {
try {
id = parseInt(id, 10);
if (isNaN(id) || id < 1) {
throw new AppError('Invalid product ID', 400, 'INVALID_PRODUCT_ID');
}

// Get old values for audit
const oldProduct = await getProductById(id, req);
if (!oldProduct) {
return null;
}

// Build dynamic query
const updates = [];
const values = [];
let paramCount = 1;

if (name !== undefined) {
updates.push(`name = $${paramCount}`);
values.push(name);
paramCount++;
}

if (description !== undefined) {
updates.push(`description = $${paramCount}`);
values.push(description);
paramCount++;
}

if (price !== undefined) {
updates.push(`price = $${paramCount}`);
values.push(price);
paramCount++;
}

if (stock !== undefined) {
updates.push(`stock = $${paramCount}`);
values.push(stock);
paramCount++;
}

if (updates.length === 0) {
throw new AppError('No fields to update', 400, 'NO_UPDATE_FIELDS');
}

values.push(id);
const sql = `UPDATE products SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;

const start = Date.now();
const result = await query(sql, values);
recordDbQuery('update', 'products', (Date.now() - start) / 1000);

if (result.rows.length === 0) {
return null;
}

const updatedProduct = result.rows[0];

// Invalidate caches
await invalidateCache(`product:${id}`);
await invalidateCachePattern('products:*');
await invalidateCache(`category:${updatedProduct.category_id}`);

// Audit log
await logAudit('UPDATE', 'product', id, oldProduct, updatedProduct, req);

// Metrics
recordProductOperation('update');

logger.info('ProductController', 'Product updated successfully', { productId: id });

return updatedProduct;
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('ProductController', 'Error in updateProduct', { error: error.message, productId: id });
throw handleDatabaseError(error, 'ProductController:updateProduct');
}
}

// Delete product with audit logging
async function deleteProduct(id, req) {
try {
id = parseInt(id, 10);
if (isNaN(id) || id < 1) {
throw new AppError('Invalid product ID', 400, 'INVALID_PRODUCT_ID');
}

// Get product for audit
const oldProduct = await getProductById(id, req);
if (!oldProduct) {
return null;
}

const start = Date.now();
const result = await query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
recordDbQuery('delete', 'products', (Date.now() - start) / 1000);

if (result.rows.length === 0) {
return null;
}

const deletedProduct = result.rows[0];

// Invalidate caches
await invalidateCache(`product:${id}`);
await invalidateCachePattern('products:*');
await invalidateCache(`category:${deletedProduct.category_id}`);

// Audit log
await logAudit('DELETE', 'product', id, oldProduct, null, req);

// Metrics
recordProductOperation('delete');

logger.info('ProductController', 'Product deleted successfully', { productId: id });

return deletedProduct;
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('ProductController', 'Error in deleteProduct', { error: error.message, productId: id });
throw handleDatabaseError(error, 'ProductController:deleteProduct');
}
}

module.exports = {
getAllProductsPaginated,
getProductById,
createProduct,
updateProduct,
deleteProduct,
};
