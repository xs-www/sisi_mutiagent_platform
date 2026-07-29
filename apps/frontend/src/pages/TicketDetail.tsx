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
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import { getTicket, getMessages, sendMessage, updateTicketStatus } from '../api/ticket';
import { getAgents, executeAgent } from '../api/agent';
import {
  formatDate,
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_TYPE_LABEL,
  TICKET_STATUS_COLOR,
} from '../utils';
import type { Ticket, Message, Agent, TicketStatus } from '../types';

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
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>();
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [collapsedThoughts, setCollapsedThoughts] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    await Promise.all([loadTicket(), loadMessages(), loadAgents()]);
    setLoading(false);
  }, [id, loadTicket, loadMessages, loadAgents]);

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
    try {
      const result = await executeAgent(selectedAgentId, { ticketId: id });
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
      await loadMessages();
    } catch (error) {
      console.error('Agent 执行失败:', error);
      message.error('Agent 执行失败');
      setExecuteResult({
        iterations: 0,
        completed: false,
        error: '执行请求失败',
      });
    } finally {
      setExecuting(false);
    }
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Tag color="blue" style={{ padding: '4px 8px', margin: 0 }}>
              ⚡ 行动 · {msg.content}
            </Tag>
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
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={executing}
                disabled={!selectedAgentId}
                block
                onClick={handleExecute}
              >
                {executing ? '执行中...' : '执行 Agent'}
              </Button>
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
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入消息，按回车发送..."
            onPressEnter={handleSend}
            disabled={sending}
            autoFocus
          />
          <Tooltip title="发送消息">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              disabled={!inputText.trim()}
            >
              发送
            </Button>
          </Tooltip>
        </Space.Compact>
      </Card>
    </div>
  );
}
