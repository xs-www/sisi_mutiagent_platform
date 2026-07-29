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

export async function updateSkillPack(id: string, input: UpdateSkillPackInput): Promise<SkillPack> {
  const resp = await http.patch(`/skills/${id}`, input);
  return resp.data;
}

export async function deleteSkillPack(id: string): Promise<void> {
  await http.delete(`/skills/${id}`);
}
