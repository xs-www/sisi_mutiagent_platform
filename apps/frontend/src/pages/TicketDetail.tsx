import { Typography, Alert } from 'antd';
const { Title } = Typography;

export default function TicketDetail() {
  return (
    <>
      <Title level={3}>工单详情</Title>
      <Alert type="info" showIcon message="工单详情与对话界面将在 Phase 6 实现" />
    </>
  );
}
