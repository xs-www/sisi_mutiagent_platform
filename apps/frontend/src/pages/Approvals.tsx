import { useCallback, useEffect, useState } from 'react';
import { Typography, Card, Row, Col, Statistic, Table, Tag, Button, Space, Modal, Input, App, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, SafetyOutlined } from '@ant-design/icons';
import { getPendingApprovals, approveApproval, rejectApproval } from '../api/approval';
import type { ApprovalRequest } from '../types';
import { formatDate } from '../utils';

const { Title } = Typography;
const { TextArea } = Input;

function toolTagColor(toolName: string): string {
  if (toolName === 'file_delete') return 'red';
  if (toolName === 'shell_execute') return 'orange';
  return 'blue';
}

export default function Approvals() {
  const { message } = App.useApp();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 拒绝相关状态
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectLoading, setRejectLoading] = useState<boolean>(false);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPendingApprovals();
      setApprovals(list);
    } catch (error) {
      console.error('加载待审批列表失败:', error);
      message.error('加载待审批列表失败');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  async function handleApprove(record: ApprovalRequest) {
    try {
      await approveApproval(record.id);
      message.success(`已通过审批：${record.toolName}`);
      await loadApprovals();
    } catch (error) {
      console.error('通过审批失败:', error);
      message.error('通过审批失败');
    }
  }

  function openRejectModal(record: ApprovalRequest) {
    setRejectTarget(record);
    setRejectReason('');
  }

  function closeRejectModal() {
    if (rejectLoading) return;
    setRejectTarget(null);
    setRejectReason('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await rejectApproval(rejectTarget.id, rejectReason.trim() || undefined);
      message.success(`已拒绝审批：${rejectTarget.toolName}`);
      closeRejectModal();
      await loadApprovals();
    } catch (error) {
      console.error('拒绝审批失败:', error);
      message.error('拒绝审批失败');
    } finally {
      setRejectLoading(false);
    }
  }

  const columns: ColumnsType<ApprovalRequest> = [
    {
      title: '工具名',
      dataIndex: 'toolName',
      key: 'toolName',
      width: 180,
      render: (toolName: string) => <Tag color={toolTagColor(toolName)}>{toolName}</Tag>,
    },
    {
      title: 'Agent',
      dataIndex: 'agentId',
      key: 'agentId',
      width: 160,
      ellipsis: true,
    },
    {
      title: '工单ID',
      dataIndex: 'ticketId',
      key: 'ticketId',
      width: 160,
      ellipsis: true,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string | null) => reason || '-',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (createdAt: string) => formatDate(createdAt),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_: unknown, record: ApprovalRequest) => (
        <Space>
          <Button
            type="primary"
            size="small"
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            icon={<CheckOutlined />}
            onClick={() => handleApprove(record)}
          >
            通过
          </Button>
          <Button
            danger
            size="small"
            icon={<CloseOutlined />}
            onClick={() => openRejectModal(record)}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Title level={3}>审批中心</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审批数量"
              value={approvals.length}
              prefix={<SafetyOutlined style={{ color: '#f5222d' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Table<ApprovalRequest>
        rowKey="id"
        columns={columns}
        dataSource={approvals}
        loading={loading}
        rowClassName={(_, index) => (index % 2 === 1 ? 'ant-table-row-striped' : '')}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: <Empty description="暂无待审批请求" />,
        }}
      />

      <Modal
        title="拒绝审批"
        open={!!rejectTarget}
        onCancel={closeRejectModal}
        confirmLoading={rejectLoading}
        onOk={confirmReject}
        okText="确认拒绝"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        {rejectTarget && (
          <div style={{ marginBottom: 12, color: '#666' }}>
            工具：<Tag color={toolTagColor(rejectTarget.toolName)}>{rejectTarget.toolName}</Tag>
          </div>
        )}
        <TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请输入拒绝原因（非必填）"
          rows={4}
          maxLength={500}
          showCount
        />
      </Modal>
    </>
  );
}
