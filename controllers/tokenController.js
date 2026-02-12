const crypto = require('crypto');
const { pool } = require('../database/connection');
const { handleDatabaseError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

async function generateToken(name) {
    try {
        const token = crypto.randomBytes(32).toString('hex');
        const result = await pool.query(
            'INSERT INTO api_tokens (token, name) VALUES ($1, $2) RETURNING id, token, name, created_at',
            [token, name || 'API Token']
        );
        logger.info('TokenController', 'Token generated', { tokenId: result.rows[0].id });
        return result.rows[0];
    } catch (error) {
        logger.error('TokenController', 'Error generating token', { error: error.message });
        throw handleDatabaseError(error, 'TokenController:generateToken');
    }
}

async function validateToken(token) {
    try {
        const result = await pool.query(
            'SELECT id, name, created_at FROM api_tokens WHERE token = $1 AND is_active = true',
            [token]
        );
        if (result.rows.length > 0) {
            await pool.query('UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1', [result.rows[0].id]);
            return result.rows[0];
        }
        return null;
    } catch (error) {
        logger.error('TokenController', 'Error validating token', { error: error.message });
        return null;
    }
}

module.exports = { generateToken, validateToken };
