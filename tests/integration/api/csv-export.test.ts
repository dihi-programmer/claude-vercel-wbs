/**
 * RED: GET /api/csv/export (Issue #6 Stage 3, SPEC §6 F-1).
 * 로컬 Supabase Postgres 에 실제 연결. 각 테스트 전 `TRUNCATE tasks RESTART IDENTITY CASCADE`.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import postgres from 'postgres';
import { GET } from '@/app/api/csv/export/route';
import { createTask } from '@/app/actions/tasks';

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

describe('GET /api/csv/export', () => {
  it('200 + Content-Type: text/csv', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type') ?? '').toMatch(/text\/csv/);
  });

  it("Content-Disposition: attachment; filename=\"wbs-YYYY-MM-DD.csv\" (오늘 날짜)", async () => {
    const response = await GET();
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const today = new Date().toISOString().slice(0, 10);
    expect(disposition).toContain('attachment');
    expect(disposition).toContain(`wbs-${today}.csv`);
  });

  it('body 가 헤더 + 모든 tasks 를 포함 (tasksToCsv 결과와 동일 구조)', async () => {
    await createTask({ title: '킥오프' });
    await createTask({ title: '리서치', assignee: '김PM' });
    const response = await GET();
    const body = await response.text();
    expect(body).toContain('제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목');
    expect(body).toContain('킥오프');
    expect(body).toContain('리서치');
    expect(body).toContain('김PM');
  });
});
