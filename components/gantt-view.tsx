'use client';

import type { Task } from '@/lib/db/schema';

export type GanttViewProps = {
  tasks: Task[];
  now?: Date;
};

export function GanttView(_props: GanttViewProps) {
  // RED 스텁 — GREEN 단계에서 좌측 트리 + 우측 그리드 + 오늘선으로 교체.
  return null;
}
