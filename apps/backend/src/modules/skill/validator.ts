// 技能包预检验：检查 .zip 技能包是否包含 SKILL.md，并从中解析技能名称与描述
import AdmZip from 'adm-zip';
import { parse as parseYaml } from 'yaml';
import { basename } from 'path';

const SKILL_MD_NAME = 'skill.md';

/** 技能包不符合规范时抛出，路由层将其映射为 400 响应 */
export class SkillValidationError extends Error {}

export interface SkillPackageInfo {
  skillMdContent: string;
  /** 从 SKILL.md frontmatter 中解析出的技能名称（可能为空字符串） */
  name: string;
  /** 从 SKILL.md frontmatter 中解析出的技能描述（可能为空字符串） */
  description: string;
}

function isZipBuffer(buffer: Buffer): boolean {
  // zip 文件头固定为 'PK'（0x50 0x4B）
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

/** 在压缩包内查找层级最浅的 SKILL.md（大小写不敏感），返回其内容 */
function findSkillMdEntry(buffer: Buffer): { entryName: string; content: string } | null {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new SkillValidationError('技能包格式错误：不是有效的 zip 压缩包');
  }

  let best: { entryName: string; content: string; depth: number } | null = null;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    if (basename(entry.entryName).toLowerCase() !== SKILL_MD_NAME) continue;

    const depth = entry.entryName.split(/[\\/]/).filter(Boolean).length;
    if (best && depth >= best.depth) continue;

    let content: string;
    try {
      content = entry.getData().toString('utf-8');
    } catch {
      throw new SkillValidationError('技能包格式错误：无法读取 SKILL.md 文件内容');
    }
    best = { entryName: entry.entryName, content, depth };
  }

  return best ? { entryName: best.entryName, content: best.content } : null;
}

/** 解析 SKILL.md 开头的 YAML frontmatter，提取 name 与 description */
export function parseSkillMdMeta(content: string): { name?: string; description?: string } {
  const lines = content.split(/\r?\n/);
  const firstDelimiter = lines.findIndex((line) => line.trim() === '---');
  if (firstDelimiter < 0) return {};

  const secondDelimiter = lines.findIndex((line, index) => index > firstDelimiter && line.trim() === '---');
  if (secondDelimiter < 0) return {};

  const frontMatter = lines.slice(firstDelimiter + 1, secondDelimiter).join('\n');
  let parsed: any;
  try {
    parsed = parseYaml(frontMatter) || {};
  } catch {
    return {};
  }

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
  const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
  return {
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
  };
}

/**
 * 预检验技能包：
 * 1. 必须为有效的 zip 压缩包；
 * 2. 包内必须包含 SKILL.md 文件，否则拒绝；
 * 3. 若 SKILL.md 含 YAML frontmatter，则读取技能名称与描述。
 */
export function inspectSkillPackage(buffer: Buffer): SkillPackageInfo {
  if (!isZipBuffer(buffer)) {
    throw new SkillValidationError('技能包格式错误：仅支持 .zip 压缩包');
  }

  const skillMd = findSkillMdEntry(buffer);
  if (!skillMd) {
    throw new SkillValidationError('技能包不符合规范：包内缺少 SKILL.md 文件，禁止上传');
  }

  const meta = parseSkillMdMeta(skillMd.content);
  return {
    skillMdContent: skillMd.content,
    name: meta.name || '',
    description: meta.description || '',
  };
}
