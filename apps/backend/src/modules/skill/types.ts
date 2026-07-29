export interface SkillPack {
  id: string;
  name: string;
  description: string;
  category: string;
  fileName: string;
  filePath: string;
  fileExt: 'zip' | 'skill';
  fileSize: number;
  importSource: 'upload' | 'legacy';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillPackInput {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  fileName: string;
  filePath: string;
  fileExt: 'zip' | 'skill';
  fileSize: number;
  importSource?: 'upload' | 'legacy';
}

export interface UpdateSkillPackInput {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}
