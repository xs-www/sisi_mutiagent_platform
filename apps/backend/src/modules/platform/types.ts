export interface PlatformModel {
  id: string;
  provider: string;
  modelName: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlatformModelInput {
  provider: string;
  modelName: string;
  priority?: number;
}

export interface UpdatePlatformModelInput {
  provider?: string;
  modelName?: string;
  priority?: number;
  isActive?: boolean;
}
