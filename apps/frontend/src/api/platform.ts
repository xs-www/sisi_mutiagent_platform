import { http } from './http';
import type { PlatformModel, CreatePlatformModelInput, UpdatePlatformModelInput } from '../types';

export async function getPlatformModels(): Promise<PlatformModel[]> {
  const resp = await http.get('/platform/models');
  return resp.data;
}

export async function createPlatformModel(input: CreatePlatformModelInput): Promise<PlatformModel> {
  const resp = await http.post('/platform/models', input);
  return resp.data;
}

export async function updatePlatformModel(id: string, input: UpdatePlatformModelInput): Promise<PlatformModel> {
  const resp = await http.patch(`/platform/models/${id}`, input);
  return resp.data;
}

export async function deletePlatformModel(id: string): Promise<void> {
  await http.delete(`/platform/models/${id}`);
}
