export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shortId(id: string, len = 8): string {
  return id.length > len ? id.slice(0, len) + '...' : id;
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
  pending: '待分配',
  in_progress: '进行中',
  reviewing: '待审核',
  completed: '已完成',
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const TICKET_TYPE_LABEL: Record<string, string> = {
  task: '任务',
  bug: '缺陷',
  discussion: '讨论',
  decision: '决策',
};

export const TICKET_STATUS_COLOR: Record<string, string> = {
  pending: 'default',
  in_progress: 'processing',
  reviewing: 'warning',
  completed: 'success',
};
