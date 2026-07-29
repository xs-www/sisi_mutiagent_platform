export interface SkillPack {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillPackInput {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  content: string;
}

export interface UpdateSkillPackInput {
  name?: string;
  description?: string;
  category?: string;
  content?: string;
  isActive?: boolean;
}
