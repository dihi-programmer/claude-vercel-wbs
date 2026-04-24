/**
 * RED: Gantt 유틸 (Issue #7 Stage 1, SPEC §7 G-2).
 */
import { describe, it, expect } from 'vitest';
import { calculateRange, calculateBar, getWeekMarks, type GanttRange } from '@/lib/gantt/calc';
import type { Task } from '@/lib/db/schema';

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    id: overrides.id,
    parentId: overrides.parentId ?? null,
    title: overrides.title,
    description: null,
    assignee: null,
    status: 'todo',
    progress: 0,
    startDate: overrides.startDate ?? null,
    dueDate: overrides.dueDate ?? null,
    createdAt: new Date('2026-04-01T00:00:00Z'),
    updatedAt: new Date('2026-04-01T00:00:00Z'),
  };
}

describe('calculateRange', () => {
  it('빈 배열 → 오늘 기준 전후 4주 기본 범위', () => {
    const now = new Date('2026-05-14T00:00:00Z');
    const range = calculateRange([], now);
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-04-16');
    expect(range.end.toISOString().slice(0, 10)).toBe('2026-06-11');
  });

  it('날짜 있는 tasks → min(startDate)-1주 ~ max(dueDate)+1주', () => {
    const tasks = [
      makeTask({ id: 'a', title: 'A', startDate: '2026-05-01', dueDate: '2026-05-14' }),
      makeTask({ id: 'b', title: 'B', startDate: '2026-05-20', dueDate: '2026-06-01' }),
    ];
    const range = calculateRange(tasks);
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-04-24');
    expect(range.end.toISOString().slice(0, 10)).toBe('2026-06-08');
  });

  it('모든 task 가 날짜 null → 기본 범위', () => {
    const tasks = [makeTask({ id: 'a', title: 'A' })];
    const now = new Date('2026-05-14T00:00:00Z');
    const range = calculateRange(tasks, now);
    expect(range.start.toISOString().slice(0, 10)).toBe('2026-04-16');
    expect(range.end.toISOString().slice(0, 10)).toBe('2026-06-11');
  });
});

describe('calculateBar', () => {
  const range: GanttRange = {
    start: new Date('2026-05-01T00:00:00Z'),
    end: new Date('2026-05-31T00:00:00Z'),
  };

  it('start=range.start · due=range.end → leftPct=0, widthPct=100', () => {
    const bar = calculateBar('2026-05-01', '2026-05-31', 50, range);
    expect(bar.leftPct).toBeCloseTo(0, 1);
    expect(bar.widthPct).toBeCloseTo(100, 1);
  });

  it('progress=0 → progressPct=0', () => {
    const bar = calculateBar('2026-05-01', '2026-05-31', 0, range);
    expect(bar.progressPct).toBe(0);
  });

  it('progress=100 → progressPct=100', () => {
    const bar = calculateBar('2026-05-01', '2026-05-31', 100, range);
    expect(bar.progressPct).toBe(100);
  });

  it('절반 기간 → widthPct ≈ 50', () => {
    const bar = calculateBar('2026-05-01', '2026-05-16', 50, range);
    expect(bar.widthPct).toBeCloseTo(50, 0);
  });
});

describe('getWeekMarks', () => {
  it('월요일 기준 주 경계 반환 (range.start ≤ mark ≤ range.end)', () => {
    const range: GanttRange = {
      start: new Date('2026-05-01T00:00:00Z'), // Fri
      end: new Date('2026-05-22T00:00:00Z'),   // Fri
    };
    const marks = getWeekMarks(range);
    expect(marks.map((d) => d.toISOString().slice(0, 10))).toEqual([
      '2026-05-04', // Mon
      '2026-05-11',
      '2026-05-18',
    ]);
  });

  it('4주 범위 → 4~5개 mark', () => {
    const range: GanttRange = {
      start: new Date('2026-05-01T00:00:00Z'),
      end: new Date('2026-05-29T00:00:00Z'), // +28 days
    };
    const marks = getWeekMarks(range);
    expect(marks.length).toBeGreaterThanOrEqual(4);
    expect(marks.length).toBeLessThanOrEqual(5);
  });
});
