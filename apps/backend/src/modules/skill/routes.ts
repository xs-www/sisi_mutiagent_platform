import { Router } from 'express';
import multer from 'multer';
import { extname, join, basename } from 'path';
import { writeFileSync, existsSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  createSkillPack,
  getAllSkillPacks,
  getSkillPackById,
  updateSkillPack,
  deleteSkillPack,
  getSkillsDirPath,
} from './repository.js';
import type { CreateSkillPackInput, UpdateSkillPackInput } from './types.js';
import { config } from '../../config/index.js';

export const skillRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function sanitizeFileBaseName(name: string): string {
  const sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim();
  return sanitized || `skill-${Date.now()}`;
}

function buildSkillFileMetadata(fileName: string, buffer: Buffer): Pick<CreateSkillPackInput, 'id' | 'fileName' | 'filePath' | 'fileExt' | 'fileSize' | 'importSource'> {
  const ext = extname(fileName).toLowerCase();
  if (ext !== '.zip' && ext !== '.skill') {
    throw new Error('仅支持 .zip 或 .skill 文件');
  }

  const id = uuidv4();
  const fileExt = ext.slice(1) as 'zip' | 'skill';
  const originalBaseName = basename(fileName, ext);
  const safeBaseName = sanitizeFileBaseName(originalBaseName);
  const safeExt = `.${fileExt}`;

  let storedName = `${safeBaseName}${safeExt}`;
  let targetPath = join(getSkillsDirPath(), storedName);
  let counter = 1;
  while (existsSync(targetPath)) {
    storedName = `${safeBaseName}(${counter})${safeExt}`;
    targetPath = join(getSkillsDirPath(), storedName);
    counter += 1;
  }

  writeFileSync(targetPath, buffer);

  return {
    id,
    fileName: storedName,
    filePath: `skills/${storedName}`,
    fileExt,
    fileSize: buffer.byteLength,
    importSource: 'upload',
  };
}

// 获取所有 Skill 包
skillRouter.get('/', (req, res) => {
  try {
    const skills = getAllSkillPacks();
    res.json(skills);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 获取单个 Skill 包
skillRouter.get('/:id', (req, res) => {
  try {
    const skill = getSkillPackById(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill pack not found' });
    res.json(skill);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 下载 Skill 包文件
skillRouter.get('/:id/download', (req, res) => {
  try {
    const skill = getSkillPackById(req.params.id);
    if (!skill) return res.status(404).json({ error: 'Skill pack not found' });

    const absolute = join(config.dataDir, skill.filePath);
    if (!existsSync(absolute)) {
      return res.status(404).json({ error: 'Skill file not found on disk' });
    }

    res.download(absolute, skill.fileName);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 上传导入 Skill 包（.zip/.skill）
skillRouter.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const metadata = buildSkillFileMetadata(req.file.originalname, req.file.buffer);
    const body = req.body as { name?: string; description?: string; category?: string };
    const name = body.name?.trim() || req.file.originalname.replace(/\.(zip|skill)$/i, '');
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const created = createSkillPack({
      id: metadata.id,
      name,
      description: body.description || '',
      category: body.category || 'general',
      fileName: metadata.fileName,
      filePath: metadata.filePath,
      fileExt: metadata.fileExt,
      fileSize: metadata.fileSize,
      importSource: 'upload',
    });

    res.status(201).json(created);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 兼容旧接口：提交 content 文本时自动落盘为 .skill 文件
skillRouter.post('/', (req, res) => {
  try {
    const body = req.body as any;
    const { name, description, category, content } = body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (typeof content === 'string' && content.length > 0) {
      const metadata = buildSkillFileMetadata(`${name}.skill`, Buffer.from(content, 'utf-8'));
      const created = createSkillPack({
        id: metadata.id,
        name,
        description,
        category,
        fileName: metadata.fileName,
        filePath: metadata.filePath,
        fileExt: metadata.fileExt,
        fileSize: metadata.fileSize,
        importSource: 'legacy',
      });
      return res.status(201).json(created);
    }

    return res.status(400).json({ error: '请使用 /api/skills/import 上传 .zip 或 .skill 文件' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 更新 Skill 包元数据
skillRouter.patch('/:id', (req, res) => {
  try {
    const input = req.body as UpdateSkillPackInput;
    const updated = updateSkillPack(req.params.id, input);
    if (!updated) return res.status(404).json({ error: 'Skill pack not found' });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 删除 Skill 包
skillRouter.delete('/:id', (req, res) => {
  try {
    const ok = deleteSkillPack(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Skill pack not found' });
    res.json({ message: 'Skill pack deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
