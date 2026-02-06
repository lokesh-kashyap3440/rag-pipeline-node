import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { CloudClient, ChromaClient } from "chromadb";
import { config } from "../config";

export class ChromaService {
  private vectorStore: Chroma | null = null;
  private embeddings: HuggingFaceTransformersEmbeddings;

  constructor() {
    // Use a small, efficient local model
    this.embeddings = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });
  }

  async init() {
    let client: any = null;

    if (config.chromaApiKey) {
      console.log(`[ChromaService] Initializing CloudClient for tenant: ${config.chromaTenant}`);
      client = new CloudClient({
        apiKey: config.chromaApiKey,
        tenant: config.chromaTenant,
        database: config.chromaDatabase
      });
    }

    const chromaOptions: any = {
      collectionName: config.collectionName,
    };

    if (client) {
      chromaOptions.index = client; // LangChain uses 'index' for the client instance
    } else {
      console.log(`[ChromaService] Connecting to Chroma at: ${config.chromaUrl}`);
      chromaOptions.url = config.chromaUrl;
    }

    try {
      this.vectorStore = await Chroma.fromExistingCollection(
        this.embeddings,
        chromaOptions
      );
      console.log(`[ChromaService] Successfully connected to existing collection: ${config.collectionName}`);
    } catch (error: any) {
       console.warn(`[ChromaService] Could not connect to existing collection, attempting to create new one. Error: ${error.message}`);
       try {
         this.vectorStore = new Chroma(this.embeddings, chromaOptions);
         console.log(`[ChromaService] Initialized new Chroma collection: ${config.collectionName}`);
       } catch (innerError: any) {
         console.error(`[ChromaService] FATAL: Failed to initialize Chroma: ${innerError.message}`);
         throw innerError;
       }
    }
  }

  async getVectorStore(): Promise<Chroma> {
    if (!this.vectorStore) {
        console.log(`[ChromaService] vectorStore not initialized. Initializing now...`);
        let client: any = null;

        if (config.chromaApiKey) {
          client = new CloudClient({
            apiKey: config.chromaApiKey,
            tenant: config.chromaTenant,
            database: config.chromaDatabase
          });
        }

        const chromaOptions: any = {
          collectionName: config.collectionName,
        };

        if (client) {
          chromaOptions.index = client;
        } else {
          console.log(`[ChromaService] Connecting to Chroma at: ${config.chromaUrl}`);
          chromaOptions.url = config.chromaUrl;
        }

        try {
          this.vectorStore = new Chroma(this.embeddings, chromaOptions);
          console.log(`[ChromaService] Vector store initialized.`);
        } catch (error: any) {
          console.error(`[ChromaService] Failed to initialize vector store: ${error.message}`);
          throw error;
        }
    }
    return this.vectorStore;
  }

  async addDocuments(docs: any[]) {
    const store = await this.getVectorStore();
    await store.addDocuments(docs);
  }

  async similaritySearch(query: string, k: number = 4) {
    const store = await this.getVectorStore();
    return await store.similaritySearch(query, k);
  }
}

export const chromaService = new ChromaService();