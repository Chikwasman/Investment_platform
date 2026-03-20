const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const { maintenanceCheck } = require('./middleware/maintenance');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.SITE_URL || '*', methods: ['GET','POST'], credentials: true } });
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors({
  origin: process.env.SITE_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static file serving
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Maintenance mode check (after static files, before routes)
app.use(maintenanceCheck);

// ============================================================
// ROUTES
// ============================================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/deposits', require('./routes/deposits'));
app.use('/api/withdrawals', require('./routes/withdrawals'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static files (SPA + 404 fallback)
app.get('*', (req, res) => {
  const reqPath = req.path;
  // If requesting a .html file that doesn't exist, serve 404
  if (reqPath.endsWith('.html')) {
    return res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
  }
  // For non-file routes (clean URLs), serve index
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================
// Setup chat socket
const { setupChatSocket } = require('./chatSocket');
setupChatSocket(io);

server.listen(PORT, () => {
  console.log(`\n🚀 Investment Platform Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 URL: ${process.env.SITE_URL || `http://localhost:${PORT}`}\n`);

  // Start cron jobs
  const { startProfitCron } = require('./utils/profitCron');
  startProfitCron();
});

module.exports = app;
