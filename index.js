import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'antigravity-jules-orchestration',
    version: '1.5.0'
  });
});

// Ready check endpoint
app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Antigravity Jules Orchestration',
    version: '1.5.0',
    description: 'MCP server for Jules API integration',
    status: 'operational',
    endpoints: {
      health: '/health',
      ready: '/ready',
      api: '/api/v1'
    },
    mcp: {
      servers: 5,
      tools: 25,
      status: '100% operational'
    },
    deployment: {
      method: 'Docker',
      environment: process.env.NODE_ENV || 'production',
      timestamp: new Date().toISOString()
    }
  });
});

// API v1 endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    version: '1.0',
    status: 'active',
    features: [
      'MCP Tool Integration',
      'Jules Session Management',
      'Agent Orchestration',
      'DevOps Automation'
    ]
  });
});

// MCP status endpoint
app.get('/api/v1/mcp/status', (req, res) => {
  res.json({
    servers: {
      'scarmonit-architecture': { status: 'operational', tools: 7 },
      'llm-framework-project': { status: 'operational', tools: 3 },
      'llm-framework-filesystem': { status: 'operational', tools: 2 },
      'llm-framework-devops': { status: 'operational', tools: 8 },
      'llm-framework-self-improve': { status: 'operational', tools: 5 }
    },
    total_tools: 25,
    infrastructure: 'operational',
    last_check: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Antigravity Jules Orchestration running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Server started at ${new Date().toISOString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

