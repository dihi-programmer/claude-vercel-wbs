import type { Task } from '@/lib/db/schema';

export type TaskNode = {
  task: Task;
  children: TaskNode[];
  depth: number;
};

export function buildTaskTree(_tasks: Task[]): TaskNode[] {
  // RED 스텁 — GREEN 단계에서 실제 트리 빌드로 교체.
  throw new Error('not implemented');
}
