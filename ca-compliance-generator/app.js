const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const workflowRoutes = require('./routes/workflowRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve static dashboard UI
app.use(express.static(path.join(__dirname, 'public')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'CA Compliance Task Generator API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/workflows', workflowRoutes);
app.use('/api', analyticsRoutes);

// Catch-all route to serve the dashboard for SPA or standard GET
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
