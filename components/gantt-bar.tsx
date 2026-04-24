'use client';

import type { GanttRange } from '@/lib/gantt/calc';

export type GanttBarProps = {
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  range: GanttRange;
};

export function GanttBar(_props: GanttBarProps) {
  // RED 스텁 — GREEN 단계에서 실제 막대 렌더링으로 교체.
  return null;
}
