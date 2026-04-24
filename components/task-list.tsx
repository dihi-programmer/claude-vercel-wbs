'use client';

import type { Task } from '@/lib/db/schema';

export type TaskListProps = {
  tasks: Task[];
  onRowClick: (task: Task) => void;
};

export function TaskList(_props: TaskListProps) {
  // RED 스텁 — GREEN 단계에서 실제 목록 렌더로 교체.
  return null;
}
