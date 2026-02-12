const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { categoryUpdateValidationRules, validateIdParam, handleValidationErrors } = require('../middleware/validation');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated category ID
 *         name:
 *           type: string
 *           description: Category name (unique)
 *         description:
 *           type: string
 *           description: Category description
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories (cursor-based pagination)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *         description: Cursor for pagination (category ID to start after)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 100
 *         description: Number of categories per page (default 10, max 100)
 *     responses:
 *       200:
 *         description: Paginated list of categories
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
 *                     $ref: '#/components/schemas/Category'
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
const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);

const result = await categoryController.getAllCategories(cursor, limit);

res.json({
success: true,
data: result.categories,
pagination: {
cursor: result.nextCursor,
hasMore: result.hasMore,
limit,
},
});
} catch (error) {
next(error);
}
}));

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID with paginated products
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *         description: Cursor for products pagination (product ID to start after)
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
 *         description: Category with paginated products
 *       404:
 *         description: Category not found
 */
router.get('/:id', validateIdParam('id'), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const cursor = req.query.cursor;
const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);

const category = await categoryController.getCategoryById(req.params.id, cursor, limit);
if (!category) {
return res.status(404).json({ success: false, error: 'Category not found' });
}
res.json({ success: true, data: category });
} catch (error) {
next(error);
}
}));

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category
 *     tags: [Categories]
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
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.put('/:id', validateIdParam('id'), handleValidationErrors, categoryUpdateValidationRules(), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const { name, description } = req.body;
const category = await categoryController.updateCategory(req.params.id, name, description);
if (!category) {
return res.status(404).json({ success: false, error: 'Category not found' });
}
res.json({ success: true, data: category });
} catch (error) {
next(error);
}
}));

module.exports = router;
