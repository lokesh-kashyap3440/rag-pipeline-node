import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');
import { ragService } from './services/ragService';
import { visionService } from './services/visionService';

const router = Router();
// Use disk storage to save RAM on Render
const upload = multer({ 
    dest: '/tmp/uploads/', // Render uses /tmp as ephemeral storage
    limits: { fileSize: 50 * 1024 * 1024 } 
});

router.post('/ingest', async (req: Request, res: Response) => {
// ... existing ingest code ...
  try {
    const { text, metadata } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const result = await ragService.ingestText(text, metadata);
    res.json(result);
  } catch (error: any) {
    console.error('Ingest error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/ingest-file', upload.single('file'), async (req: Request, res: Response) => {
    let filePath = '';
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }
        
        filePath = req.file.path;
        console.log(`Processing file: ${req.file.originalname} (Size: ${req.file.size})`);

        let text = '';
        const metadata = {
            source: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        // Read file buffer from disk
        const fileBuffer = fs.readFileSync(filePath);

        const useOcr = req.query.ocr === 'true';

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
             // Cleanup before return
             fs.unlinkSync(filePath);
             return res.status(400).json({ error: 'Could not extract text from file' });
        }

        console.log('[IngestFile] Starting RAG ingestion...');
        const result = await ragService.ingestText(text, metadata);
        console.log('[IngestFile] Ingestion successful.');
        
        // Cleanup success
        fs.unlinkSync(filePath);
        
        res.json(result);

    } catch (error: any) {
        console.error('File ingest error:', error);
        // Cleanup error
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
        }
        res.status(500).json({ error: error.message });
    }
});

router.post('/query', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const result = await ragService.query(question);
    res.json(result);
  } catch (error: any) {
    console.error('Query error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;