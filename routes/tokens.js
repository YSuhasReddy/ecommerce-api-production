const express = require('express');
const router = express.Router();
const { generateToken } = require('../controllers/tokenController');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * @swagger
 * /api/tokens/generate:
 *   post:
 *     summary: Generate a new API Bearer token
 *     tags: [Authentication]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Optional name for the token
 *                 default: API Token
 *     responses:
 *       201:
 *         description: Token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     token:
 *                       type: string
 *                     name:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 */
router.post('/generate', asyncHandler(async (req, res) => {
    const { name } = req.body || {};
    const tokenRecord = await generateToken(name);
    res.status(201).json({
        success: true,
        data: tokenRecord,
        message: 'Token generated. Copy it now — it cannot be retrieved later.',
    });
}));

module.exports = router;
