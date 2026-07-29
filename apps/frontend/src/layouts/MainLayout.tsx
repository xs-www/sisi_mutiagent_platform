import { Layout, Menu, theme } from 'antd';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  TeamOutlined,
  FolderOpenOutlined,
  OrderedListOutlined,
  ToolOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: <Link to="/">首页</Link> },
  { key: '/agents', icon: <TeamOutlined />, label: <Link to="/agents">Agent 管理</Link> },
  { key: '/projects', icon: <FolderOpenOutlined />, label: <Link to="/projects">项目管理</Link> },
  { key: '/tickets', icon: <OrderedListOutlined />, label: <Link to="/tickets">工单看板</Link> },
  { key: '/tools', icon: <ToolOutlined />, label: <Link to="/tools">工具调试</Link> },
  { key: '/approvals', icon: <SafetyOutlined />, label: <Link to="/approvals">审批中心</Link> },
];

export default function MainLayout() {
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  return (
    <Layout>
      <Sider width={220} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#1677ff' }}>🤖 思思开发平台</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ borderRight: 0, paddingTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, borderBottom: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>开发控制台</span>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{
            padding: 24,
            minHeight: 'calc(100vh - 64px - 32px)',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
