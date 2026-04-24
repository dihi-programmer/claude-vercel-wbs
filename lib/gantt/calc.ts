import type { Task } from '@/lib/db/schema';

export type GanttRange = { start: Date; end: Date };
export type GanttBar = {
  leftPct: number;
  widthPct: number;
  progressPct: number;
};

export function calculateRange(_tasks: Task[], _now?: Date): GanttRange {
  // RED 스텁 — GREEN 단계에서 실제 범위 계산으로 교체.
  throw new Error('not implemented');
}

export function calculateBar(
  _startDate: string,
  _dueDate: string,
  _progress: number,
  _range: GanttRange,
): GanttBar {
  throw new Error('not implemented');
}

export function getWeekMarks(_range: GanttRange): Date[] {
  throw new Error('not implemented');
}
