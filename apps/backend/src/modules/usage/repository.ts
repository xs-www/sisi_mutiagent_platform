// apps/backend/src/modules/usage/repository.ts
import { getDb } from '../../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { RecordTokenUsageInput, ProjectUsageSummary } from './types.js';

// 记录一次 LLM 调用的 token 消耗（写失败不影响调用主流程，调用方自行 catch）
export function recordTokenUsage(input: RecordTokenUsageInput): void {
  const db = getDb();
  const hit = input.inputCacheHitTokens ?? 0;
  const miss = input.inputCacheMissTokens ?? 0;
  const write = input.cacheWriteTokens ?? 0;
  const output = input.outputTokens ?? 0;

  db.prepare(
    `INSERT INTO token_usage
      (id, project_id, ticket_id, agent_id, provider, model, purpose,
       input_cache_hit_tokens, input_cache_miss_tokens, cache_write_tokens,
       output_tokens, total_tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuidv4(),
    input.projectId ?? null,
    input.ticketId ?? null,
    input.agentId ?? null,
    input.provider,
    input.model,
    input.purpose ?? 'chat',
    hit,
    miss,
    write,
    output,
    hit + miss + write + output
  );
}

// 单个项目的用量聚合
export function getProjectUsageSummary(projectId: string): ProjectUsageSummary {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) AS call_count,
            COALESCE(SUM(input_cache_hit_tokens), 0)  AS input_cache_hit_tokens,
            COALESCE(SUM(input_cache_miss_tokens), 0) AS input_cache_miss_tokens,
            COALESCE(SUM(cache_write_tokens), 0)      AS cache_write_tokens,
            COALESCE(SUM(output_tokens), 0)           AS output_tokens,
            COALESCE(SUM(total_tokens), 0)            AS total_tokens
       FROM token_usage
      WHERE project_id = ?`
  ).get(projectId) as any;

  return {
    projectId,
    callCount: row.call_count,
    inputCacheHitTokens: row.input_cache_hit_tokens,
    inputCacheMissTokens: row.input_cache_miss_tokens,
    cacheWriteTokens: row.cache_write_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
  };
}

// 全平台按项目聚合的用量排行（含项目名）
export function getAllProjectsUsageSummary(): ProjectUsageSummary[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT t.project_id AS projectId,
            p.name      AS projectName,
            COUNT(*)    AS call_count,
            COALESCE(SUM(t.input_cache_hit_tokens), 0)  AS input_cache_hit_tokens,
            COALESCE(SUM(t.input_cache_miss_tokens), 0) AS input_cache_miss_tokens,
            COALESCE(SUM(t.cache_write_tokens), 0)      AS cache_write_tokens,
            COALESCE(SUM(t.output_tokens), 0)           AS output_tokens,
            COALESCE(SUM(t.total_tokens), 0)            AS total_tokens
       FROM token_usage t
       LEFT JOIN projects p ON p.id = t.project_id
      GROUP BY t.project_id
      ORDER BY total_tokens DESC`
  ).all() as any[];

  return rows.map((r) => ({
    projectId: r.projectId,
    projectName: r.projectName ?? undefined,
    callCount: r.call_count,
    inputCacheHitTokens: r.input_cache_hit_tokens,
    inputCacheMissTokens: r.input_cache_miss_tokens,
    cacheWriteTokens: r.cache_write_tokens,
    outputTokens: r.output_tokens,
    totalTokens: r.total_tokens,
  }));
}
