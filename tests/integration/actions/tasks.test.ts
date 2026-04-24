/**
 * RED 테스트: Task Server Actions (Issue #3 Stage 2).
 *
 * 근거: SPEC.md §2 B (생성), §3 C (수정), §4 D (삭제, "모든 하위 작업 N개").
 * 로컬 Supabase Postgres 에 실제 연결. 각 테스트 전 `TRUNCATE tasks RESTART IDENTITY CASCADE`.
 *
 * Server Action 은 'use server' 모듈이므로 next/cache 의 revalidatePath 를 mock 해서
 * Vitest 가 Next 런타임 없이도 import·실행 가능하도록 만든다.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import postgres from 'postgres';
import {
  createTask,
  updateTask,
  deleteTask,
  getDescendantCount,
} from '@/app/actions/tasks';
import { TaskValidationError } from '@/lib/validation/task';

const connectionString = process.env.DATABASE_URL!;
let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(connectionString, { prepare: false, max: 1, onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE tasks RESTART IDENTITY CASCADE`;
});

describe('createTask', () => {
  it('title 만 입력 → DB 에 새 행, status=todo · progress=0, id 반환 (B-2 기본값)', async () => {
    const task = await createTask({ title: '킥오프 미팅' });
    expect(task.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(task.title).toBe('킥오프 미팅');
    expect(task.status).toBe('todo');
    expect(task.progress).toBe(0);
    const [row] = await sql`SELECT title, status, progress FROM tasks WHERE id = ${task.id}`;
    expect(row).toMatchObject({ title: '킥오프 미팅', status: 'todo', progress: 0 });
  });

  it('유효하지 않은 입력 → TaskValidationError, DB 접근 없음', async () => {
    await expect(createTask({ title: '' })).rejects.toThrow(TaskValidationError);
    const rows = await sql`SELECT id FROM tasks`;
    expect(rows).toHaveLength(0);
  });

  it('parentId 포함 → 자식으로 저장 (E-1)', async () => {
    const parent = await createTask({ title: '부모' });
    const child = await createTask({ title: '자식', parentId: parent.id });
    expect(child.parentId).toBe(parent.id);
  });

  it('존재하지 않는 parentId → FK 에러 전파', async () => {
    await expect(
      createTask({ title: 'X', parentId: '00000000-0000-0000-0000-000000000000' }),
    ).rejects.toThrow();
  });
});

describe('updateTask', () => {
  it('지정 필드만 갱신, updated_at 증가', async () => {
    const created = await createTask({ title: 'before' });
    const before = created.updatedAt;
    await new Promise((r) => setTimeout(r, 10));
    const updated = await updateTask(created.id, { title: 'after' });
    expect(updated.title).toBe('after');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before.getTime());
  });

  it('patch 에 없는 필드는 유지', async () => {
    const created = await createTask({ title: 'orig', assignee: '김PM', progress: 30 });
    const updated = await updateTask(created.id, { title: 'renamed' });
    expect(updated.title).toBe('renamed');
    expect(updated.assignee).toBe('김PM');
    expect(updated.progress).toBe(30);
  });

  it('존재하지 않는 id → 에러', async () => {
    await expect(
      updateTask('00000000-0000-0000-0000-000000000000', { title: 'X' }),
    ).rejects.toThrow();
  });

  it('검증 실패 → TaskValidationError, 원본 데이터 변경 없음', async () => {
    const created = await createTask({ title: 'valid' });
    await expect(updateTask(created.id, { title: '' })).rejects.toThrow(TaskValidationError);
    const [row] = await sql`SELECT title FROM tasks WHERE id = ${created.id}`;
    expect(row.title).toBe('valid');
  });
});

describe('deleteTask', () => {
  it('해당 행 삭제', async () => {
    const task = await createTask({ title: 'X' });
    await deleteTask(task.id);
    const rows = await sql`SELECT id FROM tasks WHERE id = ${task.id}`;
    expect(rows).toHaveLength(0);
  });

  it('자식 있으면 cascade (DB FK, SPEC D-2)', async () => {
    const parent = await createTask({ title: 'P' });
    await createTask({ title: 'C1', parentId: parent.id });
    await createTask({ title: 'C2', parentId: parent.id });
    await deleteTask(parent.id);
    const rows = await sql`SELECT id FROM tasks`;
    expect(rows).toHaveLength(0);
  });

  it('존재하지 않는 id → 에러', async () => {
    await expect(
      deleteTask('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow();
  });
});

describe('getDescendantCount (SPEC D-2 "모든 하위 작업 N개")', () => {
  it('자식이 없으면 0', async () => {
    const parent = await createTask({ title: 'P' });
    expect(await getDescendantCount(parent.id)).toBe(0);
  });

  it('1단계 자식만 있을 때 정확히 반환', async () => {
    const parent = await createTask({ title: 'P' });
    await createTask({ title: 'C1', parentId: parent.id });
    await createTask({ title: 'C2', parentId: parent.id });
    await createTask({ title: 'C3', parentId: parent.id });
    expect(await getDescendantCount(parent.id)).toBe(3);
  });

  it('손자·증손자까지 재귀 집계 (SPEC D-2 "모든 하위 작업")', async () => {
    const parent = await createTask({ title: 'P' });
    const child = await createTask({ title: 'C', parentId: parent.id });
    const grand = await createTask({ title: 'G', parentId: child.id });
    await createTask({ title: 'GG', parentId: grand.id });
    expect(await getDescendantCount(parent.id)).toBe(3); // C + G + GG
  });
});
