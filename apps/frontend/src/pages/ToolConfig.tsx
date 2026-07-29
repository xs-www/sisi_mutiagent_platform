import { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Switch,
  Spin,
  message,
  Card,
  Modal,
  Form,
  Input,
  Select,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { createToolDefinition, deleteToolDefinition, getToolDefinitions, updateToolConfig } from '../api/tools';
import type { ToolDefinition } from '../types';

const { Title, Text } = Typography;

const CATEGORY_COLOR: Record<string, string> = {
  file: 'blue',
  shell: 'orange',
  network: 'cyan',
  git: 'green',
  code: 'purple',
  project: 'magenta',
  custom: 'gold',
};

const CATEGORY_OPTIONS = [
  { label: 'file', value: 'file' },
  { label: 'shell', value: 'shell' },
  { label: 'network', value: 'network' },
  { label: 'git', value: 'git' },
  { label: 'code', value: 'code' },
  { label: 'project', value: 'project' },
  { label: 'custom', value: 'custom' },
];

const DEFAULT_PARAMS = `[
  {"name":"projectId","type":"string","required":false,"description":"项目ID"}
]`;

export default function ToolConfig() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm] = Form.useForm();

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getToolDefinitions();
      setTools(data);
    } catch (error) {
      console.error('加载工具定义失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleApprovalToggle = async (tool: ToolDefinition, checked: boolean) => {
    try {
      await updateToolConfig(tool.name, { approvalRequired: checked });
      message.success(`${tool.name} 审批要求已${checked ? '开启' : '关闭'}`);
      setTools(prev => prev.map(t =>
        t.name === tool.name ? { ...t, approvalRequired: checked } : t
      ));
    } catch (error) {
      console.error('更新工具配置失败:', error);
    }
  };

  const handleCreateTool = async () => {
    try {
      const values = await createForm.validateFields();
      const params = JSON.parse(values.paramsJson);
      if (!Array.isArray(params)) {
        throw new Error('参数必须是 JSON 数组');
      }

      setCreateSaving(true);
      await createToolDefinition({
        name: values.name,
        description: values.description,
        category: values.category,
        approvalRequired: !!values.approvalRequired,
        params,
      });
      message.success('工具创建成功');
      setCreateOpen(false);
      createForm.resetFields();
      await loadTools();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.message || '创建工具失败');
      console.error('创建工具失败:', error);
    } finally {
      setCreateSaving(false);
    }
  };

  const handleDeleteTool = async (tool: ToolDefinition) => {
    try {
      await deleteToolDefinition(tool.name);
      message.success('工具已删除');
      await loadTools();
    } catch (error) {
      console.error('删除工具失败:', error);
      message.error('删除工具失败');
    }
  };

  const columns: ColumnsType<ToolDefinition> = [
    {
      title: '工具名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text code>{name}</Text>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={CATEGORY_COLOR[category] || 'default'}>{category}</Tag>
      ),
    },
    {
      title: '参数',
      dataIndex: 'params',
      key: 'params',
      width: 200,
      render: (params: ToolDefinition['params']) => (
        <Space size={[4, 4]} wrap>
          {params.map(p => (
            <Tag key={p.name} style={{ fontSize: 12 }}>
              {p.required ? '*' : ''}{p.name}
              <Text type="secondary" style={{ fontSize: 11 }}>:{p.type}</Text>
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '需要审批',
      dataIndex: 'approvalRequired',
      key: 'approvalRequired',
      width: 100,
      render: (required: boolean, record: ToolDefinition) => (
        <Switch
          checked={required}
          size="small"
          onChange={(checked) => handleApprovalToggle(record, checked)}
        />
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: any, record: ToolDefinition) => (
        <Tag color={record.approvalRequired ? 'red' : 'green'}>
          {record.approvalRequired ? '需审批' : '可直接执行'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: ToolDefinition) => (
        record.category === 'custom' ? (
          <Popconfirm
            title="确认删除该自定义工具？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => handleDeleteTool(record)}
          >
            <Button danger type="link" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        ) : (
          <Text type="secondary">内置</Text>
        )
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>工具配置</Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            添加工具
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadTools} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary">
          平台提供以下内置工具。开启"需要审批"后，Agent 调用该工具时会创建审批请求，等待用户确认后执行。
        </Text>
      </Card>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={tools}
          rowKey="name"
          pagination={false}
          size="middle"
        />
      </Spin>

      <Modal
        title="添加工具"
        open={createOpen}
        onCancel={() => { setCreateOpen(false); createForm.resetFields(); }}
        onOk={handleCreateTool}
        confirmLoading={createSaving}
        okText="创建"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            category: 'custom',
            approvalRequired: false,
            paramsJson: DEFAULT_PARAMS,
          }}
        >
          <Form.Item name="name" label="工具名称" rules={[{ required: true, message: '请输入工具名称' }]}> 
            <Input placeholder="如：my_custom_tool" />
          </Form.Item>
          <Form.Item name="description" label="工具描述" rules={[{ required: true, message: '请输入工具描述' }]}> 
            <Input.TextArea rows={2} placeholder="说明这个工具做什么" />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item name="approvalRequired" label="需要审批" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            name="paramsJson"
            label="参数定义 JSON"
            rules={[{ required: true, message: '请输入参数定义 JSON' }]}
            extra="格式必须是数组，每项包含 name、type、required、description。"
          >
            <Input.TextArea rows={8} spellCheck={false} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
