# Node.js RAG Pipeline

A robust RAG (Retrieval-Augmented Generation) pipeline using Node.js, TypeScript, LangChain, and ChromaDB.

## Prerequisites

*   Node.js (v18+)
*   Docker & Docker Compose
*   OpenAI API Key

## Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Configuration:**
    *   Copy `.env.example` to `.env`.
    *   Add your OpenAI API Key:
        ```
        OPENAI_API_KEY=sk-your-key-here
        ```

3.  **Start Vector Database (ChromaDB):**
    ```bash
    docker-compose up -d
    ```

4.  **Run the Application:**
    ```bash
    npm run dev
    ```

## API Usage

### 1. Ingest Text
**POST** `/api/ingest`
```json
{
  "text": "This is the content of the document I want to index.",
  "metadata": { "source": "user-manual.txt" }
}
```

### 2. Query
**POST** `/api/query`
```json
{
  "question": "What is the content of the document?"
}
```

## Architecture
*   **Vector Store:** ChromaDB (running locally via Docker)
*   **Embeddings:** OpenAI Embeddings (`text-embedding-3-small` or similar default)
*   **LLM:** OpenAI GPT-4o / GPT-3.5-turbo
*   **Framework:** LangChain.js
