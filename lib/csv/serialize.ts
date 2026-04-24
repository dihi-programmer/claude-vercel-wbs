import type { Task } from '@/lib/db/schema';
import { buildTaskTree, type TaskNode } from '@/lib/tasks/build-tree';

const HEADER = ['제목', '설명', '담당자', '상태', '진행률', '시작일', '목표 기한', '상위 작업 제목'];

const STATUS_LABEL: Record<string, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
};

function escape(value: string): string {
  // RFC 4180 — 쉼표·따옴표·CR·LF 포함 시 전체를 따옴표로 감싸고, 내부 따옴표는 "" 로 이스케이프.
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function flattenDfs(nodes: TaskNode[]): Task[] {
  const out: Task[] = [];
  const walk = (n: TaskNode): void => {
    out.push(n.task);
    for (const c of n.children) walk(c);
  };
  for (const n of nodes) walk(n);
  return out;
}

export function tasksToCsv(tasks: Task[]): string {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const ordered = flattenDfs(buildTaskTree(tasks));

  const rows: string[] = [HEADER.join(',')];
  for (const t of ordered) {
    const parentTitle = t.parentId ? (byId.get(t.parentId)?.title ?? '') : '';
    const statusLabel = STATUS_LABEL[t.status] ?? t.status;
    const values = [
      t.title,
      t.description ?? '',
      t.assignee ?? '',
      statusLabel,
      String(t.progress),
      t.startDate ?? '',
      t.dueDate ?? '',
      parentTitle,
    ];
    rows.push(values.map(escape).join(','));
  }
  return rows.join('\r\n');
}
