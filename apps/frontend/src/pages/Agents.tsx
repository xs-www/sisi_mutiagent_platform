import { Typography, Alert } from 'antd';
const { Title } = Typography;

export default function Agents() {
  return (
    <>
      <Title level={3}>Agent 管理</Title>
      <Alert type="info" showIcon message="Agent 列表页面将在 Phase 6 实现，当前仅展示骨架" />
    </>
  );
}
