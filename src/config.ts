import dotenv from 'dotenv';
dotenv.config();

export const config = {
  groqApiKey: process.env.GROQ_API_KEY || '',
  port: process.env.PORT || 3000,
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  chromaApiKey: process.env.CHROMA_API_KEY || '', // Added for Cloud
  chromaTenant: process.env.CHROMA_TENANT || 'default_tenant',
  chromaDatabase: process.env.CHROMA_DATABASE || 'default_database',
  collectionName: 'rag-collection', // Default collection name for Chroma
  hfApiKey: process.env.HF_API_KEY || '' // Added for Hugging Face Inference API
};

if (!config.groqApiKey) {
  console.warn('WARNING: GROQ_API_KEY is not set in .env file.');
}