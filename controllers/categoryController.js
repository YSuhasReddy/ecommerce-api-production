const { pool } = require('../database/connection');
const { AppError, handleDatabaseError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// Get all categories with cursor-based pagination
async function getAllCategories(cursor, limit = 10) {
try {
if (cursor !== undefined && cursor !== null && cursor !== '') {
const cursorInt = parseInt(cursor, 10);
if (isNaN(cursorInt) || cursorInt < 1) {
throw new AppError('Invalid cursor format: must be a positive integer', 400, 'INVALID_CURSOR');
}
cursor = cursorInt;
}

let sql;
let params;

if (cursor) {
sql = 'SELECT * FROM categories WHERE id < $1 ORDER BY id DESC LIMIT $2';
params = [cursor, limit + 1];
} else {
sql = 'SELECT * FROM categories ORDER BY id DESC LIMIT $1';
params = [limit + 1];
}

const result = await pool.query(sql, params);

const hasMore = result.rows.length > limit;
const categories = hasMore ? result.rows.slice(0, -1) : result.rows;
const nextCursor = hasMore ? categories[categories.length - 1].id : null;

logger.debug('CategoryController', 'getAllCategories executed', {
cursor, limit, rowCount: categories.length, hasMore, nextCursor,
});

return { categories, nextCursor, hasMore };
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('CategoryController', 'Error in getAllCategories', { error: error.message });
throw handleDatabaseError(error, 'CategoryController:getAllCategories');
}
}

// Get single category by ID with its products (paginated)
async function getCategoryById(id, cursor, limit = 10) {
try {
id = parseInt(id, 10);
if (isNaN(id) || id < 1) {
throw new AppError('Invalid category ID', 400, 'INVALID_CATEGORY_ID');
}

if (cursor !== undefined && cursor !== null && cursor !== '') {
const cursorInt = parseInt(cursor, 10);
if (isNaN(cursorInt) || cursorInt < 1) {
throw new AppError('Invalid cursor format: must be a positive integer', 400, 'INVALID_CURSOR');
}
cursor = cursorInt;
}

const categoryResult = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);

if (categoryResult.rows.length === 0) {
return null;
}

const category = categoryResult.rows[0];

// Get products in this category with cursor-based pagination
let sql;
let params;

if (cursor) {
sql = 'SELECT * FROM products WHERE category_id = $1 AND id < $2 ORDER BY id DESC LIMIT $3';
params = [id, cursor, limit + 1];
} else {
sql = 'SELECT * FROM products WHERE category_id = $1 ORDER BY id DESC LIMIT $2';
params = [id, limit + 1];
}

const productsResult = await pool.query(sql, params);

const hasMore = productsResult.rows.length > limit;
const products = hasMore ? productsResult.rows.slice(0, -1) : productsResult.rows;
const nextCursor = hasMore ? products[products.length - 1].id : null;

category.products = products;
category.productsPagination = { cursor: nextCursor, hasMore, limit };

logger.debug('CategoryController', 'getCategoryById executed', {
categoryId: id, productCount: products.length, hasMore, nextCursor,
});
return category;
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('CategoryController', 'Error in getCategoryById', { error: error.message, categoryId: id });
throw handleDatabaseError(error, 'CategoryController:getCategoryById');
}
}

// Create new category
async function createCategory(name, description) {
try {
const result = await pool.query(
'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
[name, description]
);
logger.info('CategoryController', 'Category created successfully', { categoryId: result.rows[0].id });
return result.rows[0];
} catch (error) {
logger.error('CategoryController', 'Error in createCategory', { error: error.message, categoryName: name });
throw handleDatabaseError(error, 'CategoryController:createCategory');
}
}

// Update category
async function updateCategory(id, name, description) {
try {
id = parseInt(id, 10);
if (isNaN(id) || id < 1) {
throw new AppError('Invalid category ID', 400, 'INVALID_CATEGORY_ID');
}

// Build dynamic query based on provided fields
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

if (updates.length === 0) {
throw new AppError('No fields to update', 400, 'NO_UPDATE_FIELDS');
}

values.push(id);
const query = `UPDATE categories SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;

const result = await pool.query(query, values);

if (result.rows.length === 0) {
return null;
}

logger.info('CategoryController', 'Category updated successfully', { categoryId: id });
return result.rows[0];
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('CategoryController', 'Error in updateCategory', { error: error.message, categoryId: id });
throw handleDatabaseError(error, 'CategoryController:updateCategory');
}
}

// Delete category (cascade deletes products)
async function deleteCategory(id) {
try {
id = parseInt(id, 10);
if (isNaN(id) || id < 1) {
throw new AppError('Invalid category ID', 400, 'INVALID_CATEGORY_ID');
}

const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);

if (result.rows.length === 0) {
return null;
}

logger.info('CategoryController', 'Category deleted successfully', { categoryId: id });
return result.rows[0];
} catch (error) {
if (error instanceof AppError) throw error;
logger.error('CategoryController', 'Error in deleteCategory', { error: error.message, categoryId: id });
throw handleDatabaseError(error, 'CategoryController:deleteCategory');
}
}

module.exports = {
getAllCategories,
getCategoryById,
createCategory,
updateCategory,
deleteCategory,
};
