const { createLogger, format, transports } = require('winston');
const { json } = format;
const config = require('../config');

const log = createLogger({
    level: config.logLevel,
    defaultMeta: { service: config.name},
    transports: [
        new transports.Console({
            format: json(),
            level: config.logLevel }),
    ]
});

module.exports = {
    log
};