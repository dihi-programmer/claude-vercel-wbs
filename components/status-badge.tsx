'use client';

import type { TaskStatus } from '@/lib/validation/task';

export type StatusBadgeProps = {
  status: TaskStatus;
  onCycle?: () => void;
};

export function StatusBadge(_props: StatusBadgeProps) {
  // RED 스텁 — GREEN 단계에서 실제 배지로 교체.
  return null;
}
