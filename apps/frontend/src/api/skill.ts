import { http } from './http';
import type { SkillPack, CreateSkillPackInput, UpdateSkillPackInput } from '../types';

export async function getSkillPacks(): Promise<SkillPack[]> {
  const resp = await http.get('/skills');
  return resp.data;
}

export async function getSkillPack(id: string): Promise<SkillPack> {
  const resp = await http.get(`/skills/${id}`);
  return resp.data;
}

export async function createSkillPack(input: CreateSkillPackInput): Promise<SkillPack> {
  const resp = await http.post('/skills', input);
  return resp.data;
}

export async function importSkillPackFile(input: {
  file: File;
  name?: string;
  description?: string;
  category?: string;
}): Promise<SkillPack> {
  const formData = new FormData();
  formData.append('file', input.file);
  if (input.name) formData.append('name', input.name);
  if (input.description) formData.append('description', input.description);
  if (input.category) formData.append('category', input.category);

  const resp = await http.post('/skills/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return resp.data;
}

export function getSkillPackDownloadUrl(id: string): string {
  return `/api/skills/${id}/download`;
}

export async function updateSkillPack(id: string, input: UpdateSkillPackInput): Promise<SkillPack> {
  const resp = await http.patch(`/skills/${id}`, input);
  return resp.data;
}

export async function deleteSkillPack(id: string): Promise<void> {
  await http.delete(`/skills/${id}`);
}
