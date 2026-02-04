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
      chromaOptions.url = config.chromaUrl;
    }

    this.vectorStore = await Chroma.fromExistingCollection(
      this.embeddings,
      chromaOptions
    ).catch(async () => {
       return new Chroma(this.embeddings, chromaOptions);
    });
  }

  async getVectorStore(): Promise<Chroma> {
    if (!this.vectorStore) {
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
          chromaOptions.url = config.chromaUrl;
        }

        this.vectorStore = new Chroma(this.embeddings, chromaOptions);
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