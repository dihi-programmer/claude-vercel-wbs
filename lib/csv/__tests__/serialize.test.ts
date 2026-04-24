/**
 * RED: tasksToCsv (Issue #6 Stage 1, SPEC §6 F-1).
 * 근거: SPEC §6 F-1 (열 순서, 계층 포함, 동명 부모 "먼저 매칭").
 */
import { describe, it, expect } from 'vitest';
import { tasksToCsv } from '@/lib/csv/serialize';
import type { Task } from '@/lib/db/schema';

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    id: overrides.id,
    parentId: overrides.parentId ?? null,
    title: overrides.title,
    description: overrides.description ?? null,
    assignee: overrides.assignee ?? null,
    status: overrides.status ?? 'todo',
    progress: overrides.progress ?? 0,
    startDate: overrides.startDate ?? null,
    dueDate: overrides.dueDate ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T00:00:00Z'),
  };
}

const HEADER = '제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목';

describe('tasksToCsv', () => {
  it('빈 배열 → 헤더 행만', () => {
    expect(tasksToCsv([])).toBe(HEADER);
  });

  it('단일 task → 헤더 + 1행, 열 순서 정확', () => {
    const t = makeTask({
      id: 'a',
      title: '킥오프',
      description: '첫 미팅',
      assignee: '김PM',
      status: 'doing',
      progress: 30,
      startDate: '2026-05-01',
      dueDate: '2026-05-03',
    });
    const csv = tasksToCsv([t]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(HEADER);
    expect(lines[1]).toBe('킥오프,첫 미팅,김PM,진행 중,30,2026-05-01,2026-05-03,');
  });

  it('상태 값이 한글 라벨로 매핑 (todo / doing / done)', () => {
    const t1 = makeTask({ id: 'a', title: 't1', status: 'todo' });
    const t2 = makeTask({
      id: 'b',
      title: 't2',
      status: 'doing',
      createdAt: new Date('2026-04-02T00:00:00Z'),
    });
    const t3 = makeTask({
      id: 'c',
      title: 't3',
      status: 'done',
      createdAt: new Date('2026-04-03T00:00:00Z'),
    });
    const csv = tasksToCsv([t1, t2, t3]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('할 일');
    expect(lines[2]).toContain('진행 중');
    expect(lines[3]).toContain('완료');
  });

  it('parentId 없음 → 마지막 "상위 작업 제목" 열이 빈 문자열', () => {
    const t = makeTask({ id: 'a', title: 'Solo' });
    const lines = tasksToCsv([t]).split('\r\n');
    expect(lines[1].endsWith(',')).toBe(true);
  });

  it('parentId 있음 → 해당 부모의 title 을 마지막 열에 기록', () => {
    const p = makeTask({ id: 'p', title: 'Parent' });
    const c = makeTask({
      id: 'c',
      title: 'Child',
      parentId: 'p',
      createdAt: new Date('2026-04-02T00:00:00Z'),
    });
    const lines = tasksToCsv([p, c]).split('\r\n');
    expect(lines[2].endsWith(',Parent')).toBe(true);
  });

  it('쉼표·따옴표·개행 포함 필드 → RFC 4180 규칙으로 quote/escape', () => {
    const t1 = makeTask({ id: 'a', title: '제목, 쉼표 포함' });
    expect(tasksToCsv([t1])).toContain('"제목, 쉼표 포함"');

    const t2 = makeTask({
      id: 'b',
      title: 'X',
      description: '그는 "안녕" 이라고 말했다',
    });
    expect(tasksToCsv([t2])).toContain('"그는 ""안녕"" 이라고 말했다"');

    const t3 = makeTask({ id: 'c', title: 'Y', description: '첫줄\n둘째줄' });
    expect(tasksToCsv([t3])).toContain('"첫줄\n둘째줄"');
  });

  it('계층 입력이 뒤섞여도 DFS(부모 → 자식 → 손자) 순서로 직렬화', () => {
    const p = makeTask({ id: 'p', title: 'P' });
    const c = makeTask({
      id: 'c',
      title: 'C',
      parentId: 'p',
      createdAt: new Date('2026-04-02T00:00:00Z'),
    });
    const g = makeTask({
      id: 'g',
      title: 'G',
      parentId: 'c',
      createdAt: new Date('2026-04-03T00:00:00Z'),
    });
    const lines = tasksToCsv([g, c, p]).split('\r\n');
    expect(lines[1].startsWith('P,')).toBe(true);
    expect(lines[2].startsWith('C,')).toBe(true);
    expect(lines[3].startsWith('G,')).toBe(true);
  });

  it('null 날짜 → 빈 문자열로 직렬화', () => {
    const t = makeTask({
      id: 'a',
      title: 'X',
      startDate: null,
      dueDate: null,
    });
    const lines = tasksToCsv([t]).split('\r\n');
    expect(lines[1]).toBe('X,,,할 일,0,,,');
  });
});
