# RAG Pipeline Backend (Node.js)

A robust Retrieval-Augmented Generation (RAG) API built with Node.js, Express, and TypeScript. This service handles document ingestion, vector embeddings (ChromaDB), and LLM generation (Groq).

## Features

-   **📄 PDF Ingestion:** Efficiently parses text from uploaded PDF files.
-   **👁️ OCR Support:** Advanced vision-based ingestion for scanned PDFs using Puppeteer and Groq Vision (Llama 4 Scout).
-   **🗄️ Vector Store:** Supports both **Local ChromaDB** (Docker) and **Chroma Cloud**.
-   **⚡ Fast Inference:** Uses Groq's high-speed API for Llama 3 generation.
-   **🐳 Docker Ready:** Includes a production-ready Dockerfile with Puppeteer support.

## Prerequisites

-   Node.js v18+
-   Groq API Key
-   ChromaDB (Local Docker container or Cloud Account)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/rag-pipeline-node.git
    cd rag-pipeline-node
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    GROQ_API_KEY=your_groq_api_key
    
    # For Local Chroma (Docker)
    CHROMA_URL=http://localhost:8000
    
    # For Chroma Cloud (Optional)
    # CHROMA_API_KEY=your_chroma_api_key
    # CHROMA_TENANT=your_tenant_id
    # CHROMA_DATABASE=default_database
    ```

## Running Locally

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Running with Docker

This project uses a specialized Docker image (`ghcr.io/puppeteer/puppeteer`) to support OCR features.

```bash
docker build -t rag-backend .
docker run -p 3000:3000 --env-file .env rag-backend
```

## API Endpoints

### 1. Ingest File
**POST** `/api/ingest-file`
-   **Body:** `multipart/form-data` (key: `file`)
-   **Query Param:** `?ocr=true` (optional, to enable vision processing)
-   **Description:** Uploads and indexes a PDF.

### 2. Query
**POST** `/api/query`
-   **Body:** `{ "question": "What does the document say about X?" }`
-   **Description:** Retrieves relevant context and generates an answer.

## Deployment (Render)

1.  Create a **Web Service** on Render.
2.  Connect this repository.
3.  **Runtime:** Docker.
4.  **Environment Variables:** Add `GROQ_API_KEY`, `CHROMA_API_KEY`, etc.