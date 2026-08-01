// 日期格式化工具
export function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '-';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 工单状态标签
export const TICKET_STATUS_LABEL: Record<string, string> = {
  pending: '待分配',
  in_progress: '进行中',
  reviewing: '待审核',
  completed: '已完成',
  failed: '失败',
  blocked: '阻塞',
};

// 工单状态颜色
export const TICKET_STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  reviewing: 'warning',
  completed: 'success',
  failed: 'error',
  blocked: 'warning',
};

// 工单优先级标签
export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

// 工单类型标签
export const TICKET_TYPE_LABEL: Record<string, string> = {
  task: '任务',
  bug: '缺陷',
  discussion: '讨论',
  decision: '决策',
};
