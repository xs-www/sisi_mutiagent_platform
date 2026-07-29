import { Typography, Alert } from 'antd';
const { Title } = Typography;

export default function Projects() {
  return (
    <>
      <Title level={3}>项目管理</Title>
      <Alert type="info" showIcon message="项目列表页面将在 Phase 6 实现" />
    </>
  );
}
