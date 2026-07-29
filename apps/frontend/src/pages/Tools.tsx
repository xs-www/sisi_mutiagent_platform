import { useCallback, useEffect, useState } from 'react';
import {
  Typography,
  Alert,
  Row,
  Col,
  Card,
  Tag,
  Input,
  InputNumber,
  Switch,
  Form,
  Button,
  Space,
  Spin,
  Empty,
  message,
} from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { getToolDefinitions, executeToolDirect } from '../api/tools';
import type { ToolDefinition, ToolExecutionResult, ToolParam } from '../types';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const CATEGORY_COLORS: Record<string, string> = {
  file: 'blue',
  shell: 'orange',
  network: 'cyan',
  git: 'green',
  code: 'purple',
};

export default function Tools() {
  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<ToolExecutionResult | null>(null);
  const [form] = Form.useForm();

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getToolDefinitions();
      setTools(data);
    } catch (error) {
      console.error('加载工具定义失败:', error);
      message.error('加载工具定义失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const handleSelectTool = (tool: ToolDefinition) => {
    setSelectedTool(tool);
    setResult(null);
    form.resetFields();
  };

  const handleExecute = async () => {
    if (!selectedTool) return;
    try {
      const values = await form.validateFields();
      const params: Record<string, any> = {};
      for (const param of selectedTool.params) {
        const val = values[param.name];
        if (val !== undefined && val !== null && val !== '') {
          if (param.type === 'object' && typeof val === 'string') {
            try {
              params[param.name] = JSON.parse(val);
            } catch {
              params[param.name] = val;
            }
          } else {
            params[param.name] = val;
          }
        }
      }
      setExecuting(true);
      const res = await executeToolDirect({
        toolName: selectedTool.name,
        params,
        workspacePath: values.workspacePath,
      });
      setResult(res);
      if (res.success) {
        message.success('执行成功');
      } else {
        message.error('执行失败');
      }
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('执行工具失败:', error);
      message.error('执行工具失败');
    } finally {
      setExecuting(false);
    }
  };

  const renderParamControl = (param: ToolParam) => {
    switch (param.type) {
      case 'number':
        return <InputNumber style={{ width: '100%' }} />;
      case 'boolean':
        return <Switch />;
      case 'object':
        return <TextArea rows={4} placeholder='{"key": "value"}' />;
      case 'string':
      default:
        return <Input />;
    }
  };

  return (
    <>
      <Title level={3}>工具调试</Title>
      <Alert
        type="warning"
        showIcon
        message="管理员直接执行模式"
        description="此页面为管理员直接执行工具的模式，将跳过审批流程。请谨慎操作。"
        style={{ marginBottom: 16 }}
      />

      <Spin spinning={loading}>
        <Row gutter={16} align="top">
          <Col flex="320px">
            <Card
              title="工具列表"
              size="small"
              extra={
                <Button
                  size="small"
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={loadTools}
                >
                  刷新
                </Button>
              }
            >
              {tools.length === 0 ? (
                <Empty description="暂无工具" />
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {tools.map((tool) => (
                    <Card
                      key={tool.name}
                      size="small"
                      hoverable
                      onClick={() => handleSelectTool(tool)}
                      style={{
                        cursor: 'pointer',
                        borderColor:
                          selectedTool?.name === tool.name ? '#1677ff' : undefined,
                        borderWidth: selectedTool?.name === tool.name ? 2 : 1,
                      }}
                    >
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Space size={4} wrap>
                          <Text strong>{tool.name}</Text>
                          <Tag color={CATEGORY_COLORS[tool.category] || 'default'}>
                            {tool.category}
                          </Tag>
                          {tool.approvalRequired && <Tag color="red">需审批</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {tool.description}
                        </Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </Col>

          <Col flex="1">
            <Card title="执行面板" size="small">
              {!selectedTool ? (
                <Empty description="请选择一个工具" />
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Space size={8} wrap>
                      <Title level={4} style={{ margin: 0 }}>
                        {selectedTool.name}
                      </Title>
                      <Tag color={CATEGORY_COLORS[selectedTool.category] || 'default'}>
                        {selectedTool.category}
                      </Tag>
                      {selectedTool.approvalRequired && <Tag color="red">需审批</Tag>}
                    </Space>
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                      {selectedTool.description}
                    </Paragraph>
                  </div>

                  <Form form={form} layout="vertical">
                    {selectedTool.params.length === 0 ? (
                      <Text type="secondary">该工具无需参数</Text>
                    ) : (
                      selectedTool.params.map((param) => (
                        <Form.Item
                          key={param.name}
                          name={param.name}
                          label={
                            <Space size={4}>
                              <span>{param.name}</span>
                              <Tag>{param.type}</Tag>
                              {param.required && <Text type="danger">*</Text>}
                            </Space>
                          }
                          tooltip={param.description}
                          rules={
                            param.required
                              ? [{ required: true, message: `请输入 ${param.name}` }]
                              : undefined
                          }
                        >
                          {renderParamControl(param)}
                        </Form.Item>
                      ))
                    )}

                    <Form.Item
                      name="workspacePath"
                      label="工作空间路径"
                      required
                      rules={[{ required: true, message: '请输入工作空间路径' }]}
                    >
                      <Input placeholder="/path/to/workspace" />
                    </Form.Item>

                    <Form.Item>
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        loading={executing}
                        onClick={handleExecute}
                      >
                        执行
                      </Button>
                    </Form.Item>
                  </Form>

                  {result && (
                    <div
                      style={{
                        marginTop: 16,
                        padding: 12,
                        borderRadius: 6,
                        backgroundColor: result.success ? '#f6ffed' : '#fff2f0',
                        border: `1px solid ${result.success ? '#b7eb8f' : '#ffccc7'}`,
                      }}
                    >
                      <Space size={8} style={{ marginBottom: 8 }}>
                        <Tag color={result.success ? 'green' : 'red'}>
                          {result.success ? '成功' : '失败'}
                        </Tag>
                        {result.durationMs !== undefined && (
                          <Text type="secondary">耗时: {result.durationMs}ms</Text>
                        )}
                      </Space>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          maxHeight: 400,
                          overflow: 'auto',
                        }}
                      >
                        {result.success ? result.output : result.error || result.output}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </>
  );
}
