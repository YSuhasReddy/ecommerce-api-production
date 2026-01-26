const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { productValidationRules, productUpdateValidationRules, validateIdParam, handleValidationErrors } = require('../middleware/validation');
const { asyncHandler, sendErrorResponse } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
* @swagger
* components:
* schemas:
* Product:
* type: object
* required:
* - name
* - price
* - category_id
* - stock
* properties:
* id:
* type: integer
* description: Auto-generated product ID
* name:
* type: string
* description: Product name
* description:
* type: string
* description: Product description
* price:
* type: number
* format: float
* description: Product price
* category_id:
* type: integer
* description: Category ID
* stock:
* type: integer
* description: Stock quantity
* created_at:
* type: string
* format: date-time
* description: Creation timestamp
*/

/**
* @swagger
* /api/products:
* get:
* summary: Get all products (optionally filter by category)
* tags: [Products]
* parameters:
* - in: query
* name: category_id
* schema:
* type: integer
* description: Filter by category ID
* responses:
* 200:
* description: List of products
* content:
* application/json:
* schema:
* type: object
* properties:
* success:
* type: boolean
* data:
* type: array
* items:
* $ref: '#/components/schemas/Product'
*/
router.get('/', asyncHandler(async (req, res, next) => {
try {
const categoryId = req.query.category_id;
const cursor = req.query.cursor;
// P2 Fix: Enforce minimum limit of 1, maximum of 100
const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);

const result = await productController.getAllProductsPaginated(categoryId, cursor, limit, req);

res.json({
success: true,
data: result.products,
pagination: {
cursor: result.nextCursor,
hasMore: result.hasMore,
limit,
},
requestId: req.id,
});
} catch (error) {
next(error);
}
}));

/**
* @swagger
* /api/products/{id}:
* get:
* summary: Get product by ID
* tags: [Products]
* parameters:
* - in: path
* name: id
* required: true
* schema:
* type: integer
* description: Product ID
* responses:
* 200:
* description: Product details
* 404:
* description: Product not found
*/
router.get('/:id', validateIdParam('id'), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const product = await productController.getProductById(req.params.id, req);
if (!product) {
return res.status(404).json({ success: false, error: 'Product not found', requestId: req.id });
}
res.json({ success: true, data: product, requestId: req.id });
} catch (error) {
next(error);
}
}));

/**
* @swagger
* /api/products:
* post:
* summary: Create new product
* tags: [Products]
* requestBody:
* required: true
* content:
* application/json:
* schema:
* type: object
* required:
* - name
* - price
* - category_id
* - stock
* properties:
* name:
* type: string
* description:
* type: string
* price:
* type: number
* category_id:
* type: integer
* stock:
* type: integer
* responses:
* 201:
* description: Product created successfully
* 400:
* description: Validation error or category not found
*/
router.post('/', productValidationRules(), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const { name, description, price, category_id, stock } = req.body;
const product = await productController.createProduct(name, description, price, category_id, stock, req);
res.status(201).json({ success: true, data: product, requestId: req.id });
} catch (error) {
next(error);
}
}));

/**
* @swagger
* /api/products/{id}:
* put:
* summary: Update product
* tags: [Products]
* parameters:
* - in: path
* name: id
* required: true
* schema:
* type: integer
* requestBody:
* required: true
* content:
* application/json:
* schema:
* type: object
* properties:
* name:
* type: string
* description:
* type: string
* price:
* type: number
* stock:
* type: integer
* responses:
* 200:
* description: Product updated successfully
* 404:
* description: Product not found
*/
router.put('/:id', validateIdParam('id'), handleValidationErrors, productUpdateValidationRules(), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const { name, description, price, stock } = req.body;
const product = await productController.updateProduct(req.params.id, name, description, price, stock, req);
if (!product) {
return res.status(404).json({ success: false, error: 'Product not found', requestId: req.id });
}
res.json({ success: true, data: product, requestId: req.id });
} catch (error) {
next(error);
}
}));

/**
* @swagger
* /api/products/{id}:
* delete:
* summary: Delete product
* tags: [Products]
* parameters:
* - in: path
* name: id
* required: true
* schema:
* type: integer
* responses:
* 200:
* description: Product deleted successfully
* 404:
* description: Product not found
*/
router.delete('/:id', validateIdParam('id'), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const product = await productController.deleteProduct(req.params.id, req);
if (!product) {
return res.status(404).json({ success: false, error: 'Product not found', requestId: req.id });
}
res.json({ success: true, message: 'Product deleted successfully', requestId: req.id });
} catch (error) {
next(error);
}
}));

module.exports = router;
