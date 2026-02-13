import dotenv from 'dotenv';
dotenv.config();

const parsePort = (value: string | undefined, fallback = 3000): number => {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const csvToArray = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const config = {
  groqApiKey: process.env.GROQ_API_KEY || '',
  port: parsePort(process.env.PORT),
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  chromaApiKey: process.env.CHROMA_API_KEY || '', // Added for Cloud
  chromaTenant: process.env.CHROMA_TENANT || 'default_tenant',
  chromaDatabase: process.env.CHROMA_DATABASE || 'default_database',
  collectionName: process.env.CHROMA_COLLECTION || 'rag-collection',
  hfApiKey: process.env.HF_API_KEY || '', // Added for Hugging Face Inference API
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: csvToArray(process.env.CORS_ORIGINS),
};

if (!config.groqApiKey) {
  console.warn('WARNING: GROQ_API_KEY is not set in .env file.');
}

if (config.nodeEnv === 'production' && !config.groqApiKey) {
  throw new Error('GROQ_API_KEY is required in production.');
}