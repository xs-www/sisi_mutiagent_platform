// apps/backend/src/modules/llm/routes.ts
import { Router } from 'express';
import { checkOllamaStatus, listModels, chat } from './ollama.js';
import type { ChatMessage } from './types.js';

export const llmRouter = Router();

// 检查Ollama状态
llmRouter.get('/status', async (req, res) => {
  try {
    const status = await checkOllamaStatus();
    res.json(status);
  } catch (error) {
    console.error('Error checking Ollama status:', error);
    res.status(500).json({ error: 'Failed to check Ollama status' });
  }
});

// 列出可用模型
llmRouter.get('/models', async (req, res) => {
  try {
    const models = await listModels();
    res.json(models);
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({ error: 'Failed to list models' });
  }
});

// 聊天接口
llmRouter.post('/chat', async (req, res) => {
  try {
    const { model, messages, temperature } = req.body as {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
    };

    if (!model || !messages) {
      return res.status(400).json({ error: 'model and messages are required' });
    }

    const response = await chat(model, messages, { temperature });
    res.json(response);
  } catch (error: any) {
    console.error('Error in chat:', error);
    res.status(500).json({ error: error.message || 'Failed to chat' });
  }
});
