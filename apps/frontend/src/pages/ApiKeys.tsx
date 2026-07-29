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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, PlusOutlined, DeleteOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons';
import { getApiKeys, createApiKey, updateApiKey, deleteApiKey } from '../api/apikeys';
import type { ApiKey } from '../types';
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

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getApiKeys();
      setKeys(data);
    } catch (error) {
      console.error('加载 API Key 列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({ provider: 'openai', maxConcurrency: 1, isActive: true });
    setModalOpen(true);
  };

  const handleEdit = (record: ApiKey) => {
    setEditTarget(record);
    form.setFieldsValue({
      provider: record.provider,
      name: record.name,
      apiKey: '', // 编辑时不预填脱敏key，用户重新输入
      maxConcurrency: record.maxConcurrency,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editTarget) {
        const update: Record<string, any> = {
          name: values.name,
          maxConcurrency: values.maxConcurrency,
          isActive: values.isActive,
        };
        if (values.apiKey) {
          update.apiKey = values.apiKey;
        }
        await updateApiKey(editTarget.id, update);
        message.success('API Key 更新成功');
      } else {
        await createApiKey({
          provider: values.provider,
          name: values.name,
          apiKey: values.apiKey,
          maxConcurrency: values.maxConcurrency || 1,
        });
        message.success('API Key 创建成功');
      }

      setModalOpen(false);
      form.resetFields();
      loadKeys();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('保存 API Key 失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteApiKey(id);
      message.success('API Key 已删除');
      loadKeys();
    } catch (error) {
      console.error('删除 API Key 失败:', error);
    }
  };

  const handleToggleActive = async (record: ApiKey, checked: boolean) => {
    try {
      await updateApiKey(record.id, { isActive: checked });
      message.success(`${record.name} 已${checked ? '启用' : '停用'}`);
      setKeys(prev => prev.map(k =>
        k.id === record.id ? { ...k, isActive: checked } : k
      ));
    } catch (error) {
      console.error('更新状态失败:', error);
    }
  };

  const columns: ColumnsType<ApiKey> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => (
        <Tag color={PROVIDER_COLOR[provider] || 'default'}>{provider}</Tag>
      ),
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      render: (key: string) => <Text code style={{ fontSize: 13 }}>{key}</Text>,
    },
    {
      title: '最大并发',
      dataIndex: 'maxConcurrency',
      key: 'maxConcurrency',
      width: 100,
      align: 'center',
      render: (n: number) => <Tag color="blue">{n}</Tag>,
    },
    {
      title: '启用',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (active: boolean, record: ApiKey) => (
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
      render: (_: any, record: ApiKey) => (
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
            title="确认删除此 API Key？"
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

  const activeCount = keys.filter(k => k.isActive).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>API Key 管理</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增 Key
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadKeys} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16, maxWidth: 300 }}>
        <Statistic
          title="启用中的 Key"
          value={activeCount}
          prefix={<KeyOutlined style={{ color: '#1677ff' }} />}
          suffix={`/ ${keys.length}`}
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary">
          平台统一管理 API Key。Agent 调用外部 LLM 时，优先使用 Agent 自身配置的 Key；
          若未配置，则从平台 Key 池中按并发负载自动选择可用 Key。
        </Text>
      </Card>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={keys}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Spin>

      <Modal
        title={editTarget ? '编辑 API Key' : '新增 API Key'}
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
          initialValues={{ provider: 'openai', maxConcurrency: 1, isActive: true }}
        >
          <Form.Item name="provider" label="Provider" rules={[{ required: true, message: '请选择 Provider' }]}>
            <Select disabled={!!editTarget}>
              <Select.Option value="openai">OpenAI</Select.Option>
              <Select.Option value="anthropic">Anthropic</Select.Option>
              <Select.Option value="ollama">Ollama（本地）</Select.Option>
              <Select.Option value="kimi">Kimi（月之暗面）</Select.Option>
              <Select.Option value="qwen">Qwen（通义千问）</Select.Option>
              <Select.Option value="deepseek">DeepSeek</Select.Option>
              <Select.Option value="bailian">百炼（阿里云）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：OpenAI 主Key" />
          </Form.Item>

          <Form.Item
            name="apiKey"
            label="API Key"
            rules={editTarget ? [] : [{ required: true, message: '请输入 API Key' }]}
            extra={editTarget ? '留空则不修改原 Key' : undefined}
          >
            <Input.Password placeholder="sk-..." visibilityToggle />
          </Form.Item>

          <Form.Item name="maxConcurrency" label="最大并发数" rules={[{ required: true }]}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} />
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
