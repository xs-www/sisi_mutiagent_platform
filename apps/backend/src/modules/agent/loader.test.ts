import { beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadAgentConfig } from './loader.js';
import { config } from '../../config/index.js';

describe('loadAgentConfig', () => {
  const tempDir = join(tmpdir(), 'agent-loader-test');

  beforeEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    mkdirSync(tempDir, { recursive: true });
    config.dataDir = tempDir;
  });

  it('loads agent metadata from markdown and writes a yaml fallback', () => {
    const agentDir = join(tempDir, 'writer');
    mkdirSync(agentDir, { recursive: true });

    writeFileSync(join(agentDir, 'writer.agent.md'), `---
name: 文章撰写
role: specialist
description: 负责撰写高质量文章
prompt:
  personality: 严谨
  system: 你是一个专业的作家
memory:
  global: true
  project: true
skills: []
tools:
  - file_read
  - file_write
approvalRequired: []
---

## 目标
- 为用户撰写清晰、结构完整的文章

## 约束
- 不能编造事实
- 必须尊重用户要求

## 工作方法
- 先理解任务后再写作
- 需要时进行信息收集

## 输出格式
- 使用 Markdown 段落组织内容

## 拒绝策略
- 遇到缺失关键信息时说明并请求补充
`);

    const agent = loadAgentConfig('writer');

    expect(agent?.name).toBe('文章撰写');
    expect(agent?.description).toBe('负责撰写高质量文章');
    expect(agent?.instructions?.goal).toContain('撰写清晰');
    expect(agent?.instructions?.constraints).toContain('不能编造事实');
    expect(agent?.tools.predefined).toEqual(['file_read', 'file_write']);
    expect(existsSync(join(agentDir, 'config.yaml'))).toBe(true);
  });
});
