const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { productValidationRules, productUpdateValidationRules, validateIdParam, handleValidationErrors } = require('../middleware/validation');
const { asyncHandler, sendErrorResponse } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *         - category_id
 *         - stock
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated product ID
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         price:
 *           type: number
 *           format: float
 *           description: Product price
 *         category_id:
 *           type: integer
 *           description: Category ID
 *         stock:
 *           type: integer
 *           description: Stock quantity
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products (cursor-based pagination)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *         description: Cursor for pagination (product ID to start after)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of products per page (default 10, max 100)
 *     responses:
 *       200:
 *         description: Paginated list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     cursor:
 *                       type: integer
 *                       nullable: true
 *                     hasMore:
 *                       type: boolean
 *                     limit:
 *                       type: integer
 */
router.get('/', asyncHandler(async (req, res, next) => {
try {
const cursor = req.query.cursor;
// P2 Fix: Enforce minimum limit of 1, maximum of 100
const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);

const result = await productController.getAllProductsPaginated(cursor, limit, req);

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
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
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
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category_id
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               category_id:
 *                 type: integer
 *               stock:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error or category not found
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
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
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
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
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
