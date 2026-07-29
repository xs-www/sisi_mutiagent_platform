import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Drawer,
  Table,
  Space,
  Spin,
  message,
  Empty,
} from 'antd';
import { PlusOutlined, TeamOutlined, ArrowRightOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getProjects,
  createProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from '../api/project';
import { getAgents } from '../api/agent';
import { useGlobalStore } from '../store';
import { formatDate } from '../utils';
import type { Project, ProjectMember, Agent } from '../types';

const { Title, Paragraph, Text } = Typography;

const STATUS_TAG_MAP: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: '进行中' },
  archived: { color: 'default', label: '已归档' },
};

export default function Projects() {
  const navigate = useNavigate();
  const { setCurrentProject } = useGlobalStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form] = Form.useForm();

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerProject, setDrawerProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [addMemberAgentId, setAddMemberAgentId] = useState<string | undefined>();
  const [addingMember, setAddingMember] = useState<boolean>(false);

  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('加载项目列表失败:', error);
      message.error('加载项目列表失败');
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadProjects();
    loadAgents();
  }, []);

  async function handleCreateProject() {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await createProject({
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        supervisorId: values.supervisorId || undefined,
      });
      message.success('项目创建成功');
      setModalOpen(false);
      form.resetFields();
      await loadProjects();
    } catch (error: any) {
      if (error?.errorFields) return; // 表单校验失败
      console.error('创建项目失败:', error);
      message.error('创建项目失败');
    } finally {
      setSubmitting(false);
    }
  }

  function handleEnterTickets(project: Project) {
    setCurrentProject(project);
    navigate(`/tickets?projectId=${project.id}`);
  }

  async function openMemberDrawer(project: Project) {
    setDrawerProject(project);
    setDrawerOpen(true);
    setAddMemberAgentId(undefined);
    setMembers([]);
    await loadMembers(project.id);
  }

  async function loadMembers(projectId: string) {
    setMembersLoading(true);
    try {
      const data = await getProjectMembers(projectId);
      setMembers(data);
    } catch (error) {
      console.error('加载项目成员失败:', error);
      message.error('加载项目成员失败');
    } finally {
      setMembersLoading(false);
    }
  }

  async function handleAddMember() {
    if (!drawerProject || !addMemberAgentId) {
      message.warning('请选择要添加的 Agent');
      return;
    }
    setAddingMember(true);
    try {
      await addProjectMember(drawerProject.id, addMemberAgentId);
      message.success('成员添加成功');
      setAddMemberAgentId(undefined);
      await loadMembers(drawerProject.id);
    } catch (error) {
      console.error('添加成员失败:', error);
      message.error('添加成员失败');
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(agentId: string) {
    if (!drawerProject) return;
    try {
      await removeProjectMember(drawerProject.id, agentId);
      message.success('成员已移除');
      await loadMembers(drawerProject.id);
    } catch (error) {
      console.error('移除成员失败:', error);
      message.error('移除成员失败');
    }
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerProject(null);
    setMembers([]);
    setAddMemberAgentId(undefined);
  }

  const memberColumns: ColumnsType<ProjectMember> = [
    {
      title: 'Agent 名称',
      key: 'agentName',
      render: (_, record) => {
        const agent = agentMap.get(record.agentId);
        return agent ? agent.name : <Text type="secondary">未知 Agent</Text>;
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

  // 已是成员的 Agent 不出现在添加下拉中
  const candidateAgents = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.agentId));
    return agents.filter((a) => !memberIds.has(a.id));
  }, [agents, members]);

  return (
    <div style={{ padding: 24 }}>
      <Space
        style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}
        align="center"
      >
        <Title level={3} style={{ margin: 0 }}>
          项目管理
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          新建项目
        </Button>
      </Space>

      <Spin spinning={loading}>
        {projects.length === 0 && !loading ? (
          <Empty description="暂无项目" />
        ) : (
          <Row gutter={[16, 16]}>
            {projects.map((project) => {
              const statusInfo = STATUS_TAG_MAP[project.status] ?? {
                color: 'default',
                label: project.status,
              };
              const supervisor = project.supervisorId
                ? agentMap.get(project.supervisorId)
                : undefined;
              return (
                <Col xs={24} sm={12} md={8} key={project.id}>
                  <Card
                    hoverable
                    styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}
                    style={{ height: '100%' }}
                  >
                    <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: 16 }}>
                        {project.name}
                      </Text>
                      <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                    </Space>

                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 3 }}
                      style={{ minHeight: 66, marginBottom: 12 }}
                    >
                      {project.description || '暂无描述'}
                    </Paragraph>

                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        主 Agent：
                      </Text>
                      <Text>{supervisor ? supervisor.name : '未指定'}</Text>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        创建时间：
                      </Text>
                      <Text style={{ fontSize: 13 }}>{formatDate(project.createdAt)}</Text>
                    </div>

                    <Space
                      style={{ marginTop: 'auto', justifyContent: 'space-between', width: '100%' }}
                    >
                      <Button
                        icon={<InfoCircleOutlined />}
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        详情
                      </Button>
                      <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        onClick={() => handleEnterTickets(project)}
                      >
                        进入工单
                      </Button>
                      <Button icon={<TeamOutlined />} onClick={() => openMemberDrawer(project)}>
                        成员管理
                      </Button>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Spin>

      <Modal
        title="新建项目"
        open={modalOpen}
        onOk={handleCreateProject}
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
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="name"
            label="名称"
            rules={[
              { required: true, message: '请输入项目名称' },
              { whitespace: true, message: '名称不能为空白字符' },
            ]}
          >
            <Input placeholder="请输入项目名称" maxLength={100} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={4} placeholder="项目描述（可选）" maxLength={1000} showCount />
          </Form.Item>
          <Form.Item name="supervisorId" label="主 Agent">
            <Select
              placeholder="请选择主 Agent（可选）"
              allowClear
              loading={agents.length === 0}
              options={agents.map((a) => ({ label: a.name, value: a.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`成员管理${drawerProject ? ` - ${drawerProject.name}` : ''}`}
        open={drawerOpen}
        onClose={closeDrawer}
        width={480}
        destroyOnClose
      >
        <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
          <Text strong>添加成员</Text>
          <Space.Compact style={{ width: '100%' }}>
            <Select
              style={{ flex: 1 }}
              placeholder="请选择要添加的 Agent"
              value={addMemberAgentId}
              onChange={setAddMemberAgentId}
              allowClear
              showSearch
              optionFilterProp="label"
              loading={agents.length === 0}
              options={candidateAgents.map((a) => ({ label: a.name, value: a.id }))}
            />
            <Button
              type="primary"
              onClick={handleAddMember}
              loading={addingMember}
              disabled={!addMemberAgentId}
            >
              添加
            </Button>
          </Space.Compact>
        </Space>

        <Table
          rowKey="agentId"
          columns={memberColumns}
          dataSource={members}
          loading={membersLoading}
          pagination={false}
          size="middle"
          locale={{ emptyText: '暂无成员' }}
        />
      </Drawer>
    </div>
  );
}
