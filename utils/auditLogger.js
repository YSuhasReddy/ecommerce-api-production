const { pool } = require('../database/connection');
const logger = require('./logger');

/**
* Log audit events to database
* @param {string} action - Action type: CREATE, UPDATE, DELETE, READ
* @param {string} resourceType - Resource type: product, category
* @param {number} resourceId - Resource ID
* @param {object} oldValues - Old values (for UPDATE/DELETE)
* @param {object} newValues - New values (for CREATE/UPDATE)
* @param {object} req - Express request object
* @param {string} status - Operation status: success, failure
* @param {string} errorMessage - Error message if failed
*/
async function logAudit(
action,
resourceType,
resourceId,
oldValues,
newValues,
req,
status = 'success',
errorMessage = null
) {
try {
const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
const userAgent = req?.get('user-agent') || null;
const requestId = req?.id || null;

await pool.query(
`INSERT INTO audit_logs
(action, resource_type, resource_id, old_values, new_values, ip_address, user_agent, request_id, status, error_message)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
[
action,
resourceType,
resourceId,
oldValues ? JSON.stringify(oldValues) : null,
newValues ? JSON.stringify(newValues) : null,
ipAddress,
userAgent,
requestId,
status,
errorMessage,
]
);

logger.debug('AuditLog', 'Audit log created', {
action,
resourceType,
resourceId,
status,
});
} catch (error) {
// Don't fail the request if audit logging fails
logger.error('AuditLog', 'Failed to create audit log', {
action,
resourceType,
resourceId,
error: error.message,
});
}
}

/**
* Get audit logs with filtering and pagination
*/
async function getAuditLogs(filters = {}, limit = 100, offset = 0) {
try {
let query = 'SELECT * FROM audit_logs WHERE 1=1';
const values = [];
let paramCount = 1;

if (filters.action) {
query += ` AND action = $${paramCount}`;
values.push(filters.action);
paramCount++;
}

if (filters.resourceType) {
query += ` AND resource_type = $${paramCount}`;
values.push(filters.resourceType);
paramCount++;
}

if (filters.resourceId) {
query += ` AND resource_id = $${paramCount}`;
values.push(filters.resourceId);
paramCount++;
}

if (filters.status) {
query += ` AND status = $${paramCount}`;
values.push(filters.status);
paramCount++;
}

if (filters.startDate) {
query += ` AND timestamp >= $${paramCount}`;
values.push(filters.startDate);
paramCount++;
}

if (filters.endDate) {
query += ` AND timestamp <= $${paramCount}`;
values.push(filters.endDate);
paramCount++;
}

query += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
values.push(limit, offset);

const result = await pool.query(query, values);
return result.rows;
} catch (error) {
logger.error('AuditLog', 'Failed to fetch audit logs', { error: error.message });
throw error;
}
}

/**
* Cleanup old audit logs (call periodically via cron)
*/
async function cleanupOldAuditLogs(daysToKeep = 90) {
try {
const result = await pool.query(
`DELETE FROM audit_logs WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days' RETURNING id`
);
logger.info('AuditLog', 'Cleaned up old audit logs', {
deleted: result.rowCount,
daysToKeep,
});
return result.rowCount;
} catch (error) {
logger.error('AuditLog', 'Failed to cleanup audit logs', { error: error.message });
throw error;
}
}

module.exports = {
logAudit,
getAuditLogs,
cleanupOldAuditLogs,
};
