const LOG_LEVELS = {
ERROR: 'ERROR',
WARN: 'WARN',
INFO: 'INFO',
DEBUG: 'DEBUG',
};

const LOG_LEVEL_VALUES = {
ERROR: 0,
WARN: 1,
INFO: 2,
DEBUG: 3,
};

const currentLogLevel = LOG_LEVEL_VALUES[process.env.LOG_LEVEL || 'INFO'];

function formatLog(level, context, message, data) {
const timestamp = new Date().toISOString();
const logEntry = {
timestamp,
level,
context,
message,
};

if (data) {
logEntry.data = data;
}

return JSON.stringify(logEntry);
}

const logger = {
error: (context, message, data) => {
if (currentLogLevel >= LOG_LEVEL_VALUES.ERROR) {
console.error(formatLog(LOG_LEVELS.ERROR, context, message, data));
}
},

warn: (context, message, data) => {
if (currentLogLevel >= LOG_LEVEL_VALUES.WARN) {
console.warn(formatLog(LOG_LEVELS.WARN, context, message, data));
}
},

info: (context, message, data) => {
if (currentLogLevel >= LOG_LEVEL_VALUES.INFO) {
console.log(formatLog(LOG_LEVELS.INFO, context, message, data));
}
},

debug: (context, message, data) => {
if (currentLogLevel >= LOG_LEVEL_VALUES.DEBUG) {
console.log(formatLog(LOG_LEVELS.DEBUG, context, message, data));
}
},
};

module.exports = logger;
