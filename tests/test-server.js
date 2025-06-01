const express = require('express');
const cors = require('cors');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing_only_min_32_chars_long_enough';
process.env.EMAIL_SERVICE_ENABLED = 'false';

const app = express();

// Basic middleware for tests
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add security headers for tests
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Import routes directly without server initialization
const authRoutes = require('../backend/routes/auth');
const productRoutes = require('../backend/routes/products');
const orderRoutes = require('../backend/routes/orders');
const adminRoutes = require('../backend/routes/admin');
const monitoringRoutes = require('../backend/routes/monitoring');

// Add a simple health endpoint for tests
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Apply routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/monitoring', monitoringRoutes);

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Test server error:', err);
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  
  if (err.type === 'entity.too.large') {
    console.error('Test server error:', err);
    return res.status(413).json({ error: 'Request entity too large' });
  }
  
  console.error('Test server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app; 