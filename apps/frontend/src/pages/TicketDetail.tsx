import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Typography,
  Card,
  Tag,
  Button,
  Space,
  Spin,
  Input,
  Select,
  Alert,
  Tooltip,
  message,
  Empty,
  Descriptions,
  Collapse,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CaretRightOutlined,
  StopOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { getTicket, getMessages, sendMessage, updateTicketStatus, getChildTickets } from '../api/ticket';
import { getAgents, executeAgentStream } from '../api/agent';
import {
  formatDate,
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_TYPE_LABEL,
  TICKET_STATUS_COLOR,
} from '../utils';
import type { Ticket, Message, Agent, TicketStatus, MessageType, AgentEvent } from '../types';

const { Title, Text, Paragraph } = Typography;

const PRIORITY_COLOR: Record<string, string> = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
};

const TYPE_COLOR: Record<string, string> = {
  task: 'blue',
  bug: 'red',
  discussion: 'cyan',
  decision: 'purple',
};

interface ExecuteResult {
  iterations: number;
  completed: boolean;
  error?: string;
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [childTickets, setChildTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [collapsedThoughts, setCollapsedThoughts] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const childAgentIds = useRef<Record<string, string>>({});

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getTicket(id);
      setTicket(data);
    } catch (error) {
      console.error('加载工单失败:', error);
      message.error('加载工单失败');
    }
  }, [id]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getMessages(id);
      setMessages(data);
    } catch (error) {
      console.error('加载消息失败:', error);
      message.error('加载消息失败');
    }
  }, [id]);

  const loadAgents = useCallback(async () => {
    try {
      const data = await getAgents();
      setAgents(data);
      if (data.length > 0 && !selectedAgentId) {
        setSelectedAgentId(data[0].id);
      }
    } catch (error) {
      console.error('加载 Agent 列表失败:', error);
    }
  }, [selectedAgentId]);

  const loadChildTickets = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getChildTickets(id);
      setChildTickets(data);
    } catch (error) {
      console.error('加载子工单失败:', error);
    }
  }, [id]);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    await Promise.all([loadTicket(), loadMessages(), loadAgents(), loadChildTickets()]);
    setLoading(false);
  }, [id, loadTicket, loadMessages, loadAgents, loadChildTickets]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length]);

  // 轮询兜底：本地未通过 SSE 执行时，若工单处于进行中/待审核（如后台子工单执行），
  // 定时拉取消息与状态，让用户看到后台 agent 的实时进展。
  useEffect(() => {
    if (!id || executing) return;
    const status = ticket?.status;
    if (status !== 'in_progress' && status !== 'reviewing') return;
    const timer = setInterval(() => {
      void Promise.all([loadTicket(), loadMessages(), loadChildTickets()]);
    }, 2500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ticket?.status, executing]);

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || !id) return;
    setSending(true);
    try {
      await sendMessage(id, {
        senderType: 'user',
        senderId: 'user',
        content,
        messageType: 'text',
      });
      setInputText('');
      await loadMessages();
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败');
    } finally {
      setSending(false);
    }
  };

  const handleExecute = async () => {
    if (!id || !selectedAgentId) return;
    setExecuting(true);
    setExecuteResult(null);
    const ac = new AbortController();
    abortRef.current = ac;
    let agentIdForSender = selectedAgentId;

    try {
      await executeAgentStream(
        selectedAgentId,
        { ticketId: id, projectId: ticket?.projectId },
        {
          signal: ac.signal,
          onEvent: (event: AgentEvent) => {
            const childId = event.childTicketId;
            const childTitle = event.childTicketTitle;

            // ===== 子工单事件（同步串行透传）：内联渲染，避免父工单页面阻塞期间静默 =====
            if (childId) {
              switch (event.type) {
                case 'start':
                  childAgentIds.current[childId] = event.agentId;
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `child-start-${childId}-${event.timestamp}`,
                      ticketId: id,
                      senderType: 'system',
                      senderId: 'system',
                      content: `📂 子工单「${childTitle}」开始执行`,
                      messageType: 'text',
                      createdAt: event.timestamp,
                    },
                  ]);
                  break;
                case 'thought':
                case 'action':
                case 'observation':
                case 'message': {
                  const msgType: MessageType = event.type === 'message' ? 'text' : (event.type as MessageType);
                  const isAgent = event.senderType === 'agent';
                  setMessages((prev) =>
                    prev.some((m) => m.id === event.messageId)
                      ? prev
                      : [
                          ...prev,
                          {
                            id: event.messageId,
                            ticketId: id,
                            senderType: isAgent ? 'agent' : 'system',
                            senderId: isAgent ? childAgentIds.current[childId] || childId : 'system',
                            content: `[子工单: ${childTitle}] ${event.content}`,
                            messageType: msgType,
                            createdAt: event.createdAt,
                          },
                        ]
                  );
                  break;
                }
                case 'ticket_status':
                  // 子工单状态变化只更新子工单列表，不影响父工单状态
                  setChildTickets((prev) =>
                    prev.map((t) => (t.id === childId ? { ...t, status: event.status } : t))
                  );
                  break;
                case 'complete':
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `child-complete-${childId}-${event.timestamp}`,
                      ticketId: id,
                      senderType: 'system',
                      senderId: 'system',
                      content: `✅ 子工单「${childTitle}」执行完成`,
                      messageType: 'text',
                      createdAt: event.timestamp,
                    },
                  ]);
                  break;
                case 'error':
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `child-error-${childId}-${event.timestamp}`,
                      ticketId: id,
                      senderType: 'system',
                      senderId: 'system',
                      content: `⚠️ 子工单「${childTitle}」执行失败: ${event.error}`,
                      messageType: 'text',
                      createdAt: event.timestamp,
                    },
                  ]);
                  break;
                case 'iteration_start':
                default:
                  break;
              }
              return;
            }

            // ===== 父工单事件 =====
            switch (event.type) {
              case 'start':
                agentIdForSender = event.agentId;
                break;
              case 'thought':
              case 'action':
              case 'observation':
              case 'message': {
                const msgType: MessageType = event.type === 'message' ? 'text' : (event.type as MessageType);
                const isAgent = event.senderType === 'agent';
                const synth: Message = {
                  id: event.messageId,
                  ticketId: id,
                  senderType: isAgent ? 'agent' : 'system',
                  senderId: isAgent ? agentIdForSender : 'system',
                  content: event.content,
                  messageType: msgType,
                  createdAt: event.createdAt,
                };
                setMessages((prev) => (prev.some((m) => m.id === synth.id) ? prev : [...prev, synth]));
                break;
              }
              case 'ticket_status':
                setTicket((prev) => (prev ? { ...prev, status: event.status } : prev));
                break;
              case 'supervision': {
                const decisionLabels: Record<string, string> = {
                  continue: '继续',
                  retry: '重试',
                  review: '审核',
                  terminate: '终止',
                };
                const label = decisionLabels[event.decision] || event.decision;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: event.messageId,
                    ticketId: id,
                    senderType: 'system',
                    senderId: 'system',
                    content: `[监督·${label}] ${event.suggestion}`,
                    messageType: 'observation',
                    createdAt: event.createdAt,
                  },
                ]);
                break;
              }
              case 'child_dispatched':
                childAgentIds.current[event.childTicketId] = event.assigneeId;
                setChildTickets((prev) =>
                  prev.some((t) => t.id === event.childTicketId)
                    ? prev
                    : [
                        ...prev,
                        {
                          id: event.childTicketId,
                          projectId: ticket?.projectId || '',
                          title: event.childTicketTitle,
                          description: '',
                          type: 'task',
                          priority: 'medium',
                          status: 'in_progress',
                          assigneeId: event.assigneeId,
                          createdBy: selectedAgentId,
                          parentTicketId: id,
                          createdAt: event.timestamp,
                          updatedAt: event.timestamp,
                          completedAt: null,
                        },
                      ]
                );
                break;
              case 'complete':
              case 'error':
                break;
            }
          },
          onComplete: (result) => {
            setExecuteResult({
              iterations: result.iterations,
              completed: result.completed,
              error: result.error,
            });
            if (result.error) {
              message.warning('Agent 执行完成，但存在错误');
            } else {
              message.success(`Agent 执行完成，迭代 ${result.iterations} 次`);
            }
          },
          onError: (err) => {
            message.error(err.message);
            setExecuteResult({ iterations: 0, completed: false, error: err.message });
          },
        }
      );
    } catch (e) {
      console.error('Agent 执行失败:', e);
      message.error('Agent 执行失败');
      setExecuteResult({ iterations: 0, completed: false, error: '执行请求失败' });
    } finally {
      setExecuting(false);
      abortRef.current = null;
      // 用服务端真相刷新，消除流式累积漂移
      await Promise.all([loadTicket(), loadMessages(), loadChildTickets()]);
    }
  };

  const handleStopExecute = () => {
    abortRef.current?.abort();
  };

  const handleStatusChange = async (next: TicketStatus) => {
    if (!id) return;
    setStatusUpdating(true);
    try {
      const updated = await updateTicketStatus(id, next);
      setTicket(updated);
      message.success(`状态已更新为：${TICKET_STATUS_LABEL[next]}`);
      await loadMessages();
    } catch (error) {
      console.error('更新状态失败:', error);
      message.error('更新状态失败');
    } finally {
      setStatusUpdating(false);
    }
  };

  const toggleThought = (msgId: string) => {
    setCollapsedThoughts((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const renderStatusButtons = () => {
    if (!ticket) return null;
    const status = ticket.status;
    const buttons: React.ReactNode[] = [];

    if (status === 'pending') {
      buttons.push(
        <Button
          key="start"
          type="primary"
          loading={statusUpdating}
          onClick={() => handleStatusChange('in_progress')}
        >
          开始处理
        </Button>,
      );
    } else if (status === 'in_progress') {
      buttons.push(
        <Button
          key="review"
          type="primary"
          loading={statusUpdating}
          onClick={() => handleStatusChange('reviewing')}
        >
          提交审核
        </Button>,
      );
    } else if (status === 'reviewing') {
      buttons.push(
        <Button
          key="complete"
          type="primary"
          loading={statusUpdating}
          onClick={() => handleStatusChange('completed')}
        >
          审核通过
        </Button>,
        <Button
          key="reject"
          danger
          loading={statusUpdating}
          onClick={() => handleStatusChange('in_progress')}
        >
          退回修改
        </Button>,
      );
    } else if (status === 'failed') {
      buttons.push(
        <Button
          key="reset"
          loading={statusUpdating}
          onClick={() => handleStatusChange('pending')}
        >
          重置为待处理
        </Button>,
        <Button
          key="retry"
          type="primary"
          icon={<PlayCircleOutlined />}
          disabled={!selectedAgentId || executing}
          onClick={handleExecute}
        >
          重新执行
        </Button>,
      );
    } else if (status === 'blocked') {
      buttons.push(
        <Button
          key="unblock"
          type="primary"
          loading={statusUpdating}
          onClick={() => handleStatusChange('in_progress')}
        >
          解除阻塞
        </Button>,
      );
    }

    return buttons.length > 0 ? <Space>{buttons}</Space> : null;
  };

  const renderMessage = (msg: Message) => {
    const time = formatDate(msg.createdAt);

    if (msg.messageType === 'thought') {
      const collapsed = collapsedThoughts.has(msg.id);
      return (
        <div key={msg.id} style={{ margin: '8px 0' }}>
          <Card
            size="small"
            style={{ background: '#f5f5f5', borderColor: '#e8e8e8' }}
            bodyStyle={{ padding: 12 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => toggleThought(msg.id)}
            >
              <Space>
                <CaretRightOutlined
                  rotate={collapsed ? 0 : 90}
                  style={{ fontSize: 12, color: '#999' }}
                />
                <Text type="secondary" strong>
                  💭 思考
                </Text>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {time}
              </Text>
            </div>
            {!collapsed && (
              <Paragraph
                style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap' }}
                type="secondary"
              >
                {msg.content}
              </Paragraph>
            )}
          </Card>
        </div>
      );
    }

    if (msg.messageType === 'action') {
      return (
        <div key={msg.id} style={{ margin: '8px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                flex: 1,
                background: '#e6f4ff',
                border: '1px solid #91caff',
                color: '#0958d9',
                padding: '8px 12px',
                borderRadius: 10,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.6,
              }}
            >
              <Text strong style={{ color: '#0958d9' }}>⚡ 行动日志</Text>
              <div style={{ marginTop: 4 }}>{msg.content}</div>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {time}
            </Text>
          </div>
        </div>
      );
    }

    if (msg.messageType === 'observation') {
      return (
        <div key={msg.id} style={{ margin: '8px 0' }}>
          <Card
            size="small"
            style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}
            bodyStyle={{ padding: 12 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#52c41a' }} strong>
                👁 观察
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {time}
              </Text>
            </div>
            <Paragraph
              style={{ marginTop: 8, marginBottom: 0, whiteSpace: 'pre-wrap', color: '#237804' }}
            >
              {msg.content}
            </Paragraph>
          </Card>
        </div>
      );
    }

    // text 类型
    if (msg.senderType === 'system') {
      return (
        <div
          key={msg.id}
          style={{ textAlign: 'center', margin: '8px 0' }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {msg.content} · {time}
          </Text>
        </div>
      );
    }

    if (msg.senderType === 'user') {
      return (
        <div
          key={msg.id}
          style={{ display: 'flex', justifyContent: 'flex-end', margin: '8px 0' }}
        >
          <div
            style={{
              maxWidth: '70%',
              background: '#1890ff',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 12,
              borderTopRightRadius: 2,
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
            <div style={{ fontSize: 11, textAlign: 'right', opacity: 0.8, marginTop: 4 }}>
              {time}
            </div>
          </div>
        </div>
      );
    }

    // agent
    return (
      <div
        key={msg.id}
        style={{ display: 'flex', justifyContent: 'flex-start', margin: '8px 0' }}
      >
        <div
          style={{
            maxWidth: '70%',
            background: '#f0f0f0',
            color: '#333',
            padding: '8px 12px',
            borderRadius: 12,
            borderTopLeftRadius: 2,
          }}
        >
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
          <div style={{ fontSize: 11, textAlign: 'right', opacity: 0.6, marginTop: 4 }}>{time}</div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="工单不存在或加载失败" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部信息卡片 */}
      <Card style={{ marginBottom: 16 }} size="small">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 300 }}>
            <Space align="center" size="middle" wrap>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
              >
                返回
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                {ticket.title}
              </Title>
              <Tag color={TICKET_STATUS_COLOR[ticket.status]}>
                {TICKET_STATUS_LABEL[ticket.status]}
              </Tag>
              <Tag color={PRIORITY_COLOR[ticket.priority]}>
                优先级：{TICKET_PRIORITY_LABEL[ticket.priority]}
              </Tag>
              <Tag color={TYPE_COLOR[ticket.type]}>{TICKET_TYPE_LABEL[ticket.type]}</Tag>
            </Space>
            <Descriptions size="small" column={2} style={{ marginTop: 12 }}>
              <Descriptions.Item label="指派人">
                {ticket.assigneeId || <Text type="secondary">未指派</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDate(ticket.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="工单ID">
                <Text copyable style={{ fontSize: 12 }}>
                  {ticket.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDate(ticket.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="父工单">
                {ticket.parentTicketId ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<LinkOutlined />}
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => navigate(`/tickets/${ticket.parentTicketId}`)}
                  >
                    前往父工单
                  </Button>
                ) : (
                  <Text type="secondary">无</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
            {ticket.description && (
              <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                {ticket.description}
              </Paragraph>
            )}
            <div style={{ marginTop: 12 }}>
              <Space wrap>
                {renderStatusButtons()}
                <Button icon={<ReloadOutlined />} onClick={loadAll}>
                  刷新
                </Button>
              </Space>
            </div>
            {childTickets.length > 0 && (
              <Collapse
                size="small"
                style={{ marginTop: 12 }}
                defaultActiveKey={['children']}
                items={[
                  {
                    key: 'children',
                    label: `子工单（${childTickets.length}）`,
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {childTickets.map((ct) => (
                          <div
                            key={ct.id}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          >
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, height: 'auto', textAlign: 'left' }}
                              onClick={() => navigate(`/tickets/${ct.id}`)}
                            >
                              {ct.title}
                            </Button>
                            <Tag color={TICKET_STATUS_COLOR[ct.status]}>
                              {TICKET_STATUS_LABEL[ct.status]}
                            </Tag>
                          </div>
                        ))}
                      </Space>
                    ),
                  },
                ]}
              />
            )}
          </div>

          {/* Agent 执行区 */}
          <Card size="small" style={{ minWidth: 320, background: '#fafafa' }} title="Agent 执行">
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Select
                style={{ width: '100%' }}
                placeholder="选择 Agent"
                value={selectedAgentId}
                onChange={setSelectedAgentId}
                options={agents.map((a) => ({ label: a.name, value: a.id }))}
                notFoundContent="暂无可用 Agent"
              />
              <Space style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={executing}
                  disabled={!selectedAgentId}
                  onClick={handleExecute}
                  style={{ flex: 1 }}
                >
                  {executing ? '执行中...' : '执行 Agent'}
                </Button>
                {executing && (
                  <Tooltip title="停止执行（当前迭代结束后中止）">
                    <Button danger icon={<StopOutlined />} onClick={handleStopExecute}>
                      停止
                    </Button>
                  </Tooltip>
                )}
              </Space>
              {executeResult && (
                <Alert
                  type={executeResult.error ? 'error' : 'success'}
                  showIcon
                  message={
                    executeResult.error
                      ? `执行失败：${executeResult.error}`
                      : `执行完成：迭代 ${executeResult.iterations} 次，已完成`
                  }
                  description={
                    executeResult.error
                      ? undefined
                      : `iterations: ${executeResult.iterations}, completed: ${String(
                          executeResult.completed,
                        )}`
                  }
                  style={{ marginTop: 8 }}
                />
              )}
            </Space>
          </Card>
        </div>
      </Card>

      {/* 消息列表 */}
      <Card
        size="small"
        style={{ flex: 1, minHeight: 500, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, overflowY: 'auto', padding: 16 }}
        title="对话消息"
      >
        {sortedMessages.length === 0 ? (
          <Empty description="暂无消息" style={{ marginTop: 80 }} />
        ) : (
          sortedMessages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* 底部输入区 */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Input.TextArea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
            disabled={sending || executing}
            autoSize={{ minRows: 2, maxRows: 6 }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Tooltip title="发送消息">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
                disabled={!inputText.trim() || executing}
              >
                发送
              </Button>
            </Tooltip>
          </div>
        </Space>
      </Card>
    </div>
  );
}
