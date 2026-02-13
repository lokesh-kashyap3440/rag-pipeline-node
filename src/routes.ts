import { Router, Request, Response } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');
import { ragService } from './services/ragService';
import { visionService } from './services/visionService';

const router = Router();
// Use disk storage to save RAM on Render
const upload = multer({ 
    dest: '/tmp/uploads/', // Render uses /tmp as ephemeral storage
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = new Set(['application/pdf', 'text/plain', 'text/markdown']);
      if (!allowed.has(file.mimetype)) {
        cb(new Error('Unsupported file type. Use PDF, TXT, or Markdown files.'));
        return;
      }
      cb(null, true);
    },
});

const sendError = (res: Response, status: number, message: string) => {
  return res.status(status).json({ error: message });
};

const safeDelete = async (filePath: string) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
};

router.post('/ingest', async (req: Request, res: Response) => {
  try {
    const { text, metadata } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return sendError(res, 400, 'Text is required');
    }

    const result = await ragService.ingestText(text, metadata);
    res.json(result);
  } catch (error: any) {
    console.error('Ingest error:', error);
    sendError(res, 500, error?.message || 'Failed to ingest text');
  }
});

router.post('/ingest-file', upload.single('file'), async (req: Request, res: Response) => {
  let filePath = '';
  try {
    if (!req.file) {
      return sendError(res, 400, 'File is required');
    }

    filePath = req.file.path;
    console.log(`Processing file: ${req.file.originalname} (Size: ${req.file.size})`);

    const metadata = {
      source: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    };

    const fileBuffer = await fs.readFile(filePath);
    const useOcr = req.query.ocr === 'true';

    let text = '';
    if (useOcr && req.file.mimetype === 'application/pdf') {
      console.log('[IngestFile] Using OCR (VisionService)...');
      text = await visionService.extractTextWithVision(fileBuffer);
    } else if (req.file.mimetype === 'application/pdf') {
      console.log('[IngestFile] Using standard PDF parser...');
      const data = await pdf(fileBuffer);
      text = data.text;
    } else {
      console.log(`[IngestFile] Reading file as plain text (${req.file.mimetype})...`);
      text = fileBuffer.toString('utf-8');
    }

    console.log(`[IngestFile] Extracted ${text.length} characters.`);
    if (!text.trim()) {
      console.error('[IngestFile] Extracted text is empty.');
      return sendError(res, 400, 'Could not extract text from file');
    }

    console.log('[IngestFile] Starting RAG ingestion...');
    const result = await ragService.ingestText(text, metadata);
    console.log('[IngestFile] Ingestion successful.');

    res.json(result);
  } catch (error: any) {
    console.error('File ingest error:', error);
    sendError(res, 500, error?.message || 'File ingestion failed');
  } finally {
    await safeDelete(filePath);
  }
});

router.post('/query', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (typeof question !== 'string' || !question.trim()) {
      return sendError(res, 400, 'Question is required');
    }

    const result = await ragService.query(question);
    res.json(result);
  } catch (error: any) {
    console.error('Query error:', error);
    sendError(res, 500, error?.message || 'Query failed');
  }
});

export default router;