// lib/logger.js — Logger persistente (Winston)
'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'mark-publicidad' },
  transports: [
    // Errores en archivo dedicado (rotación automática)
    new transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize:  10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      tailable: true,
    }),
    // Log combinado general
    new transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize:  20 * 1024 * 1024,
      maxFiles: 10,
      tailable: true,
    }),
    // Audit log de seguridad (accesos admin, cambios de password, intentos fallidos)
    new transports.File({
      filename: path.join(LOG_DIR, 'audit.log'),
      level: 'warn',
      maxsize:  20 * 1024 * 1024,
      maxFiles: 30,
      tailable: true,
    }),
  ],
});

// En desarrollo: salida coloreada en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf(({ level, message, timestamp, ...meta }) => {
        const m = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
        return `${timestamp} [${level}] ${message}${m}`;
      })
    ),
  }));
}

module.exports = logger;
