// apps/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
