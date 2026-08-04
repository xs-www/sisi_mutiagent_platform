import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography,
  Card,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Spin,
  message,
  Alert,
} from 'antd';
import { PlusOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { getTicketsByProject, createTicket, updateTicketStatus } from '../api/ticket';
import { getProjects, getProjectMembers } from '../api/project';
import { getAgents } from '../api/agent';
import {
  formatDate,
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_TYPE_LABEL,
  TICKET_STATUS_COLOR,
} from '../utils';
import type { Ticket, Project, Agent, TicketStatus, TicketType, TicketPriority } from '../types';

const { Title, Text } = Typography;

const PRIORITY_TAG_COLOR: Record<TicketPriority, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

const TYPE_TAG_COLOR: Record<TicketType, string> = {
  task: 'blue',
  bug: 'red',
  discussion: 'green',
  decision: 'purple',
};

const COLUMNS: TicketStatus[] = ['pending', 'in_progress', 'reviewing', 'completed', 'failed', 'blocked'];

// 状态流转：pending → in_progress → reviewing → completed；failed → pending（重置）；blocked → in_progress（解除）
const NEXT_STATUS: Record<TicketStatus, TicketStatus | null> = {
  pending: 'in_progress',
  in_progress: 'reviewing',
  reviewing: 'completed',
  completed: null,
  failed: 'pending',
  blocked: 'in_progress',
};

export default function Tickets() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectMembers, setProjectMembers] = useState<Agent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projectsLoading, setProjectsLoading] = useState<boolean>(true);
  const [ticketsLoading, setTicketsLoading] = useState<boolean>(false);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  async function loadProjects() {
    setProjectsLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    } finally {
      setProjectsLoading(false);
    }
  }

  async function loadAgents() {
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (error) {
      console.error('加载 Agent 列表失败:', error);
    }
  }

  async function loadProjectMembers(projectId: string) {
    try {
      const members = await getProjectMembers(projectId);
      // members 是 ProjectMember[]，需要把 agentId 映射为 Agent 对象
      // 调用后端时前端没有 Agent 的完整信息，这里取当前 agents 列表中匹配的 Agent
      const memberAgents = members
        .map((m) => agents.find((a) => a.id === m.agentId))
        .filter(Boolean) as Agent[];
      setProjectMembers(memberAgents);
    } catch (error) {
      console.error('加载项目成员失败:', error);
    }
  }

  async function loadTickets(projectId: string) {
    setTicketsLoading(true);
    try {
      const data = await getTicketsByProject(projectId);
      setTickets(data);
    } catch (error) {
      console.error('加载工单列表失败:', error);
      message.error('加载工单列表失败');
    } finally {
      setTicketsLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
    loadAgents();
  }, []);

  useEffect(() => {
    if (projectIdFromUrl) {
      loadTickets(projectIdFromUrl);
    } else {
      setTickets([]);
    }
  }, [projectIdFromUrl]);

  function handleProjectChange(value: string | undefined) {
    setSearchParams(value ? { projectId: value } : {});
  }

  function handleCardClick(ticketId: string) {
    navigate(`/tickets/${ticketId}`);
  }

  async function handleAdvance(ticket: Ticket) {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setAdvancingId(ticket.id);
    try {
      await updateTicketStatus(ticket.id, next);
      message.success('工单状态已更新');
      if (projectIdFromUrl) {
        await loadTickets(projectIdFromUrl);
      }
    } catch (error) {
      console.error('更新工单状态失败:', error);
      message.error('更新工单状态失败');
    } finally {
      setAdvancingId(null);
    }
  }

  async function handleReturn(ticket: Ticket) {
    setAdvancingId(ticket.id);
    try {
      await updateTicketStatus(ticket.id, 'in_progress');
      message.success('工单已退回进行中');
      if (projectIdFromUrl) {
        await loadTickets(projectIdFromUrl);
      }
    } catch (error) {
      console.error('退回工单失败:', error);
      message.error('退回工单失败');
    } finally {
      setAdvancingId(null);
    }
  }

  async function handleCreateTicket() {
    if (!projectIdFromUrl) {
      message.warning('请先选择项目');
      return;
    }
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await createTicket({
        projectId: projectIdFromUrl,
        title: values.title?.trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
        priority: values.priority,
        assigneeId: values.assigneeId || undefined,
        createdBy: 'user',
      });
      message.success('工单创建成功');
      setModalOpen(false);
      form.resetFields();
      await loadTickets(projectIdFromUrl);
    } catch (error: any) {
      if (error?.errorFields) return; // 表单校验失败
      console.error('创建工单失败:', error);
      message.error('创建工单失败');
    } finally {
      setSubmitting(false);
    }
  }

  // 当打开新建工单弹窗或切换 project 时，加载该项目成员
  useEffect(() => {
    if (modalOpen && projectIdFromUrl) {
      void loadProjectMembers(projectIdFromUrl);
    }
  }, [modalOpen, projectIdFromUrl, agents]);

  const ticketsByStatus = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      pending: [],
      in_progress: [],
      reviewing: [],
      completed: [],
      failed: [],
      blocked: [],
    };
    tickets.forEach((t) => {
      if (map[t.status]) map[t.status].push(t);
    });
    return map;
  }, [tickets]);

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Space
        style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}
        align="center"
      >
        <Space align="center">
          <Title level={3} style={{ margin: 0 }}>
            工单看板
          </Title>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="请选择项目"
            style={{ width: 260 }}
            value={projectIdFromUrl || undefined}
            onChange={handleProjectChange}
            loading={projectsLoading}
            options={projects.map((p) => ({ label: p.name, value: p.id }))}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!projectIdFromUrl}
          onClick={() => setModalOpen(true)}
        >
          新建工单
        </Button>
      </Space>

      {!projectIdFromUrl ? (
        <Alert
          type="warning"
          showIcon
          message="请先选择项目"
          description="在左上方选择一个项目后，将显示该项目的工单看板。"
        />
      ) : (
        <Spin spinning={ticketsLoading}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            {COLUMNS.map((status) => {
              const list = ticketsByStatus[status];
              return (
                <div
                  key={status}
                  style={{
                    minWidth: 280,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 12 }}>
                    <Tag
                      color={TICKET_STATUS_COLOR[status]}
                      style={{ fontSize: 14, padding: '4px 16px', margin: 0 }}
                    >
                      {TICKET_STATUS_LABEL[status]} · {list.length}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {list.length === 0 ? (
                      <Card size="small" style={{ textAlign: 'center' }} styles={{ body: { padding: 16 } }}>
                        <Text type="secondary">暂无工单</Text>
                      </Card>
                    ) : (
                      list.map((ticket) => {
                        const assignee = ticket.assigneeId
                          ? agentMap.get(ticket.assigneeId)
                          : undefined;
                        return (
                          <Card
                            key={ticket.id}
                            size="small"
                            hoverable
                            onClick={() => handleCardClick(ticket.id)}
                            styles={{ body: { padding: 12 } }}
                          >
                            <div style={{ marginBottom: 8 }}>
                              <Text strong>{ticket.title}</Text>
                            </div>
                            <Space size={4} wrap style={{ marginBottom: 8 }}>
                              <Tag color={PRIORITY_TAG_COLOR[ticket.priority]}>
                                {TICKET_PRIORITY_LABEL[ticket.priority]}
                              </Tag>
                              <Tag color={TYPE_TAG_COLOR[ticket.type]}>
                                {TICKET_TYPE_LABEL[ticket.type]}
                              </Tag>
                            </Space>
                            <div style={{ marginBottom: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                指派：
                              </Text>
                              <Text style={{ fontSize: 12 }}>
                                {assignee ? assignee.name : '未指派'}
                              </Text>
                            </div>
                            <div style={{ marginBottom: 8 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {formatDate(ticket.createdAt)}
                              </Text>
                            </div>
                            <Space
                              style={{ width: '100%', justifyContent: 'space-between' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {ticket.status === 'reviewing' ? (
                                <Button
                                  size="small"
                                  icon={<ArrowLeftOutlined />}
                                  loading={advancingId === ticket.id}
                                  onClick={() => handleReturn(ticket)}
                                >
                                  退回
                                </Button>
                              ) : (
                                <span />
                              )}
                              {NEXT_STATUS[ticket.status] && (
                                <Button
                                  size="small"
                                  type="primary"
                                  icon={<ArrowRightOutlined />}
                                  loading={advancingId === ticket.id}
                                  onClick={() => handleAdvance(ticket)}
                                >
                                  推进
                                </Button>
                              )}
                            </Space>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Spin>
      )}

      <Modal
        title="新建工单"
        open={modalOpen}
        onOk={handleCreateTicket}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={submitting}
        okText="创建"
        cancelText="取消"
        destroyOnClose
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          initialValues={{ type: 'task', priority: 'medium' }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[
              { required: true, message: '请输入工单标题' },
              { whitespace: true, message: '标题不能为空白字符' },
            ]}
          >
            <Input placeholder="请输入工单标题" maxLength={200} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={4} placeholder="工单描述（可选）" maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
            <Select
              options={[
                { label: TICKET_TYPE_LABEL.task, value: 'task' },
                { label: TICKET_TYPE_LABEL.bug, value: 'bug' },
                { label: TICKET_TYPE_LABEL.discussion, value: 'discussion' },
                { label: TICKET_TYPE_LABEL.decision, value: 'decision' },
              ]}
            />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
            <Select
              options={[
                { label: TICKET_PRIORITY_LABEL.high, value: 'high' },
                { label: TICKET_PRIORITY_LABEL.medium, value: 'medium' },
                { label: TICKET_PRIORITY_LABEL.low, value: 'low' },
              ]}
            />
          </Form.Item>
          <Form.Item name="assigneeId" label="指派 Agent">
            <Select
              placeholder="请选择指派 Agent（可选）"
              allowClear
              showSearch
              optionFilterProp="label"
              loading={projectMembers.length === 0 && agents.length === 0}
              // 优先展示项目成员列表，如无成员则回退到平台 Agent 列表
              options={
                projectMembers.length > 0
                  ? projectMembers.map((a) => ({ label: a.name, value: a.id }))
                  : agents.map((a) => ({ label: a.name, value: a.id }))
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
