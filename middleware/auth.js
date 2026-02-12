const { validateToken } = require('../controllers/tokenController');
const logger = require('../utils/logger');

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required. Provide Bearer token in Authorization header.',
            code: 'AUTH_REQUIRED',
            requestId: req.id,
        });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token is empty',
            code: 'AUTH_REQUIRED',
            requestId: req.id,
        });
    }

    const tokenRecord = await validateToken(token);

    if (!tokenRecord) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
            requestId: req.id,
        });
    }

    req.tokenId = tokenRecord.id;
    req.tokenName = tokenRecord.name;
    logger.debug('Auth', 'Token validated', { tokenId: tokenRecord.id, tokenName: tokenRecord.name });
    next();
}

module.exports = { requireAuth };
