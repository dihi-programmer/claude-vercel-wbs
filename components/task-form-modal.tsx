'use client';

import type { TaskInput } from '@/lib/validation/task';
import type { Task } from '@/lib/db/schema';

export type TaskFormModalProps = {
  mode: 'create' | 'edit';
  open: boolean;
  initialValue?: Partial<Task>;
  onSubmit: (input: TaskInput) => void | Promise<void>;
  onClose: () => void;
};

export function TaskFormModal(_props: TaskFormModalProps) {
  // RED 스텁 — GREEN 단계에서 실제 폼으로 교체.
  return null;
}
