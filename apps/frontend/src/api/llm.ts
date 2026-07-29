import { http } from './http';

export async function getProviderModels(provider?: string): Promise<Record<string, string[]> | { provider: string; models: string[] }> {
  const url = provider ? `/llm/provider-models?provider=${encodeURIComponent(provider)}` : '/llm/provider-models';
  return http.get(url);
}