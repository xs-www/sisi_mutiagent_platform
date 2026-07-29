import { useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, Spin } from 'antd';
import {
  TeamOutlined,
  FolderOpenOutlined,
  OrderedListOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { getAgents } from '../api/agent';
import { getProjects } from '../api/project';
import { getPendingApprovals } from '../api/approval';

const { Title } = Typography;

interface DashboardStats {
  agentCount: number;
  projectCount: number;
  ticketCount: number;
  approvalCount: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    agentCount: 0,
    projectCount: 0,
    ticketCount: 0,
    approvalCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setLoading(true);
      try {
        const [agents, projects, approvals] = await Promise.all([
          getAgents(),
          getProjects(),
          getPendingApprovals(),
        ]);
        if (cancelled) return;
        setStats({
          agentCount: agents.length,
          projectCount: projects.length,
          ticketCount: 0,
          approvalCount: approvals.length,
        });
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
    </div>
  );
}
