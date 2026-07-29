// apps/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { initDb, closeDb } from './db/index.js';
import { syncAgentsToDb, agentRouter } from './modules/agent/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 注册路由
app.use('/api/agents', agentRouter);

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
