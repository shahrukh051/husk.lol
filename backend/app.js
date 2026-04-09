'use strict';

/**
 * VELVET HUSK — Main Application Entry Point
 * Node.js + Express REST API
 * Serves all 4 frontend pages and exposes a full API
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const rateLimiter = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

// ─── App Init ─────────────────────────────────────────────────────────────────
const app = express();

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdn.tailwindcss.com'],
        fontSrc: ["'self'", 'fonts.gstatic.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.tailwindcss.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// ─── Request Logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.http(message.trim()) },
    })
  );
}

// ─── Stripe Webhooks (raw body BEFORE json parser) ────────────────────────────
app.use('/api/v1/webhooks', webhookRoutes);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Sanitisation & Compression ───────────────────────────────────────────────
app.use(mongoSanitize());  // Prevent NoSQL injection
app.use(hpp());            // Prevent HTTP param pollution
app.use(compression());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimiter.general);
app.use('/api/v1/auth/login', rateLimiter.auth);
app.use('/api/v1/auth/register', rateLimiter.auth);

// ─── Static Files — Serve all 4 HTML pages ────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/subscriptions`, subscriptionRoutes);
app.use(`${API}/partners`, partnerRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);

// ─── Page Routes — Serve the 4 HTML frontends ─────────────────────────────────
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'login', 'index.html'))
);
app.get('/login', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'login', 'index.html'))
);
app.get('/dashboard', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard', 'index.html'))
);
app.get('/dashboard/flavors', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard', 'flavors.html'))
);
app.get('/partner', (req, res) =>
  res.sendFile(path.join(__dirname, '..', 'public', 'partner', 'index.html'))
);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({
    status: 'ok',
    service: 'Velvet Husk API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
);

// ─── 404 + Global Error Handler ───────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Server Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`🌿 Velvet Husk API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;
