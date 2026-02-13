console.log('[System] Process starting...');
console.log(`[System] Node version: ${process.version}`);
console.log(`[System] Memory limit (if any): ${process.env.WEB_MEMORY || 'unlimited'}`);

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { config } from './config';
import router from './routes';
import { ragService } from './services/ragService';
import { chromaService } from './services/chromaService';

const app = express();
const httpServer = createServer(app);

const corsOptions =
  config.corsOrigins.length > 0
    ? {
        origin: config.corsOrigins,
        credentials: true,
      }
    : undefined;

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api', router);

app.get('/health/live', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (_req, res) => {
  try {
    await chromaService.getVectorStore();
    res.json({ status: 'ready', chroma: 'connected' });
  } catch (e: any) {
    res.status(503).json({ status: 'not_ready', chroma: e?.message || 'unknown_error' });
  }
});

app.get('/health', async (_req, res) => {
  const memoryUsage = process.memoryUsage();
  
  let chromaStatus = 'unknown';
  try {
    const store = await chromaService.getVectorStore();
    // Simple ping-like check if possible, or just check if store exists
    chromaStatus = store ? 'connected' : 'not_initialized';
  } catch (e: any) {
    chromaStatus = `error: ${e.message}`;
  }

  res.json({ 
    status: 'ok',
    chroma: chromaStatus,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    }
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined
  });
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  httpServer.close((error) => {
    if (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
      return;
    }
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function startServer() {
  try {
    console.log('Initializing RAG Service...');
    await ragService.init();
    console.log('✅ RAG Service Initialized (ChromaDB connected)');

    httpServer.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`Environment: Groq API Key present: ${!!config.groqApiKey}`);
      console.log(`Environment: Chroma URL: ${config.chromaUrl}`);
      console.log(`Environment: Chroma API Key present: ${!!config.chromaApiKey}`);
      console.log(`Environment: Chroma Tenant: ${config.chromaTenant}`);
      console.log(`Environment: Chroma Database: ${config.chromaDatabase}`);
      console.log(`Environment: Node Version: ${process.version}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();