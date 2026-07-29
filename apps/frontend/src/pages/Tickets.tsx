import { Typography, Alert } from 'antd';
const { Title } = Typography;

export default function Tickets() {
  return (
    <>
      <Title level={3}>工单看板</Title>
      <Alert type="info" showIcon message="工单看板将在 Phase 6 实现（待分配/进行中/待审核/已完成 四列拖拽）" />
    </>
  );
}
