import { http } from './http';

export interface ProjectUsageSummary {
  projectId: string | null;
  projectName?: string;
  callCount: number;
  inputCacheHitTokens: number;
  inputCacheMissTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// 全平台按项目聚合的 Token 用量排行
export async function getUsageSummary(): Promise<ProjectUsageSummary[]> {
  const { data } = await http.get('/usage/summary');
  return data;
}

// 单个项目的 Token 用量聚合
export async function getProjectUsage(projectId: string): Promise<ProjectUsageSummary> {
  const { data } = await http.get(`/usage/projects/${projectId}`);
  return data;
}
