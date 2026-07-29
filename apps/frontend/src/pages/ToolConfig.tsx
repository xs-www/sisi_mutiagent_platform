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
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { getToolDefinitions, updateToolConfig } from '../api/tools';
import type { ToolDefinition } from '../types';

const { Title, Text } = Typography;

const CATEGORY_COLOR: Record<string, string> = {
  file: 'blue',
  shell: 'orange',
  network: 'cyan',
  git: 'green',
  code: 'purple',
};

export default function ToolConfig() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState(false);

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
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>工具配置</Title>
        <Space>
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
    </div>
  );
}
