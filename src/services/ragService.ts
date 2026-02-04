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
      model: "llama-3.1-8b-instant", // Updated supported model
      temperature: 0,
    });
  }

  async init() {
    await chromaService.init();
  }

  async ingestText(text: string, metadata: any = {}) {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text], [metadata]);
    await chromaService.addDocuments(docs);
    return { success: true, chunks: docs.length };
  }

  async query(question: string) {
    // 1. Retrieve relevant documents
    const relevantDocs = await chromaService.similaritySearch(question);
    
    // 2. Contextualize
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n---\n\n");

    // 3. Generate Answer
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Use the following pieces of context to answer the user's question. If you don't know the answer, just say that you don't know, don't try to make up an answer."],
      ["system", "Context:\n{context}"],
      ["human", "{question}"],
    ]);

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser());

    const answer = await chain.invoke({
      context,
      question,
    });

    return {
      answer,
      sources: relevantDocs.map((doc) => doc.metadata),
    };
  }
}

export const ragService = new RagService();