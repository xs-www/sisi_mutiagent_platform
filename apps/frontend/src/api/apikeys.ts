import { http } from './http';
import type { ApiKey, CreateApiKeyInput, UpdateApiKeyInput } from '../types';

export async function getApiKeys(): Promise<ApiKey[]> {
  const resp = await http.get('/api-keys');
  return resp.data;
}

export async function getApiKey(id: string): Promise<ApiKey> {
  const resp = await http.get(`/api-keys/${id}`);
  return resp.data;
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
  const resp = await http.post('/api-keys', input);
  return resp.data;
}

export async function updateApiKey(id: string, input: UpdateApiKeyInput): Promise<ApiKey> {
  const resp = await http.patch(`/api-keys/${id}`, input);
  return resp.data;
}

export async function deleteApiKey(id: string): Promise<void> {
  await http.delete(`/api-keys/${id}`);
}
