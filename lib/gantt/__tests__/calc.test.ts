/**
 * RED: Gantt 유틸 (Issue #7 Stage 1, SPEC §7 G-2 + #31 px 레이어).
 */
import { describe, it, expect } from 'vitest';
import {
  calculateRange,
  calculateBar,
  getWeekMarks,
  pxPerDay,
  calculateBarPx,
  getDateMarks,
  LABEL_GAP_PX,
  type GanttRange,
  type GanttRangePx,
} from '@/lib/gantt/calc';
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

describe('pxPerDay (#31 — 모드별 px/일)', () => {
  it("'day' → LABEL_GAP_PX (1일이 LABEL_GAP_PX)", () => {
    expect(pxPerDay('day')).toBe(LABEL_GAP_PX);
  });

  it("'week' → LABEL_GAP_PX/7 (7일이 LABEL_GAP_PX)", () => {
    expect(pxPerDay('week')).toBeCloseTo(LABEL_GAP_PX / 7, 6);
  });

  it("'month' → LABEL_GAP_PX/30 (30일이 LABEL_GAP_PX)", () => {
    expect(pxPerDay('month')).toBeCloseTo(LABEL_GAP_PX / 30, 6);
  });
});

describe('calculateBarPx (#31)', () => {
  const epoch = new Date('2026-04-24T00:00:00Z'); // Fri
  const ppd = LABEL_GAP_PX; // 'day' 모드

  it('start = epoch → leftPx = 0', () => {
    const bar = calculateBarPx('2026-04-24', '2026-04-24', 50, epoch, ppd);
    expect(bar.leftPx).toBe(0);
  });

  it('start = epoch + 7일 → leftPx = 7 * ppd', () => {
    const bar = calculateBarPx('2026-05-01', '2026-05-04', 50, epoch, ppd);
    expect(bar.leftPx).toBe(7 * ppd);
  });

  it('start=2026-05-01, due=2026-05-04 → widthPx = 4 * ppd (포함 일수 4)', () => {
    const bar = calculateBarPx('2026-05-01', '2026-05-04', 50, epoch, ppd);
    expect(bar.widthPx).toBe(4 * ppd);
  });

  it('progress 60 → progressPct=60 (clamp 안 됨)', () => {
    const bar = calculateBarPx('2026-05-01', '2026-05-04', 60, epoch, ppd);
    expect(bar.progressPct).toBe(60);
  });

  it('progress 음수 → 0 으로 clamp', () => {
    const bar = calculateBarPx('2026-05-01', '2026-05-04', -5, epoch, ppd);
    expect(bar.progressPct).toBe(0);
  });

  it('progress 200 → 100 으로 clamp', () => {
    const bar = calculateBarPx('2026-05-01', '2026-05-04', 200, epoch, ppd);
    expect(bar.progressPct).toBe(100);
  });
});

describe('getDateMarks (#31 — 모드별 라벨)', () => {
  const range: GanttRangePx = {
    epoch: new Date('2026-04-24T00:00:00Z'), // Fri
    totalDays: 30,
  };

  it("'day' 모드 → 매일 mark (totalDays 개)", () => {
    const marks = getDateMarks(range, 'day');
    expect(marks).toHaveLength(30);
    expect(marks[0].date.toISOString().slice(0, 10)).toBe('2026-04-24');
    expect(marks[0].leftPx).toBe(0);
    expect(marks[1].leftPx).toBe(LABEL_GAP_PX);
    expect(marks[0].label).toBe('4/24');
  });

  it("'week' 모드 → 범위 내 월요일만 mark", () => {
    // epoch=4/24 Fri, totalDays=30 → 4/24 ~ 5/23 inclusive
    // 월요일: 4/27, 5/4, 5/11, 5/18
    const marks = getDateMarks(range, 'week');
    expect(marks.map((m) => m.date.toISOString().slice(0, 10))).toEqual([
      '2026-04-27',
      '2026-05-04',
      '2026-05-11',
      '2026-05-18',
    ]);
    expect(marks[0].label).toBe('4/27');
  });

  it("'month' 모드 → 범위 내 매월 1일만 mark, 라벨은 'M월'", () => {
    // 4/24 ~ 5/23: 5/1 만 포함
    const marks = getDateMarks(range, 'month');
    expect(marks).toHaveLength(1);
    expect(marks[0].date.toISOString().slice(0, 10)).toBe('2026-05-01');
    expect(marks[0].label).toBe('5월');
  });

  it("'month' 모드 — 두 달 경계 → 두 mark", () => {
    const wide: GanttRangePx = {
      epoch: new Date('2026-04-15T00:00:00Z'),
      totalDays: 62, // 4/15 ~ 6/15
    };
    const marks = getDateMarks(wide, 'month');
    expect(marks.map((m) => m.date.toISOString().slice(0, 10))).toEqual([
      '2026-05-01',
      '2026-06-01',
    ]);
    expect(marks.map((m) => m.label)).toEqual(['5월', '6월']);
  });
});
