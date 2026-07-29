// apps/backend/src/modules/llm/ollama.ts
import axios from 'axios';
import { config } from '../../config/index.js';
import type { ChatMessage, ChatResponse, ModelInfo, OllamaStatus } from './types.js';

const ollamaBaseUrl = config.llm.ollama.baseUrl;

export async function checkOllamaStatus(): Promise<OllamaStatus> {
  try {
    const response = await axios.get(`${ollamaBaseUrl}/api/tags`, { timeout: 5000 });
    const models = response.data.models || [];

    return {
      running: true,
      modelsLoaded: models.map((m: ModelInfo) => m.name)
    };
  } catch (error: any) {
    return {
      running: false,
      modelsLoaded: [],
      error: error.message || 'Ollama service unavailable'
    };
  }
}

export async function listModels(): Promise<ModelInfo[]> {
  try {
    const response = await axios.get(`${ollamaBaseUrl}/api/tags`);
    return response.data.models || [];
  } catch (error) {
    console.error('Error listing Ollama models:', error);
    return [];
  }
}

export async function pullModel(modelName: string): Promise<boolean> {
  try {
    await axios.post(`${ollamaBaseUrl}/api/pull`, { name: modelName });
    return true;
  } catch (error) {
    console.error(`Error pulling model ${modelName}:`, error);
    return false;
  }
}

export async function chat(
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number; stream?: boolean }
): Promise<ChatResponse> {
  const response = await axios.post(`${ollamaBaseUrl}/api/chat`, {
    model,
    messages,
    stream: options?.stream || false,
    options: options?.temperature ? { temperature: options.temperature } : undefined
  }, { timeout: 120000 }); // 2分钟超时

  return response.data;
}

export async function* chatStream(
  model: string,
  messages: ChatMessage[],
  options?: { temperature?: number }
): AsyncGenerator<string, void, unknown> {
  const response = await axios.post(`${ollamaBaseUrl}/api/chat`, {
    model,
    messages,
    stream: true,
    options: options?.temperature ? { temperature: options.temperature } : undefined
  }, {
    timeout: 120000,
    responseType: 'stream'
  });

  for await (const chunk of response.data) {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          yield data.message.content;
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
}
