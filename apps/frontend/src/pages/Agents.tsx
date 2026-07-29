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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { getAgents, getAgent, deleteAgent } from '../api/agent';
import type { Agent, AgentConfig } from '../types';

const { Title, Paragraph } = Typography;

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);

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

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

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
      title: '模型',
      key: 'model',
      render: (_, record: Agent) => {
        const m = record.config.model;
        return `${m.provider} / ${m.name}`;
      },
    },
    {
      title: '工具数量',
      key: 'toolCount',
      render: (_, record: Agent) => {
        const count = record.config.tools.predefined.length;
        return `${count} 个工具`;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, record: Agent) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          >
            查看详情
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
        <Button icon={<ReloadOutlined />} onClick={loadAgents} loading={loading}>
          刷新
        </Button>
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
          <AgentDetail agent={currentAgent} />
        ) : null}
      </Drawer>
    </div>
  );
}

function AgentDetail({ agent }: { agent: Agent }) {
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

      <Descriptions title="模型配置" bordered column={1} size="small">
        <Descriptions.Item label="Provider">{cfg.model.provider}</Descriptions.Item>
        <Descriptions.Item label="Name">{cfg.model.name}</Descriptions.Item>
        <Descriptions.Item label="Fallback">
          {cfg.model.fallback ? (
            <span>
              {cfg.model.fallback.provider} / {cfg.model.fallback.name}
            </span>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
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
                <Tag key={t} color="orange">
                  {t}
                </Tag>
              ))}
            </Space>
          ) : (
            <span style={{ color: '#999' }}>无</span>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions title="记忆配置" bordered column={1} size="small">
        <Descriptions.Item label="Global Memory">
          {cfg.memory.global ? (
            <Tag color="green">启用</Tag>
          ) : (
            <Tag>未启用</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Project Memory">
          {cfg.memory.project ? (
            <Tag color="green">启用</Tag>
          ) : (
            <Tag>未启用</Tag>
          )}
        </Descriptions.Item>
      </Descriptions>
    </Space>
  );
}
