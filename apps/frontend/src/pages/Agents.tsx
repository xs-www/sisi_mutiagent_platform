import { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Popconfirm,
  Drawer,
  Descriptions,
  Spin,
  message,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons';
import { getAgents, getAgent, deleteAgent, createAgent, updateAgent } from '../api/agent';
import { getSkillPacks } from '../api/skill';
import { getToolDefinitions } from '../api/tools';
import type { Agent, AgentConfig, SkillPack, ToolDefinition } from '../types';

const { Title, Paragraph, Text } = Typography;

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<Agent | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [skillPacks, setSkillPacks] = useState<SkillPack[]>([]);
  const [toolDefinitions, setToolDefinitions] = useState<ToolDefinition[]>([]);
  const [form] = Form.useForm();

  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (error) {
      console.error('加载 Agent 列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSkillPacks = useCallback(async () => {
    try {
      const data = await getSkillPacks();
      setSkillPacks(data);
    } catch (error) {
      console.error('加载 Skill 包列表失败:', error);
    }
  }, []);

  const loadToolDefinitions = useCallback(async () => {
    try {
      const data = await getToolDefinitions();
      setToolDefinitions(data);
    } catch (error) {
      console.error('加载工具定义失败:', error);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    loadSkillPacks();
    loadToolDefinitions();
  }, [loadAgents, loadSkillPacks, loadToolDefinitions]);

  const handleViewDetail = async (id: string) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setCurrentAgent(null);
    try {
      const data = await getAgent(id);
      setCurrentAgent(data);
    } catch (error) {
      console.error('加载 Agent 详情失败:', error);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAgent(id);
      message.success('删除成功');
      loadAgents();
    } catch (error) {
      console.error('删除 Agent 失败:', error);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setCurrentAgent(null);
  };

  const handleCreate = () => {
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'specialist',
      tools: ['file_read', 'file_write', 'code_search'],
      globalMemory: true,
      projectMemory: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (record: Agent) => {
    setEditTarget(record);
    const cfg = record.config;
    form.setFieldsValue({
      id: cfg.id,
      name: cfg.name,
      role: cfg.role,
      systemPrompt: cfg.prompt.system,
      personality: cfg.prompt.personality,
      tools: cfg.tools.predefined,
      skills: cfg.skills || [],
      globalMemory: cfg.memory.global,
      projectMemory: cfg.memory.project,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 构建 approvalRequired：file_delete 和 shell_execute 默认需审批
      const approvalRequired = values.tools?.filter((t: string) =>
        t === 'file_delete' || t === 'shell_execute'
      ) || [];

      const payload = {
        name: values.name,
        role: values.role,
        prompt: {
          system: values.systemPrompt,
          personality: values.personality,
        },
        tools: {
          predefined: values.tools || [],
          approvalRequired,
        },
        memory: {
          global: values.globalMemory ?? true,
          project: values.projectMemory ?? true,
        },
        skills: values.skills || [],
      };

      if (editTarget) {
        await updateAgent(editTarget.id, payload);
        message.success('Agent 更新成功');
      } else {
        await createAgent({ ...payload, id: values.id });
        message.success('Agent 创建成功');
      }

      setModalOpen(false);
      form.resetFields();
      setEditTarget(null);
      loadAgents();
    } catch (error: any) {
      if (error?.errorFields) return; // 表单校验失败
      console.error('保存 Agent 失败:', error);
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnsType<Agent> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Agent) => (
        <Space>
          <span>{text}</span>
          {record.isBuiltIn && <Tag color="purple">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '角色',
      key: 'role',
      render: (_, record: Agent) => {
        const role = record.config.role;
        return role === 'supervisor' ? (
          <Tag color="blue">supervisor</Tag>
        ) : (
          <Tag>specialist</Tag>
        );
      },
    },
    {
      title: '工具',
      key: 'toolCount',
      render: (_, record: Agent) => `${record.config.tools.predefined.length} 个`,
    },
    {
      title: 'Skill 包',
      key: 'skills',
      render: (_, record: Agent) => {
        const count = record.config.skills?.length || 0;
        return count > 0 ? <Tag color="cyan">{count} 个</Tag> : <Text type="secondary">无</Text>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 280,
      render: (_, record: Agent) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除该 Agent?"
            description="删除后无法恢复"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Agent 管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增 Agent
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadAgents} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Table<Agent>
        rowKey="id"
        columns={columns}
        dataSource={agents}
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无 Agent" /> }}
        rowClassName={(_, index) => (index % 2 === 1 ? 'ant-table-row-striped' : '')}
      />

      <Drawer
        title="Agent 详情"
        open={drawerOpen}
        onClose={handleDrawerClose}
        width={600}
        destroyOnClose
      >
        {drawerLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : currentAgent ? (
          <AgentDetail agent={currentAgent} skillPacks={skillPacks} />
        ) : null}
      </Drawer>

      <Modal
        title={editTarget ? '编辑 Agent' : '新增 Agent'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setEditTarget(null); }}
        onOk={handleSave}
        confirmLoading={saving}
        width={680}
        destroyOnClose
        okText={editTarget ? '保存' : '创建'}
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
        >
          {!editTarget && (
            <Form.Item name="id" label="Agent ID" rules={[{ required: true, message: '请输入 Agent ID' }, { pattern: /^[a-zA-Z0-9_-]+$/, message: '只允许字母、数字、下划线、连字符' }]}>
              <Input placeholder="如：frontend-developer" />
            </Form.Item>
          )}

          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：前端开发Agent" />
          </Form.Item>

          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="specialist">specialist（专家）</Select.Option>
              <Select.Option value="supervisor">supervisor（监理）</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="systemPrompt" label="System Prompt" rules={[{ required: true, message: '请输入 System Prompt' }]}>
            <Input.TextArea rows={4} placeholder="如：你是一个专业的前端开发工程师..." />
          </Form.Item>

          <Form.Item name="personality" label="性格特征（可选）">
            <Input placeholder="如：专业、严谨、注重代码质量" />
          </Form.Item>

          <Form.Item name="tools" label="可用工具">
            <Select mode="multiple" placeholder="选择工具">
              {toolDefinitions.map(t => (
                <Select.Option key={t.name} value={t.name}>{t.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="skills" label="Skill 包" tooltip="引用已配置的 Skill 包，为 Agent 附加能力">
            <Select
              mode="multiple"
              placeholder="选择 Skill 包"
              allowClear
              options={skillPacks.map(s => ({ label: `${s.name} (${s.category})`, value: s.id }))}
            />
          </Form.Item>

          <Form.Item label="记忆配置">
            <Space>
              <Form.Item name="globalMemory" valuePropName="checked" noStyle>
                <Switch checkedChildren="全局记忆" unCheckedChildren="全局记忆" />
              </Form.Item>
              <Form.Item name="projectMemory" valuePropName="checked" noStyle>
                <Switch checkedChildren="项目记忆" unCheckedChildren="项目记忆" />
              </Form.Item>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary">file_delete 和 shell_execute 默认需要审批</Text>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function AgentDetail({ agent, skillPacks }: { agent: Agent; skillPacks: SkillPack[] }) {
  const cfg: AgentConfig = agent.config;
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Descriptions title="基本信息" bordered column={1} size="small">
        <Descriptions.Item label="ID">{agent.id}</Descriptions.Item>
        <Descriptions.Item label="名称">{agent.name}</Descriptions.Item>
        <Descriptions.Item label="角色">
          {cfg.role === 'supervisor' ? (
            <Tag color="blue">supervisor</Tag>
          ) : (
            <Tag>specialist</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="内置">
          {agent.isBuiltIn ? '是' : '否'}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="Prompt 配置" bordered column={1} size="small">
        <Descriptions.Item label="System">
          <Paragraph
            ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
            style={{ marginBottom: 0 }}
          >
            {cfg.prompt.system}
          </Paragraph>
        </Descriptions.Item>
        <Descriptions.Item label="Personality">
          {cfg.prompt.personality ? (
            <Paragraph
              ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
              style={{ marginBottom: 0 }}
            >
              {cfg.prompt.personality}
            </Paragraph>
          ) : (
            <span style={{ color: '#999' }}>未配置</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="工具配置" bordered column={1} size="small">
        <Descriptions.Item label="Predefined">
          {cfg.tools.predefined.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {cfg.tools.predefined.map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="ApprovalRequired">
          {cfg.tools.approvalRequired && cfg.tools.approvalRequired.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {cfg.tools.approvalRequired.map((t) => (
                <Tag key={t} color="orange">{t}</Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="Skill 包" bordered column={1} size="small">
        <Descriptions.Item label="已引用">
          {cfg.skills && cfg.skills.length > 0 ? (
            <Space size={[4, 4]} wrap>
              {cfg.skills.map((id) => {
                const sp = skillPacks.find(s => s.id === id);
                return (
                  <Tag key={id} color="cyan">
                    {sp ? sp.name : id}
                  </Tag>
                );
              })}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="记忆配置" bordered column={1} size="small">
        <Descriptions.Item label="Global Memory">
          {cfg.memory.global ? <Tag color="green">启用</Tag> : <Tag>未启用</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Project Memory">
          {cfg.memory.project ? <Tag color="green">启用</Tag> : <Tag>未启用</Tag>}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}
