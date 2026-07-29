// apps/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initDb, closeDb } from './db/index.js';
import { syncAgentsToDb, agentRouter } from './modules/agent/index.js';
import { llmRouter } from './modules/llm/index.js';
import { ticketRouter } from './modules/ticket/index.js';
import { projectRouter } from './modules/project/index.js';
import { toolRouter } from './modules/tools/index.js';
import { approvalRouter } from './modules/approval/index.js';
import { apiKeyRouter } from './modules/apikeys/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册路由
app.use('/api/agents', agentRouter);
app.use('/api/llm', llmRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/projects', projectRouter);
app.use('/api/tools', toolRouter);
app.use('/api/approvals', approvalRouter);
app.use('/api/api-keys', apiKeyRouter);

// 初始化
initDb();
syncAgentsToDb();

// 优雅关闭
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
