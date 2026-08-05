import { beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { loadAgentConfig, loadAllAgents } from './loader.js';
import { config } from '../../config/index.js';

describe('loadAgentConfig', () => {
  const tempDir = join(tmpdir(), 'agent-loader-test');

  beforeEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    mkdirSync(tempDir, { recursive: true });
    config.dataDir = tempDir;
  });

  it('loads agent from new format (agent.yaml + prompt.md + tools.yaml) in custom namespace', () => {
    const agentDir = join(tempDir, 'agents', 'custom', 'writer');
    mkdirSync(agentDir, { recursive: true });

    writeFileSync(join(agentDir, 'agent.yaml'), `id: writer
name: 文章撰写
role: specialist
description: 负责撰写高质量文章
prompt:
  personality: 严谨
memory:
  global: true
  project: true
skills: []
instructions:
  goal: 为用户撰写清晰、结构完整的文章
  constraints: 不能编造事实
`);
    writeFileSync(join(agentDir, 'prompt.md'), '你是一个专业的作家，擅长写议论文');
    writeFileSync(join(agentDir, 'tools.yaml'), `predefined:
  - file_read
  - file_write
approvalRequired: []
custom: []
`);

    const agent = loadAgentConfig('writer');

    expect(agent?.name).toBe('文章撰写');
    expect(agent?.description).toBe('负责撰写高质量文章');
    expect(agent?.prompt.system).toBe('你是一个专业的作家，擅长写议论文');
    expect(agent?.prompt.personality).toBe('严谨');
    expect(agent?.instructions?.goal).toContain('撰写清晰');
    expect(agent?.tools.predefined).toEqual(['file_read', 'file_write']);
  });

  it('migrates legacy markdown agent to new format', () => {
    const agentDir = join(tempDir, 'agents', 'custom', 'writer');
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
    // 迁移后应生成新格式文件
    expect(existsSync(join(agentDir, 'agent.yaml'))).toBe(true);
    expect(existsSync(join(agentDir, 'prompt.md'))).toBe(true);
    expect(existsSync(join(agentDir, 'tools.yaml'))).toBe(true);
  });

  it('loads agents from both builtin and custom namespaces', () => {
    const builtinDir = join(tempDir, 'agents', 'builtin', 'supervisor');
    mkdirSync(builtinDir, { recursive: true });
    writeFileSync(join(builtinDir, 'agent.yaml'), `id: supervisor
name: 项目监理
role: supervisor
memory:
  global: true
  project: true
`);
    writeFileSync(join(builtinDir, 'prompt.md'), '你是一个项目监理Agent。');
    writeFileSync(join(builtinDir, 'tools.yaml'), 'predefined:\n  - create_ticket\n');

    const customDir = join(tempDir, 'agents', 'custom', 'writer');
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, 'agent.yaml'), `id: writer
name: 文章撰写
role: specialist
`);
    writeFileSync(join(customDir, 'prompt.md'), '你是一个专业的作家');
    writeFileSync(join(customDir, 'tools.yaml'), 'predefined:\n  - file_read\n');

    const agents = loadAllAgents();
    const ids = agents.map((a) => a.id).sort();

    expect(ids).toEqual(['supervisor', 'writer']);
  });
});
