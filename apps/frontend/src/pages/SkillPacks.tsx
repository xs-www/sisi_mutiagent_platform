import { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  message,
  Card,
  Empty,
  Drawer,
  Descriptions,
  Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, DeleteOutlined, EditOutlined, EyeOutlined, ImportOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  getSkillPacks,
  importSkillPackFile,
  updateSkillPack,
  deleteSkillPack,
  getSkillPackDownloadUrl,
} from '../api/skill';
import type { SkillPack } from '../types';
import { formatDate } from '../utils';

const { Title, Text } = Typography;

const CATEGORY_COLOR: Record<string, string> = {
  general: 'default',
  coding: 'blue',
  testing: 'green',
  design: 'purple',
  devops: 'cyan',
  writing: 'magenta',
  analysis: 'geekblue',
};

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SkillPacks() {
  const [skills, setSkills] = useState<SkillPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SkillPack | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSkill, setDrawerSkill] = useState<SkillPack | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  const [editForm] = Form.useForm();
  const [importForm] = Form.useForm();

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSkillPacks();
      setSkills(data);
    } catch (error) {
      console.error('加载 Skill 包列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const handleEdit = (record: SkillPack) => {
    setEditTarget(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      category: record.category,
      isActive: record.isActive,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    try {
      const values = await editForm.validateFields();
      setSaving(true);

      await updateSkillPack(editTarget.id, {
        name: values.name,
        description: values.description,
        category: values.category,
        isActive: values.isActive,
      });

      message.success('Skill 包元数据更新成功');
      setEditOpen(false);
      setEditTarget(null);
      editForm.resetFields();
      loadSkills();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('更新 Skill 包失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSkillPack(id);
      message.success('Skill 包已删除');
      loadSkills();
    } catch (error) {
      console.error('删除 Skill 包失败:', error);
    }
  };

  const handleToggleActive = async (record: SkillPack, checked: boolean) => {
    try {
      await updateSkillPack(record.id, { isActive: checked });
      setSkills((prev) => prev.map((s) => (s.id === record.id ? { ...s, isActive: checked } : s)));
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleViewDetail = (record: SkillPack) => {
    setDrawerSkill(record);
    setDrawerOpen(true);
  };

  const handleImportFile = async () => {
    try {
      const values = await importForm.validateFields();
      const file = fileList[0]?.originFileObj as File | undefined;
      if (!file) {
        message.error('请选择要导入的 .zip 或 .skill 文件');
        return;
      }

      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.zip') && !lower.endsWith('.skill')) {
        message.error('仅支持 .zip 或 .skill 文件');
        return;
      }

      setSaving(true);
      await importSkillPackFile({
        file,
        name: values.name,
        description: values.description,
        category: values.category,
      });

      message.success('Skill 包导入成功');
      setImportOpen(false);
      importForm.resetFields();
      setFileList([]);
      loadSkills();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('导入 Skill 包失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<SkillPack> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (cat: string) => <Tag color={CATEGORY_COLOR[cat] || 'default'}>{cat}</Tag>,
    },
    {
      title: '文件',
      key: 'file',
      width: 260,
      render: (_: any, record: SkillPack) => (
        <Space direction="vertical" size={0}>
          <Text>{record.fileName || '-'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.fileExt.toUpperCase()} · {formatBytes(record.fileSize)}
          </Text>
        </Space>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || <Text type="secondary">无</Text>,
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (active: boolean, record: SkillPack) => (
        <Switch checked={active} size="small" onChange={(c) => handleToggleActive(record, c)} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (t: string) => formatDate(t),
    },
    {
      title: '操作',
      key: 'action',
      width: 260,
      render: (_: any, record: SkillPack) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
          </Button>
          <Button type="link" size="small" icon={<DownloadOutlined />} href={getSkillPackDownloadUrl(record.id)}>
            下载
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除此 Skill 包？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Skill 包配置</Title>
        <Space>
          <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
            导入 .zip/.skill
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadSkills} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Skill 包实体文件保存在 data/skills 目录，数据库仅保存元数据。支持从前端导入 .zip 或 .skill 文件。
        </Text>
      </Card>

      <Table<SkillPack>
        rowKey="id"
        columns={columns}
        dataSource={skills}
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无 Skill 包" /> }}
        size="middle"
      />

      <Drawer
        title="Skill 包详情"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerSkill(null); }}
        width={620}
        destroyOnClose
      >
        {drawerSkill && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions title="基本信息" bordered column={1} size="small">
              <Descriptions.Item label="名称">{drawerSkill.name}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={CATEGORY_COLOR[drawerSkill.category] || 'default'}>{drawerSkill.category}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="描述">{drawerSkill.description || '无'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {drawerSkill.isActive ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="导入来源">{drawerSkill.importSource}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(drawerSkill.createdAt)}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="文件信息" bordered column={1} size="small">
              <Descriptions.Item label="文件名">{drawerSkill.fileName}</Descriptions.Item>
              <Descriptions.Item label="格式">{drawerSkill.fileExt.toUpperCase()}</Descriptions.Item>
              <Descriptions.Item label="大小">{formatBytes(drawerSkill.fileSize)}</Descriptions.Item>
              <Descriptions.Item label="存储路径">{drawerSkill.filePath}</Descriptions.Item>
              <Descriptions.Item label="下载">
                <Button size="small" icon={<DownloadOutlined />} href={getSkillPackDownloadUrl(drawerSkill.id)}>
                  下载文件
                </Button>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>

      <Modal
        title="导入 Skill 包文件"
        open={importOpen}
        onCancel={() => {
          setImportOpen(false);
          importForm.resetFields();
          setFileList([]);
        }}
        onOk={handleImportFile}
        confirmLoading={saving}
        width={640}
        destroyOnClose
        okText="导入"
        cancelText="取消"
      >
        <Form form={importForm} layout="vertical" initialValues={{ category: 'general' }}>
          <Form.Item
            label="Skill 文件"
            required
            extra="支持 .zip / .skill，单文件最大 20MB"
          >
            <Upload
              accept=".zip,.skill"
              maxCount={1}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: next }) => setFileList(next)}
            >
              <Button icon={<ImportOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="name" label="名称（可选）" extra="不填时将使用文件名作为 Skill 包名称">
            <Input placeholder="如：前端测试增强包" />
          </Form.Item>

          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="general">general（通用）</Select.Option>
              <Select.Option value="coding">coding（编码）</Select.Option>
              <Select.Option value="testing">testing（测试）</Select.Option>
              <Select.Option value="design">design（设计）</Select.Option>
              <Select.Option value="devops">devops（运维）</Select.Option>
              <Select.Option value="writing">writing（写作）</Select.Option>
              <Select.Option value="analysis">analysis（分析）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="描述（可选）">
            <Input placeholder="简要描述此 Skill 包" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑 Skill 包元数据"
        open={editOpen}
        onCancel={() => {
          setEditOpen(false);
          setEditTarget(null);
          editForm.resetFields();
        }}
        onOk={handleSaveEdit}
        confirmLoading={saving}
        width={560}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="Skill 包名称" />
          </Form.Item>

          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="general">general（通用）</Select.Option>
              <Select.Option value="coding">coding（编码）</Select.Option>
              <Select.Option value="testing">testing（测试）</Select.Option>
              <Select.Option value="design">design（设计）</Select.Option>
              <Select.Option value="devops">devops（运维）</Select.Option>
              <Select.Option value="writing">writing（写作）</Select.Option>
              <Select.Option value="analysis">analysis（分析）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input placeholder="描述此 Skill 包用途" />
          </Form.Item>

          <Form.Item name="isActive" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
