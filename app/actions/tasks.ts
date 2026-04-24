'use server';

import { eq, sql as drizzleSql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { validateTaskInput, TaskValidationError, type TaskInput } from '@/lib/validation/task';

function throwIfInvalid(input: TaskInput): void {
  const result = validateTaskInput(input);
  if (!result.valid) throw new TaskValidationError(result.errors);
}

export async function createTask(input: TaskInput) {
  throwIfInvalid(input);

  const [row] = await db
    .insert(tasks)
    .values({
      title: (input.title ?? '').trim(),
      description: input.description ?? null,
      assignee: input.assignee ?? null,
      status: input.status ?? 'todo',
      progress: input.progress ?? 0,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
      parentId: input.parentId ?? null,
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

  // merge existing + patch 로 검증 — 부분 patch 에서도 전체 불변식을 유지.
  throwIfInvalid({
    title: patch.title ?? existing.title,
    description: 'description' in patch ? patch.description : existing.description,
    assignee: 'assignee' in patch ? patch.assignee : existing.assignee,
    status: patch.status ?? existing.status,
    progress: patch.progress ?? existing.progress,
    startDate: 'startDate' in patch ? patch.startDate : existing.startDate,
    dueDate: 'dueDate' in patch ? patch.dueDate : existing.dueDate,
    parentId: 'parentId' in patch ? patch.parentId : existing.parentId,
  });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if ('description' in patch) updates.description = patch.description;
  if ('assignee' in patch) updates.assignee = patch.assignee;
  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.progress !== undefined) updates.progress = patch.progress;
  if ('startDate' in patch) updates.startDate = patch.startDate;
  if ('dueDate' in patch) updates.dueDate = patch.dueDate;
  if ('parentId' in patch) updates.parentId = patch.parentId;

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
