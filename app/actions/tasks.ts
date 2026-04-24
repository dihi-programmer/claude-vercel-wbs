'use server';

import { eq, sql as drizzleSql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import {
  validateTaskInput,
  applyProgressCompletionRule,
  TaskValidationError,
  type TaskInput,
} from '@/lib/validation/task';

function throwIfInvalid(input: TaskInput): void {
  const result = validateTaskInput(input);
  if (!result.valid) throw new TaskValidationError(result.errors);
}

export async function createTask(input: TaskInput) {
  const processed = applyProgressCompletionRule(input);
  throwIfInvalid(processed);

  const [row] = await db
    .insert(tasks)
    .values({
      title: (processed.title ?? '').trim(),
      description: processed.description ?? null,
      assignee: processed.assignee ?? null,
      status: processed.status ?? 'todo',
      progress: processed.progress ?? 0,
      startDate: processed.startDate ?? null,
      dueDate: processed.dueDate ?? null,
      parentId: processed.parentId ?? null,
    })
    .returning();

  revalidatePath('/');
  return row;
}

export async function updateTask(id: string, patch: TaskInput) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!existing) {
    throw new Error(`Task ${id} 를 찾을 수 없습니다`);
  }

  // SPEC §3 C-2 규칙: progress=100 이면 status='done' 자동 승격 (역방향 없음).
  const processed = applyProgressCompletionRule(patch);

  // merge existing + processed 로 검증 — 부분 patch 에서도 전체 불변식을 유지.
  throwIfInvalid({
    title: processed.title ?? existing.title,
    description: 'description' in processed ? processed.description : existing.description,
    assignee: 'assignee' in processed ? processed.assignee : existing.assignee,
    status: processed.status ?? existing.status,
    progress: processed.progress ?? existing.progress,
    startDate: 'startDate' in processed ? processed.startDate : existing.startDate,
    dueDate: 'dueDate' in processed ? processed.dueDate : existing.dueDate,
    parentId: 'parentId' in processed ? processed.parentId : existing.parentId,
  });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (processed.title !== undefined) updates.title = processed.title.trim();
  if ('description' in processed) updates.description = processed.description;
  if ('assignee' in processed) updates.assignee = processed.assignee;
  if (processed.status !== undefined) updates.status = processed.status;
  if (processed.progress !== undefined) updates.progress = processed.progress;
  if ('startDate' in processed) updates.startDate = processed.startDate;
  if ('dueDate' in processed) updates.dueDate = processed.dueDate;
  if ('parentId' in processed) updates.parentId = processed.parentId;

  const [row] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
  revalidatePath('/');
  return row;
}

export async function deleteTask(id: string): Promise<void> {
  const deleted = await db.delete(tasks).where(eq(tasks.id, id)).returning({ id: tasks.id });
  if (deleted.length === 0) {
    throw new Error(`Task ${id} 를 찾을 수 없습니다`);
  }
  revalidatePath('/');
}

export async function getDescendantCount(id: string): Promise<number> {
  const rows = (await db.execute(drizzleSql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM tasks WHERE parent_id = ${id}
      UNION ALL
      SELECT t.id FROM tasks t JOIN descendants d ON t.parent_id = d.id
    )
    SELECT COUNT(*)::int AS count FROM descendants
  `)) as unknown as Array<{ count: number }>;
  return Number(rows[0]?.count ?? 0);
}
