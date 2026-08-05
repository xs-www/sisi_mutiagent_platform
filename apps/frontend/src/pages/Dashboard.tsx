import { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin, Table, Tag, Empty, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  TeamOutlined,
  FolderOpenOutlined,
  OrderedListOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { getAgents } from '../api/agent';
import { getProjects } from '../api/project';
import { getPendingApprovals } from '../api/approval';
import { getUsageSummary, type ProjectUsageSummary } from '../api/usage';

const { Title, Text } = Typography;

interface DashboardStats {
  agentCount: number;
  projectCount: number;
  ticketCount: number;
  approvalCount: number;
}

// 格式化 token 数（千分位）
function formatTokens(n: number): string {
  return n.toLocaleString('zh-CN');
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    agentCount: 0,
    projectCount: 0,
    ticketCount: 0,
    approvalCount: 0,
  });
  const [usage, setUsage] = useState<ProjectUsageSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setLoading(true);
      try {
        const [agents, projects, approvals, usageList] = await Promise.all([
          getAgents(),
          getProjects(),
          getPendingApprovals(),
          getUsageSummary(),
        ]);
        if (cancelled) return;
        setStats({
          agentCount: agents.length,
          projectCount: projects.length,
          ticketCount: 0,
          approvalCount: approvals.length,
        });
        setUsage(usageList);
      } catch (error) {
        console.error('加载 Dashboard 统计数据失败:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  const usageColumns: ColumnsType<ProjectUsageSummary> = [
    {
      title: '项目',
      dataIndex: 'projectName',
      key: 'projectName',
      render: (name: string | undefined, record) =>
        name || <Text type="secondary">平台级消耗（未关联项目）</Text>,
    },
    {
      title: '调用次数',
      dataIndex: 'callCount',
      key: 'callCount',
      width: 100,
      align: 'right',
      render: (v: number) => formatTokens(v),
    },
    {
      title: '输入命中缓存',
      dataIndex: 'inputCacheHitTokens',
      key: 'inputCacheHitTokens',
      width: 130,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{formatTokens(v)}</Text>,
    },
    {
      title: '输入未命中',
      dataIndex: 'inputCacheMissTokens',
      key: 'inputCacheMissTokens',
      width: 120,
      align: 'right',
      render: (v: number) => <Text style={{ color: '#fa8c16' }}>{formatTokens(v)}</Text>,
    },
    {
      title: '输出',
      dataIndex: 'outputTokens',
      key: 'outputTokens',
      width: 100,
      align: 'right',
      render: (v: number) => formatTokens(v),
    },
    {
      title: '合计',
      dataIndex: 'totalTokens',
      key: 'totalTokens',
      width: 120,
      align: 'right',
      render: (v: number) => <Text strong>{formatTokens(v)}</Text>,
    },
    {
      title: '命中率',
      key: 'hitRate',
      width: 90,
      align: 'right',
      render: (_, record) => {
        const inputTotal = record.inputCacheHitTokens + record.inputCacheMissTokens;
        if (inputTotal === 0) return <Text type="secondary">-</Text>;
        const rate = (record.inputCacheHitTokens / inputTotal) * 100;
        return <Tag color={rate >= 50 ? 'green' : 'default'}>{rate.toFixed(1)}%</Tag>;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>开发平台概览</Title>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Agent 数量"
              value={stats.agentCount}
              prefix={<TeamOutlined style={{ color: '#1677ff' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="项目数量"
              value={stats.projectCount}
              prefix={<FolderOpenOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理工单"
              value={stats.ticketCount}
              prefix={<OrderedListOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批数"
              value={stats.approvalCount}
              prefix={<SafetyOutlined style={{ color: '#f5222d' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Space><ThunderboltOutlined /><span>各项目 Token 消耗</span></Space>}
        style={{ marginTop: 16 }}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Table
          rowKey={(record) => record.projectId ?? 'platform'}
          columns={usageColumns}
          dataSource={usage}
          pagination={false}
          size="middle"
          locale={{ emptyText: <Empty description="暂无 Token 消耗记录" /> }}
        />
      </Card>
    </div>
  );
}
