require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`  CA Compliance Task Generator Server running`);
      console.log(`  PORT       : http://localhost:${PORT}`);
      console.log(`  Health API : http://localhost:${PORT}/api/health`);
      console.log(`  Workflows  : http://localhost:${PORT}/api/workflows`);
      console.log(`  Templates  : http://localhost:${PORT}/api/templates`);
      console.log(`  Dashboard  : http://localhost:${PORT}`);
      console.log(`====================================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal) => {
      console.log(`\n[${signal}] Received. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDB();
        console.log('[Server Closed]');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
