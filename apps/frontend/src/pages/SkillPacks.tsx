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
  Spin,
  message,
  Card,
  Empty,
  Drawer,
  Descriptions,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, EyeOutlined, ImportOutlined } from '@ant-design/icons';
import {
  getSkillPacks,
  createSkillPack,
  updateSkillPack,
  deleteSkillPack,
} from '../api/skill';
import type { SkillPack } from '../types';
import { formatDate } from '../utils';

const { Title, Text, Paragraph } = Typography;

const CATEGORY_COLOR: Record<string, string> = {
  general: 'default',
  coding: 'blue',
  testing: 'green',
  design: 'purple',
  devops: 'cyan',
  writing: 'magenta',
  analysis: 'geekblue',
};

export default function SkillPacks() {
  const [skills, setSkills] = useState<SkillPack[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SkillPack | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSkill, setDrawerSkill] = useState<SkillPack | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm();
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

  const handleCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({ category: 'general', isActive: true });
    setModalOpen(true);
  };

  const handleEdit = (record: SkillPack) => {
    setEditTarget(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      category: record.category,
      content: record.content,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editTarget) {
        await updateSkillPack(editTarget.id, {
          name: values.name,
          description: values.description,
          category: values.category,
          content: values.content,
          isActive: values.isActive,
        });
        message.success('Skill 包更新成功');
      } else {
        await createSkillPack({
          name: values.name,
          description: values.description,
          category: values.category,
          content: values.content,
        });
        message.success('Skill 包导入成功');
      }

      setModalOpen(false);
      form.resetFields();
      loadSkills();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('保存 Skill 包失败:', error);
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
      setSkills(prev => prev.map(s => s.id === record.id ? { ...s, isActive: checked } : s));
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const handleViewDetail = (record: SkillPack) => {
    setDrawerSkill(record);
    setDrawerOpen(true);
  };

  const handleImportJson = async () => {
    try {
      const values = await importForm.validateFields();
      setSaving(true);
      // 解析 JSON 导入
      const parsed = JSON.parse(values.jsonContent);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      let successCount = 0;
      for (const item of items) {
        if (item.name && item.content) {
          await createSkillPack({
            name: item.name,
            description: item.description || '',
            category: item.category || 'general',
            content: item.content,
          });
          successCount++;
        }
      }
      message.success(`成功导入 ${successCount} 个 Skill 包`);
      setImportOpen(false);
      importForm.resetFields();
      loadSkills();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('导入失败: ' + (error.message || 'JSON 格式错误'));
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
      render: (cat: string) => (
        <Tag color={CATEGORY_COLOR[cat] || 'default'}>{cat}</Tag>
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
      width: 180,
      render: (_: any, record: SkillPack) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)}>
            查看
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
            JSON 导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加 Skill 包
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadSkills} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary">
          Skill 包是可复用的能力定义，可在 Agent 配置中引用。每个 Skill 包包含名称、分类、描述和内容（Prompt 片段或能力定义）。
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
        width={560}
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
              <Descriptions.Item label="创建时间">{formatDate(drawerSkill.createdAt)}</Descriptions.Item>
            </Descriptions>
            <Descriptions title="内容" bordered column={1} size="small">
              <Descriptions.Item label="Content">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 13 }}>
                  {drawerSkill.content}
                </Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Drawer>

      <Modal
        title={editTarget ? '编辑 Skill 包' : '添加 Skill 包'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditTarget(null); }}
        onOk={handleSave}
        confirmLoading={saving}
        width={640}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" initialValues={{ category: 'general', isActive: true }}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：代码审查专家" />
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
            <Input placeholder="简要描述此 Skill 包的能力" />
          </Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <Input.TextArea rows={8} placeholder="Skill 包内容，如 Prompt 片段、能力定义、行为规范等..." style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          {editTarget && (
            <Form.Item name="isActive" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title="JSON 批量导入"
        open={importOpen}
        onCancel={() => { setImportOpen(false); importForm.resetFields(); }}
        onOk={handleImportJson}
        confirmLoading={saving}
        width={640}
        destroyOnClose
        okText="导入"
        cancelText="取消"
      >
        <Form form={importForm} layout="vertical">
          <Form.Item
            name="jsonContent"
            label="JSON 内容"
            rules={[{ required: true, message: '请输入 JSON 内容' }]}
            extra="支持单个对象或数组。格式: { name, description?, category?, content }"
          >
            <Input.TextArea
              rows={10}
              placeholder={'[\n  {\n    "name": "代码审查",\n    "description": "专业的代码审查能力",\n    "category": "coding",\n    "content": "你具备专业的代码审查能力..."\n  }\n]'}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
