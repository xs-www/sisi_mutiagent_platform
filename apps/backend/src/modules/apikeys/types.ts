export interface ApiKey {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  maxConcurrency: number;
  isActive: boolean;
  categories: string[];
  models: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  provider: string;
  name: string;
  apiKey: string;
  maxConcurrency?: number;
  categories?: string[];
  models?: string[];
}

export interface UpdateApiKeyInput {
  provider?: string;
  name?: string;
  apiKey?: string;
  maxConcurrency?: number;
  isActive?: boolean;
  categories?: string[];
  models?: string[];
}
