import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Table,
  Spin,
  Empty,
  Statistic,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  FolderOpenOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { getProject, updateProject, getProjectMembers, addProjectMember, removeProjectMember, openProjectFolder, suggestProjectMembers } from '../api/project';
import { getTicketsByProject, deleteTicket } from '../api/ticket';
import { getAgents } from '../api/agent';
import { useGlobalStore } from '../store';
import { formatDate, TICKET_STATUS_LABEL, TICKET_STATUS_COLOR, TICKET_PRIORITY_LABEL } from '../utils';
import type { Project, ProjectMember, Agent, Ticket } from '../types';

const { Title, Paragraph, Text } = Typography;

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setCurrentProject } = useGlobalStore();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm] = Form.useForm();

  const [addMemberAgentId, setAddMemberAgentId] = useState<string | undefined>();
  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestedAgents, setSuggestedAgents] = useState<Agent[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedSuggestedIds, setSelectedSuggestedIds] = useState<string[]>([]);

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'pending').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const reviewing = tickets.filter(t => t.status === 'reviewing').length;
    const completed = tickets.filter(t => t.status === 'completed').length;
    return { total, pending, inProgress, reviewing, completed };
  }, [tickets]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, m, t, a] = await Promise.all([
        getProject(id),
        getProjectMembers(id),
        getTicketsByProject(id),
        getAgents(),
      ]);
      setProject(p);
      setMembers(m);
      setTickets(t);
      setAgents(a);
      setCurrentProject(p);
    } catch (error) {
      console.error('加载项目详情失败:', error);
    } finally {
      setLoading(false);
    }
  }, [id, setCurrentProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const supervisor = project?.supervisorId ? agentMap.get(project.supervisorId) : undefined;

  const candidateAgents = useMemo(() => {
    const memberIds = new Set(members.map(m => m.agentId));
    return agents.filter(a => !memberIds.has(a.id));
  }, [agents, members]);

  const handleEdit = () => {
    if (!project) return;
    editForm.setFieldsValue({
      name: project.name,
      description: project.description,
      supervisorId: project.supervisorId || undefined,
      status: project.status,
    });
    setEditModalOpen(true);
  };

  const handleEditSave = async () => {
    try {
      const values = await editForm.validateFields();
      setEditSaving(true);
      if (!id) return;
      const updated = await updateProject(id, values);
      setProject(updated);
      setEditModalOpen(false);
      message.success('项目更新成功');
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('更新项目失败:', error);
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!id || !addMemberAgentId) return;
    try {
      await addProjectMember(id, addMemberAgentId);
      message.success('成员添加成功');
      setAddMemberAgentId(undefined);
      setMembers(await getProjectMembers(id));
    } catch (error) {
      console.error('添加成员失败:', error);
    }
  };

  const handleSuggest = async () => {
    if (!id) return;
    setSuggestionsLoading(true);
    try {
      const list = await suggestProjectMembers(id);
      // 过滤掉已在项目中的 agent
      const memberIds = new Set(members.map(m => m.agentId));
      const filtered = list.filter(a => !memberIds.has(a.id));
      setSuggestedAgents(filtered);
      setSelectedSuggestedIds(filtered.map(a => a.id)); // 默认全选
      setSuggestModalOpen(true);
    } catch (error) {
      console.error('获取推荐成员失败:', error);
      message.error('获取推荐成员失败');
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleAddSuggested = async () => {
    if (!id || selectedSuggestedIds.length === 0) return;
    try {
      // 顺序添加，避免并发导致后端报错；如果需要可并行优化
      for (const aid of selectedSuggestedIds) {
        await addProjectMember(id, aid);
      }
      message.success('已将推荐 Agent 添加到项目');
      setSuggestModalOpen(false);
      setSuggestedAgents([]);
      setSelectedSuggestedIds([]);
      setMembers(await getProjectMembers(id));
    } catch (error) {
      console.error('添加推荐成员失败:', error);
      message.error('添加推荐成员失败');
    }
  };

  const handleRemoveMember = async (agentId: string) => {
    if (!id) return;
    try {
      await removeProjectMember(id, agentId);
      message.success('成员已移除');
      setMembers(await getProjectMembers(id));
    } catch (error) {
      console.error('移除成员失败:', error);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteTicket(ticketId);
      message.success('工单已删除');
      if (id) setTickets(await getTicketsByProject(id));
    } catch (error) {
      console.error('删除工单失败:', error);
    }
  };

  const handleOpenFolder = async (target: 'project' | 'workspace') => {
    if (!id) return;
    try {
      await openProjectFolder(id, target);
      message.success(target === 'workspace' ? '已在资源管理器打开工作空间' : '已在资源管理器打开项目目录');
    } catch (error) {
      console.error('打开文件夹失败:', error);
    }
  };

  const memberColumns: ColumnsType<ProjectMember> = [
    {
      title: 'Agent 名称',
      key: 'agentName',
      render: (_, record) => {
        const agent = agentMap.get(record.agentId);
        return agent ? (
          <Space>
            <Tag color={agent.config.role === 'supervisor' ? 'blue' : 'default'}>
              {agent.config.role === 'supervisor' ? '监理' : '专家'}
            </Tag>
            <Text strong>{agent.name}</Text>
          </Space>
        ) : <Text type="secondary">未知 Agent</Text>;
      },
    },
    {
      title: '加入时间',
      dataIndex: 'joinedAt',
      key: 'joinedAt',
      render: (v: string) => formatDate(v),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveMember(record.agentId)}
        >
          移除
        </Button>
      ),
    },
  ];

  const ticketColumns: ColumnsType<Ticket> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: Ticket) => (
        <a onClick={() => navigate(`/tickets/${record.id}`)}>{title}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: Ticket['status']) => (
        <Tag color={TICKET_STATUS_COLOR[status]}>{TICKET_STATUS_LABEL[status]}</Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (p: Ticket['priority']) => <Text>{TICKET_PRIORITY_LABEL[p]}</Text>,
    },
    {
      title: '指派人',
      dataIndex: 'assigneeId',
      key: 'assigneeId',
      width: 120,
      render: (aid: string | null) => {
        const agent = aid ? agentMap.get(aid) : null;
        return agent ? agent.name : <Text type="secondary">未指派</Text>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (v: string) => formatDate(v),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确认删除此工单？"
          onConfirm={() => handleDeleteTicket(record.id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Empty description="项目不存在" >
          <Button onClick={() => navigate('/projects')}>返回项目列表</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
          返回
        </Button>
      </Space>

      {/* 项目头部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
            <Space direction="vertical" size={4}>
              <Space>
                <Title level={3} style={{ margin: 0 }}>{project.name}</Title>
                <Tag color={project.status === 'active' ? 'green' : 'default'}>
                  {project.status === 'active' ? '进行中' : '已归档'}
                </Tag>
              </Space>
              {project.description && (
                <Paragraph type="secondary" style={{ margin: 0 }}>{project.description}</Paragraph>
              )}
              <Space size="large">
                <Text type="secondary">
                  主 Agent：<Text strong>{supervisor ? supervisor.name : '未指定'}</Text>
                </Text>
                <Text type="secondary">
                  创建时间：<Text>{formatDate(project.createdAt)}</Text>
                </Text>
              </Space>
            </Space>
            <Space>
              <Button icon={<FolderOpenOutlined />} onClick={() => handleOpenFolder('project')}>
                项目目录
              </Button>
              <Button icon={<CodeOutlined />} onClick={() => handleOpenFolder('workspace')}>
                工作空间
              </Button>
              <Button icon={<EditOutlined />} onClick={handleEdit}>
                编辑项目
              </Button>
              <Button
                type="primary"
                onClick={() => navigate(`/tickets?projectId=${project.id}`)}
              >
                进入工单
              </Button>
            </Space>
          </Space>
        </Space>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="总工单" value={stats.total} prefix={<FileTextOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="待分配" value={stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="进行中" value={stats.inProgress} prefix={<PlayCircleOutlined />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="待审核" value={stats.reviewing} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="已完成" value={stats.completed} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small">
            <Statistic title="成员数" value={members.length} prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* 成员管理 */}
      <Card
        title={<Space><TeamOutlined /><span>项目成员</span></Space>}
        style={{ marginBottom: 16 }}
        extra={
          <Space.Compact>
            <Select
              style={{ width: 200 }}
              placeholder="选择要添加的 Agent"
              value={addMemberAgentId}
              onChange={setAddMemberAgentId}
              allowClear
              showSearch
              optionFilterProp="label"
              options={candidateAgents.map(a => ({ label: a.name, value: a.id }))}
              disabled={candidateAgents.length === 0}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddMember}
              disabled={!addMemberAgentId}
            >
              添加
            </Button>
            <Button
              onClick={handleSuggest}
              loading={suggestionsLoading}
              disabled={candidateAgents.length === 0}
            >
              智能推荐
            </Button>
          </Space.Compact>
        }
      >
        <Table
          rowKey="agentId"
          columns={memberColumns}
          dataSource={members}
          pagination={false}
          size="middle"
          locale={{ emptyText: '暂无成员' }}
        />
      </Card>

      {/* 项目工单 */}
      <Card
        title={<Space><FileTextOutlined /><span>项目工单</span></Space>}
        extra={
          <Button type="link" onClick={() => navigate(`/tickets?projectId=${project.id}`)}>
            查看全部 →
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={ticketColumns}
          dataSource={tickets.slice(0, 10)}
          pagination={tickets.length > 10 ? { pageSize: 10, total: tickets.length } : false}
          size="middle"
          locale={{ emptyText: '暂无工单' }}
        />
      </Card>

      {/* 编辑项目 Modal */}
      <Modal
        title="编辑项目"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); editForm.resetFields(); }}
        onOk={handleEditSave}
        confirmLoading={editSaving}
        width={520}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <Form form={editForm} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="项目描述">
            <Input.TextArea rows={4} maxLength={1000} showCount />
          </Form.Item>
          <Form.Item name="supervisorId" label="主 Agent">
            <Select
              placeholder="请选择主 Agent（可选）"
              allowClear
              options={agents.map(a => ({ label: a.name, value: a.id }))}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select>
              <Select.Option value="active">进行中</Select.Option>
              <Select.Option value="archived">已归档</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 推荐成员 Modal */}
      <Modal
        title="推荐加入的 Agent"
        open={suggestModalOpen}
        onCancel={() => { setSuggestModalOpen(false); setSuggestedAgents([]); setSelectedSuggestedIds([]); }}
        onOk={handleAddSuggested}
        okText="添加选中"
        cancelText="取消"
        destroyOnClose
        width={640}
      >
        {suggestedAgents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24 }}>暂无推荐的 Agent</div>
        ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {suggestedAgents.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type="checkbox"
                  checked={selectedSuggestedIds.includes(a.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedSuggestedIds(prev => Array.from(new Set([...prev, a.id])));
                    else setSelectedSuggestedIds(prev => prev.filter(id => id !== a.id));
                  }}
                  style={{ marginRight: 12 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                    <Tag color={a.config.role === 'supervisor' ? 'blue' : 'default'}>{a.config.role === 'supervisor' ? '监理' : '专家'}</Tag>
                  </div>
                  {a.description && <div style={{ color: 'rgba(0,0,0,0.45)', marginTop: 4 }}>{a.description}</div>}
                </div>
                <div style={{ marginLeft: 12 }}>
                  <Button size="small" onClick={async () => {
                    if (!id) return;
                    try {
                      await addProjectMember(id, a.id);
                      message.success('成员添加成功');
                      setMembers(await getProjectMembers(id));
                    } catch (err) {
                      console.error('添加成员失败:', err);
                      message.error('添加成员失败');
                    }
                  }}>添加</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
