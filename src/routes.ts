import { Router, Request, Response } from 'express';
import multer from 'multer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse')
//import {PDFParse} from 'pdf-parse';
import { ragService } from './services/ragService';

const router = Router();
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

router.post('/ingest', async (req: Request, res: Response) => {
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

import { visionService } from './services/visionService';

router.post('/ingest-file', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'File is required' });
        }

        let text = '';
        const metadata = {
            source: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        };

        const useOcr = req.query.ocr === 'true';

        if (useOcr && req.file.mimetype === 'application/pdf') {
             // Use Vision/OCR Path
             text = await visionService.extractTextWithVision(req.file.buffer);
        } else if (req.file.mimetype === 'application/pdf') {
            // Standard Text Extraction
            const data = await pdf(req.file.buffer);
            text = data.text;
            
            // Heuristic: If text is too short but file is large, it might be scanned.
            // Fallback could be implemented here.
        } else {
             // Fallback for text files
            text = req.file.buffer.toString('utf-8');
        }

        if (!text.trim()) {
             return res.status(400).json({ error: 'Could not extract text from file' });
        }

        const result = await ragService.ingestText(text, metadata);
        res.json(result);

    } catch (error: any) {
        console.error('File ingest error:', error);
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