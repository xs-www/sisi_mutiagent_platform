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
  InputNumber,
  Select,
  Switch,
  Popconfirm,
  Spin,
  message,
  Card,
  Statistic,
  Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  getPlatformModels,
  createPlatformModel,
  updatePlatformModel,
  deletePlatformModel,
} from '../api/platform';
import { getProviderModels } from '../api/llm';
import type { PlatformModel } from '../types';
import { formatDate } from '../utils';

const { Title, Text } = Typography;

const PROVIDER_COLOR: Record<string, string> = {
  openai: 'green',
  anthropic: 'purple',
  ollama: 'blue',
  kimi: 'magenta',
  qwen: 'geekblue',
  deepseek: 'volcano',
  bailian: 'cyan',
};

const PROVIDER_LABEL: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  ollama: 'Ollama（本地）',
  kimi: 'Kimi（月之暗面）',
  qwen: 'Qwen（通义千问）',
  deepseek: 'DeepSeek',
  bailian: '百炼（阿里云）',
};

export default function PlatformSettings() {
  const [models, setModels] = useState<PlatformModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const [providerModels, setProviderModels] = useState<Record<string, string[]>>({});
  const watchedProvider = Form.useWatch('provider', form);
  const [currentProvider, setCurrentProvider] = useState<string>('ollama');

  useEffect(() => {
    if (watchedProvider) setCurrentProvider(watchedProvider);
  }, [watchedProvider]);

  const loadProviderModels = useCallback(async () => {
    try {
      const data = await getProviderModels();
      if (data && typeof data === 'object' && !('provider' in data)) {
        setProviderModels(data as Record<string, string[]>);
      }
    } catch (error) {
      console.error('加载 Provider 模型列表失败:', error);
    }
  }, []);

  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPlatformModels();
      setModels(data);
    } catch (error) {
      console.error('加载平台模型列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
    loadProviderModels();
  }, [loadModels, loadProviderModels]);

  const handleCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({ provider: 'bailian', priority: 0, isActive: true });
    setModalOpen(true);
  };

  const handleEdit = (record: PlatformModel) => {
    setEditTarget(record);
    form.setFieldsValue({
      provider: record.provider,
      modelName: record.modelName,
      priority: record.priority,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editTarget) {
        await updatePlatformModel(editTarget.id, {
          provider: values.provider,
          modelName: values.modelName,
          priority: values.priority,
          isActive: values.isActive,
        });
        message.success('模型更新成功');
      } else {
        await createPlatformModel({
          provider: values.provider,
          modelName: values.modelName,
          priority: values.priority ?? 0,
        });
        message.success('模型添加成功');
      }

      setModalOpen(false);
      form.resetFields();
      loadModels();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('保存模型失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePlatformModel(id);
      message.success('模型已删除');
      loadModels();
    } catch (error) {
      console.error('删除模型失败:', error);
    }
  };

  const handleToggleActive = async (record: PlatformModel, checked: boolean) => {
    try {
      await updatePlatformModel(record.id, { isActive: checked });
      message.success(`${record.provider}/${record.modelName} 已${checked ? '启用' : '停用'}`);
      setModels(prev => prev.map(m =>
        m.id === record.id ? { ...m, isActive: checked } : m
      ));
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const columns: ColumnsType<PlatformModel> = [
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      align: 'center',
      render: (p: number) => <Tag color={p === 0 ? 'red' : 'default'}>{p}</Tag>,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      width: 140,
      render: (provider: string) => (
        <Tag color={PROVIDER_COLOR[provider] || 'default'}>
          {PROVIDER_LABEL[provider] || provider}
        </Tag>
      ),
    },
    {
      title: '模型名',
      dataIndex: 'modelName',
      key: 'modelName',
      render: (name: string) => <Text code style={{ fontSize: 13 }}>{name}</Text>,
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean, record: PlatformModel) => (
        <Switch
          checked={active}
          size="small"
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (t: string) => formatDate(t),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: PlatformModel) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除此模型？"
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

  const activeCount = models.filter(m => m.isActive).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>平台模型配置</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加模型
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadModels} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary">
          平台统一管理 LLM 模型池。Agent 执行时按优先级（数字越小越优先）依次尝试可用模型。
          配合 API Key 管理页面，平台自动匹配对应 Provider 的 Key 进行调用。
        </Text>
      </Card>

      {models.length === 0 && !loading && (
        <Alert
          type="warning"
          message="尚未配置任何模型"
          description="Agent 执行前需要先在此添加至少一个可用模型。点击「添加模型」开始配置。"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16, maxWidth: 300 }}>
        <Statistic
          title="启用中的模型"
          value={activeCount}
          prefix={<ThunderboltOutlined style={{ color: '#1677ff' }} />}
          suffix={`/ ${models.length}`}
        />
      </Card>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={models}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Spin>

      <Modal
        title={editTarget ? '编辑模型' : '添加模型'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditTarget(null); }}
        onOk={handleSave}
        confirmLoading={saving}
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ provider: 'bailian', priority: 0, isActive: true }}
        >
          <Form.Item name="provider" label="Provider" rules={[{ required: true, message: '请选择 Provider' }]}>
            <Select disabled={!!editTarget}>
              <Select.Option value="ollama">Ollama（本地）</Select.Option>
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="kimi">Kimi（月之暗面）</Select.Option>
              <Select.Option value="qwen">Qwen（通义千问）</Select.Option>
              <Select.Option value="deepseek">DeepSeek</Select.Option>
              <Select.Option value="bailian">百炼（阿里云）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="modelName" label="模型名" rules={[{ required: true, message: '请选择或输入模型名' }]}>
            <Select
              placeholder="选择或输入模型名"
              showSearch
              allowClear
              options={(providerModels[currentProvider] || []).map(m => ({ label: m, value: m }))}
              notFoundContent="无预置模型，可直接输入"
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="priority" label="优先级（数字越小越优先）" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          {editTarget && (
            <Form.Item name="isActive" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="停用" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
