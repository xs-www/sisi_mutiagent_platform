// apps/backend/src/config/index.ts
import { parse as parseYaml } from 'yaml';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = join(import.meta.dirname, '../../../..');
const dataDir = join(projectRoot, 'data');

export interface Config {
  port: number;
  dataDir: string;
  llm: {
    ollama: {
      baseUrl: string;
      enabled: boolean;
    };
    providers: Record<string, {
      apiKey: string;
      models: string[];
    }>;
  };
}

function loadConfig(): Config {
  const configPath = join(dataDir, 'platform.yaml');

  if (existsSync(configPath)) {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = parseYaml(content);
    return {
      port: parsed.server?.port || 3000,
      dataDir,
      llm: parsed.llm || { ollama: { baseUrl: 'http://localhost:11434', enabled: true }, providers: {} }
    };
  }

  return {
    port: 3000,
    dataDir,
    llm: {
      ollama: { baseUrl: 'http://localhost:11434', enabled: true },
      providers: {}
    }
  };
}

export const config = loadConfig();
