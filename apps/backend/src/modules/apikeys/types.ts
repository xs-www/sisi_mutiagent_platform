export interface ApiKey {
  id: string;
  provider: string;
  name: string;
  apiKey: string;
  maxConcurrency: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInput {
  provider: string;
  name: string;
  apiKey: string;
  maxConcurrency?: number;
}

export interface UpdateApiKeyInput {
  provider?: string;
  name?: string;
  apiKey?: string;
  maxConcurrency?: number;
  isActive?: boolean;
}
