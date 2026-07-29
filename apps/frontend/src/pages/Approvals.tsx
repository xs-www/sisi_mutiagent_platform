import { Typography, Alert } from 'antd';
const { Title } = Typography;

export default function Approvals() {
  return (
    <>
      <Title level={3}>审批中心</Title>
      <Alert type="info" showIcon message="审批中心将在 Phase 6 实现（待审批列表+通过/拒绝）" />
    </>
  );
}
