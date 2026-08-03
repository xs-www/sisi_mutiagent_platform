// apps/backend/src/modules/memory/vector-store.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';

export interface VectorRecord {
  id: string;
  agentId: string;
  vector: number[];
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface SearchResult {
  record: VectorRecord;
  score: number;
}

export interface IVectorStore {
  store(record: Omit<VectorRecord, 'id' | 'createdAt'>): VectorRecord;
  search(agentId: string, queryVector: number[], topK: number): SearchResult[];
  delete(id: string): boolean;
  deleteByAgent(agentId: string): number;
  getByAgent(agentId: string): VectorRecord[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

function mapRow(row: any): VectorRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    vector: JSON.parse(row.vector),
    content: row.content,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at,
  };
}

export class SQLiteVectorStore implements IVectorStore {
  store(record: Omit<VectorRecord, 'id' | 'createdAt'>): VectorRecord {
    const db = getDb();
    const id = uuidv4();
    const vectorJson = JSON.stringify(record.vector);
    const metadataJson = JSON.stringify(record.metadata || {});
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO memory_vectors (id, agent_id, vector, content, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, record.agentId, vectorJson, record.content, metadataJson, createdAt);

    return {
      id,
      agentId: record.agentId,
      vector: record.vector,
      content: record.content,
      metadata: record.metadata || {},
      createdAt,
    };
  }

  search(agentId: string, queryVector: number[], topK: number): SearchResult[] {
    const db = getDb();

    const rows = db
      .prepare(`SELECT * FROM memory_vectors WHERE agent_id = ?`)
      .all(agentId) as any[];

    const results: SearchResult[] = rows.map((row: any) => {
      const record = mapRow(row);
      const score = cosineSimilarity(queryVector, record.vector);
      return { record, score };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  delete(id: string): boolean {
    const db = getDb();
    const result = db.prepare(`DELETE FROM memory_vectors WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  deleteByAgent(agentId: string): number {
    const db = getDb();
    const result = db
      .prepare(`DELETE FROM memory_vectors WHERE agent_id = ?`)
      .run(agentId);
    return result.changes;
  }

  getByAgent(agentId: string): VectorRecord[] {
    const db = getDb();
    const rows = db
      .prepare(`SELECT * FROM memory_vectors WHERE agent_id = ?`)
      .all(agentId) as any[];
    return rows.map(mapRow);
  }
}
