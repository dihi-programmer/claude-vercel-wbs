/**
 * RED: applyCsvImport (Issue #6 Stage 4, SPEC §6 F-2).
 * DB 통합: 각 테스트 전 TRUNCATE.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import postgres from 'postgres';
import { applyCsvImport } from '@/app/actions/csv';
import { createTask } from '@/app/actions/tasks';

const connectionString = process.env.DATABASE_URL!;
let sql: ReturnType<typeof postgres>;

const HEADER = '제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목';

beforeAll(() => {
  sql = postgres(connectionString, { prepare: false, max: 1, onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE tasks RESTART IDENTITY CASCADE`;
});

describe('applyCsvImport', () => {
  it('정상 CSV → toAdd 순서대로 insert, CSV 내부 parent 연결 유지', async () => {
    const csv = `${HEADER}\r\nParent,,,할 일,0,,,\r\nChild,,,할 일,0,,,Parent`;
    const result = await applyCsvImport(csv);
    expect(result.addedCount).toBe(2);
    expect(result.skippedCount).toBe(0);

    const rows = await sql<{ id: string; title: string; parent_id: string | null }[]>`
      SELECT id, title, parent_id FROM tasks ORDER BY created_at ASC
    `;
    expect(rows.map((r) => r.title)).toEqual(['Parent', 'Child']);
    expect(rows[0].parent_id).toBeNull();
    expect(rows[1].parent_id).toBe(rows[0].id);
  });

  it('제목 빈 행은 skip, DB 에 영향 없음', async () => {
    const csv = `${HEADER}\r\n,빈 제목,,할 일,0,,,\r\nValid,,,할 일,0,,,`;
    const result = await applyCsvImport(csv);
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.skipReasons[0]).toMatch(/제목/);

    const rows = await sql<{ title: string }[]>`SELECT title FROM tasks`;
    expect(rows.map((r) => r.title)).toEqual(['Valid']);
  });

  it('결과 구조: addedCount · skippedCount · skipReasons', async () => {
    const csv = `${HEADER}\r\nX,,,할 일,0,,,`;
    const result = await applyCsvImport(csv);
    expect(result).toMatchObject({
      addedCount: 1,
      skippedCount: 0,
      skipReasons: [],
    });
  });

  it('기존 task 는 수정·삭제하지 않음 (SPEC F-2 "추가만")', async () => {
    await createTask({ title: 'Keep' });
    const csv = `${HEADER}\r\nNew,,,할 일,0,,,`;
    await applyCsvImport(csv);
    const rows = await sql<{ title: string }[]>`
      SELECT title FROM tasks ORDER BY created_at ASC
    `;
    expect(rows.map((r) => r.title)).toEqual(['Keep', 'New']);
  });

  it('일부 행 CHECK 위반 → 해당 행만 skip, 나머지는 insert (부분 실패 허용)', async () => {
    // progress=200 은 tasks_progress_check 위반 → DB 거부
    const csv = `${HEADER}\r\nBad,,,할 일,200,,,\r\nGood,,,할 일,50,,,`;
    const result = await applyCsvImport(csv);
    expect(result.addedCount).toBe(1);
    expect(result.skippedCount).toBe(1);

    const rows = await sql<{ title: string }[]>`SELECT title FROM tasks`;
    expect(rows.map((r) => r.title)).toEqual(['Good']);
  });
});
