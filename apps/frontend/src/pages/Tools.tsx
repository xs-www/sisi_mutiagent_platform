import { Typography, Alert } from 'antd';
const { Title } = Typography;

export default function Tools() {
  return (
    <>
      <Title level={3}>工具调试</Title>
      <Alert type="info" showIcon message="工具调试页面将在 Phase 6 实现（工具定义列表+手动执行面板）" />
    </>
  );
}
