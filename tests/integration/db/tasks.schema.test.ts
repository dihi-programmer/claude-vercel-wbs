/**
 * tasks 테이블 스키마 RED 테스트 (Issue #2).
 *
 * 근거: SPEC.md §1 A-2·A-3, §2 B-2, §4 D-2, §5 E-1, §8 H-1.
 * 각 테스트는 실제 로컬 Supabase Postgres 에 연결해 tasks 테이블의 제약·기본값·FK 를 검증한다.
 * 이 시점에는 tasks 테이블이 아직 존재하지 않으므로 전 테스트가 실패해야 정상 (RED).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';

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

describe('tasks 테이블 스키마', () => {
  describe('해피 패스', () => {
    it('title 만 있는 insert → 성공, status=todo, progress=0, id·created_at·updated_at 자동 세팅', async () => {
      const [row] = await sql`
        INSERT INTO tasks (title) VALUES ('킥오프 미팅') RETURNING *
      `;
      expect(row.title).toBe('킥오프 미팅');
      expect(row.status).toBe('todo');
      expect(row.progress).toBe(0);
      expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(row.created_at).toBeInstanceOf(Date);
      expect(row.updated_at).toBeInstanceOf(Date);
    });

    it('모든 컬럼을 채운 insert → SELECT 결과가 입력과 일치', async () => {
      const [row] = await sql`
        INSERT INTO tasks (title, description, assignee, status, progress, start_date, due_date)
        VALUES ('리서치', '시장 리서치', '김PM', 'doing', 45, '2026-05-01', '2026-05-14')
        RETURNING *
      `;
      expect(row).toMatchObject({
        title: '리서치',
        description: '시장 리서치',
        assignee: '김PM',
        status: 'doing',
        progress: 45,
      });
      expect(row.start_date).not.toBeNull();
      expect(row.due_date).not.toBeNull();
    });
  });

  describe('NOT NULL / CHECK 제약', () => {
    it('title 생략 → insert 실패 (NOT NULL)', async () => {
      await expect(sql`INSERT INTO tasks DEFAULT VALUES`).rejects.toThrow();
    });

    it("status='blocked' 같은 허용 외 값 → insert 실패 (CHECK)", async () => {
      await expect(
        sql`INSERT INTO tasks (title, status) VALUES ('X', 'blocked')`,
      ).rejects.toThrow();
    });

    it('progress = -1 → insert 실패 (CHECK)', async () => {
      await expect(
        sql`INSERT INTO tasks (title, progress) VALUES ('X', -1)`,
      ).rejects.toThrow();
    });

    it('progress = 101 → insert 실패 (CHECK)', async () => {
      await expect(
        sql`INSERT INTO tasks (title, progress) VALUES ('X', 101)`,
      ).rejects.toThrow();
    });

    it('경계값 progress = 0 / 100 → insert 성공', async () => {
      const [zero] = await sql`
        INSERT INTO tasks (title, progress) VALUES ('Z', 0) RETURNING progress
      `;
      const [hundred] = await sql`
        INSERT INTO tasks (title, progress) VALUES ('H', 100) RETURNING progress
      `;
      expect(zero.progress).toBe(0);
      expect(hundred.progress).toBe(100);
    });
  });

  describe('FK · 계층 (parent_id)', () => {
    it('parent_id = null → 최상위 task 성공', async () => {
      const [row] = await sql`
        INSERT INTO tasks (title, parent_id) VALUES ('최상위', NULL) RETURNING parent_id
      `;
      expect(row.parent_id).toBeNull();
    });

    it('부모 insert 후 자식 insert → 자식의 parent_id 가 부모 id 로 연결', async () => {
      const [parent] = await sql`INSERT INTO tasks (title) VALUES ('부모') RETURNING id`;
      const [child] = await sql`
        INSERT INTO tasks (title, parent_id) VALUES ('자식', ${parent.id}) RETURNING parent_id
      `;
      expect(child.parent_id).toBe(parent.id);
    });

    it('존재하지 않는 UUID 를 parent_id 로 → insert 실패 (FK)', async () => {
      await expect(
        sql`INSERT INTO tasks (title, parent_id) VALUES ('X', '00000000-0000-0000-0000-000000000000'::uuid)`,
      ).rejects.toThrow();
    });

    it('부모 삭제 → 자식도 자동 삭제 (ON DELETE CASCADE, SPEC.md D-2)', async () => {
      const [parent] = await sql`INSERT INTO tasks (title) VALUES ('P') RETURNING id`;
      await sql`INSERT INTO tasks (title, parent_id) VALUES ('C1', ${parent.id})`;
      await sql`INSERT INTO tasks (title, parent_id) VALUES ('C2', ${parent.id})`;
      await sql`DELETE FROM tasks WHERE id = ${parent.id}`;
      const rows = await sql`SELECT id FROM tasks`;
      expect(rows).toHaveLength(0);
    });

    it('3단계(부모→자식→손주) 에서도 위에서부터 cascade', async () => {
      const [p] = await sql`INSERT INTO tasks (title) VALUES ('P') RETURNING id`;
      const [c] = await sql`
        INSERT INTO tasks (title, parent_id) VALUES ('C', ${p.id}) RETURNING id
      `;
      await sql`INSERT INTO tasks (title, parent_id) VALUES ('G', ${c.id})`;
      await sql`DELETE FROM tasks WHERE id = ${p.id}`;
      const rows = await sql`SELECT id FROM tasks`;
      expect(rows).toHaveLength(0);
    });
  });

  describe('정렬 / 시간', () => {
    it('여러 task 시간차 insert 후 ORDER BY created_at ASC → 입력 순서와 동일 (SPEC.md A-3)', async () => {
      await sql`INSERT INTO tasks (title) VALUES ('첫째')`;
      await new Promise((r) => setTimeout(r, 10));
      await sql`INSERT INTO tasks (title) VALUES ('둘째')`;
      await new Promise((r) => setTimeout(r, 10));
      await sql`INSERT INTO tasks (title) VALUES ('셋째')`;
      const rows = await sql<{ title: string }[]>`
        SELECT title FROM tasks ORDER BY created_at ASC
      `;
      expect(rows.map((r) => r.title)).toEqual(['첫째', '둘째', '셋째']);
    });
  });

  describe('날짜 nullable (SPEC.md A-2)', () => {
    it('start_date 만 있고 due_date 없음 → 저장 성공', async () => {
      const [row] = await sql`
        INSERT INTO tasks (title, start_date) VALUES ('X', '2026-05-01')
        RETURNING start_date, due_date
      `;
      expect(row.start_date).not.toBeNull();
      expect(row.due_date).toBeNull();
    });

    it('due_date 만 있고 start_date 없음 → 저장 성공', async () => {
      const [row] = await sql`
        INSERT INTO tasks (title, due_date) VALUES ('X', '2026-05-14')
        RETURNING start_date, due_date
      `;
      expect(row.start_date).toBeNull();
      expect(row.due_date).not.toBeNull();
    });

    it('둘 다 없음 → 저장 성공', async () => {
      const [row] = await sql`
        INSERT INTO tasks (title) VALUES ('X') RETURNING start_date, due_date
      `;
      expect(row.start_date).toBeNull();
      expect(row.due_date).toBeNull();
    });
  });
});
