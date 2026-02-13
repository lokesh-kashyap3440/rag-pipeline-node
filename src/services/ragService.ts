import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatGroq } from "@langchain/groq";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { chromaService } from "./chromaService";
import { config } from "../config";

export class RagService {
  private llm: ChatGroq;

  constructor() {
    this.llm = new ChatGroq({
      apiKey: config.groqApiKey,
      model: "llama-3.3-70b-versatile", // Updated supported model
      temperature: 0,
    });
  }

  async init() {
    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[RagService] Starting initialization (Memory: ${Math.round(memBefore)} MB)...`);
    
    await chromaService.init();
    
    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`[RagService] Initialization complete (Memory: ${Math.round(memAfter)} MB).`);
  }

  async ingestText(text: string, metadata: any = {}) {
    console.log(`[RagService] Ingesting text (Length: ${text.length})...`);
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    console.log(`[RagService] Splitting text into chunks...`);
    const docs = await splitter.createDocuments([text], [metadata]);
    console.log(`[RagService] Created ${docs.length} chunks. Adding to Chroma...`);
    
    try {
      await chromaService.addDocuments(docs);
      console.log(`[RagService] Successfully added documents to Chroma.`);
      return { success: true, chunks: docs.length };
    } catch (error: any) {
      console.error(`[RagService] Error adding documents to Chroma: ${error.message}`);
      throw error;
    }
  }

  async query(question: string) {
    console.log(`[RagService] Processing query: "${question}"`);
    
    // 1. Retrieve relevant documents
    console.log(`[RagService] Searching for relevant documents...`);
    const relevantDocs = await chromaService.similaritySearch(question);
    console.log(`[RagService] Found ${relevantDocs.length} relevant documents.`);
    
    // 2. Contextualize
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n---\n\n");

    // 3. Generate Answer
    console.log(`[RagService] Generating answer with LLM...`);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Use the following pieces of context to answer the user's question. If you don't know the answer, just say that you don't know, don't try to make up an answer."],
      ["system", "Context:\n{context}"],
      ["human", "{question}"],
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    try {
      const answer = await chain.invoke({
        context,
        question,
      });
      console.log(`[RagService] Answer generated successfully.`);

      return {
        answer,
        sources: relevantDocs.map((doc) => doc.metadata),
      };
    } catch (error: any) {
      console.error(`[RagService] LLM Generation error: ${error.message}`);
      throw error;
    }
  }
}

export const ragService = new RagService();