'use server';

import type { TaskInput } from '@/lib/validation/task';

// RED 단계 스텁 — GREEN 단계에서 실구현으로 교체.
// NOTE: 'use server' 파일은 async function 만 export 할 수 있으므로
//   - Task 타입은 lib/db/schema.ts 쪽에서 추론해 쓰고,
//   - TaskValidationError 클래스는 lib/validation/task.ts 에 둔다.

export async function createTask(_input: TaskInput) {
  throw new Error('not implemented');
}

export async function updateTask(_id: string, _patch: TaskInput) {
  throw new Error('not implemented');
}

export async function deleteTask(_id: string): Promise<void> {
  throw new Error('not implemented');
}

export async function getDescendantCount(_id: string): Promise<number> {
  throw new Error('not implemented');
}
