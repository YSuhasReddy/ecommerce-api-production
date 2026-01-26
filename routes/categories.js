const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { categoryValidationRules, categoryUpdateValidationRules, validateIdParam, handleValidationErrors } = require('../middleware/validation');
const { asyncHandler, sendErrorResponse } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
* @swagger
* components:
* schemas:
* Category:
* type: object
* required:
* - name
* properties:
* id:
* type: integer
* description: Auto-generated category ID
* name:
* type: string
* description: Category name (unique)
* description:
* type: string
* description: Category description
* created_at:
* type: string
* format: date-time
* description: Creation timestamp
*/

/**
* @swagger
* /api/categories:
* get:
* summary: Get all categories
* tags: [Categories]
* responses:
* 200:
* description: List of all categories
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
* $ref: '#/components/schemas/Category'
*/
router.get('/', asyncHandler(async (req, res, next) => {
try {
const categories = await categoryController.getAllCategories();
res.json({ success: true, data: categories });
} catch (error) {
next(error);
}
}));

/**
* @swagger
* /api/categories/{id}:
* get:
* summary: Get category by ID with its products
* tags: [Categories]
* parameters:
* - in: path
* name: id
* required: true
* schema:
* type: integer
* description: Category ID
* responses:
* 200:
* description: Category with products
* 404:
* description: Category not found
*/
router.get('/:id', validateIdParam('id'), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const category = await categoryController.getCategoryById(req.params.id);
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
* /api/categories:
* post:
* summary: Create new category
* tags: [Categories]
* requestBody:
* required: true
* content:
* application/json:
* schema:
* type: object
* required:
* - name
* properties:
* name:
* type: string
* description:
* type: string
* responses:
* 201:
* description: Category created successfully
* 400:
* description: Validation error
* 409:
* description: Category name already exists
*/
router.post('/', categoryValidationRules(), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const { name, description } = req.body;
const category = await categoryController.createCategory(name, description);
res.status(201).json({ success: true, data: category });
} catch (error) {
next(error);
}
}));

/**
* @swagger
* /api/categories/{id}:
* put:
* summary: Update category
* tags: [Categories]
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
* responses:
* 200:
* description: Category updated successfully
* 404:
* description: Category not found
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

/**
* @swagger
* /api/categories/{id}:
* delete:
* summary: Delete category (cascades to products)
* tags: [Categories]
* parameters:
* - in: path
* name: id
* required: true
* schema:
* type: integer
* responses:
* 200:
* description: Category deleted successfully
* 404:
* description: Category not found
*/
router.delete('/:id', validateIdParam('id'), handleValidationErrors, asyncHandler(async (req, res, next) => {
try {
const category = await categoryController.deleteCategory(req.params.id);
if (!category) {
return res.status(404).json({ success: false, error: 'Category not found' });
}
res.json({ success: true, message: 'Category deleted successfully' });
} catch (error) {
next(error);
}
}));

module.exports = router;
