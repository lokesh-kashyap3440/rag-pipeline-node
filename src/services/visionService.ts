import puppeteer from 'puppeteer';
import Groq from 'groq-sdk';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

// Initialize Groq
const groq = new Groq({ apiKey: config.groqApiKey });

export class VisionService {
  
  async pdfToImages(pdfBuffer: Buffer): Promise<string[]> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // We will inject a script that uses PDF.js to render the PDF
    // First, we need to make PDF.js available. 
    // We can point to a CDN or read the local node_modules version.
    // For reliability, let's use a CDN in the page content.
    
    const htmlContent = `
      <html>
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        </script>
      </head>
      <body></body>
      </html>
    `;

    await page.setContent(htmlContent);

    // Pass buffer as base64
    const pdfBase64 = pdfBuffer.toString('base64');

    // Execute rendering in the browser context
    const images = await page.evaluate(async (base64) => {
      const pdfData = atob(base64);
      const loadingTask = (window as any).pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const images: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // 1.5 scale for better OCR
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Get JPEG to reduce size slightly compared to PNG
        images.push(canvas.toDataURL('image/jpeg', 0.8));
      }
      return images;
    }, pdfBase64);

    await browser.close();
    return images;
  }

  async extractTextWithVision(pdfBuffer: Buffer): Promise<string> {
    try {
      console.log('Starting Vision extraction...');
      // 1. Convert to Images
      const images = await this.pdfToImages(pdfBuffer);
      console.log(`Extracted ${images.length} images from PDF.`);

      let fullText = "";

      // 2. Process each image with Groq Vision
      // We process sequentially to avoid rate limits, or parallel with concurrency limit
      for (let i = 0; i < images.length; i++) {
        console.log(`Processing page ${i + 1}/${images.length}...`);
        const imageDataUrl = images[i]; 
        
        // Remove "data:image/jpeg;base64," prefix for some APIs, but Groq SDK usually handles URL or base64.
        // Groq API expects: { type: "image_url", image_url: { url: "..." } }
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Transcribe the text in this image verbatim. Do not add any commentary. If there are tables or charts, summarize them in text.' },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ]
            }
          ],
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          temperature: 0,
        });

        const pageText = completion.choices[0]?.message?.content || "";
        fullText += `--- Page ${i + 1} ---\n${pageText}\n\n`;
      }

      return fullText;

    } catch (error) {
      console.error('Vision extraction error:', error);
      throw error;
    }
  }
}

export const visionService = new VisionService();
