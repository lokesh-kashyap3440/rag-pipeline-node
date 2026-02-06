console.log('[System] Process starting...');
console.log(`[System] Node version: ${process.version}`);
console.log(`[System] Memory limit (if any): ${process.env.WEB_MEMORY || 'unlimited'}`);

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import router from './routes';
import { ragService } from './services/ragService';
import { chromaService } from './services/chromaService';

const app = express();
// ... rest of file

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use('/api', router);

app.get('/health', async (req, res) => {
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
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

async function startServer() {
  try {
    console.log('Initializing RAG Service...');
    await ragService.init();
    console.log('✅ RAG Service Initialized (ChromaDB connected)');

    app.listen(config.port, () => {
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