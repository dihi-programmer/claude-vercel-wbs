/**
 * Gantt 유틸 (#31 px 레이어 + 무한스크롤).
 */
import { describe, it, expect } from 'vitest';
import {
  pxPerDay,
  calculateBarPx,
  getDateMarks,
  extendRange,
  LABEL_GAP_PX,
  type GanttRangePx,
} from '@/lib/gantt/calc';

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
    const marks = getDateMarks(range, 'day', 2026);
    expect(marks).toHaveLength(30);
    expect(marks[0].date.toISOString().slice(0, 10)).toBe('2026-04-24');
    expect(marks[0].leftPx).toBe(0);
    expect(marks[1].leftPx).toBe(LABEL_GAP_PX);
    expect(marks[0].label).toBe('4/24');
  });

  it("'week' 모드 → 범위 내 월요일만 mark", () => {
    // epoch=4/24 Fri, totalDays=30 → 4/24 ~ 5/23 inclusive
    // 월요일: 4/27, 5/4, 5/11, 5/18
    const marks = getDateMarks(range, 'week', 2026);
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
    const marks = getDateMarks(range, 'month', 2026);
    expect(marks).toHaveLength(1);
    expect(marks[0].date.toISOString().slice(0, 10)).toBe('2026-05-01');
    expect(marks[0].label).toBe('5월');
  });

  it("'month' 모드 — 두 달 경계 → 두 mark", () => {
    const wide: GanttRangePx = {
      epoch: new Date('2026-04-15T00:00:00Z'),
      totalDays: 62, // 4/15 ~ 6/15
    };
    const marks = getDateMarks(wide, 'month', 2026);
    expect(marks.map((m) => m.date.toISOString().slice(0, 10))).toEqual([
      '2026-05-01',
      '2026-06-01',
    ]);
    expect(marks.map((m) => m.label)).toEqual(['5월', '6월']);
  });

  it("연도 경계 'day' 모드 — 다른 해 라벨은 'YY/M/D' (#31 후속)", () => {
    const wide: GanttRangePx = {
      epoch: new Date('2025-12-30T00:00:00Z'),
      totalDays: 5, // 12/30, 12/31, 1/1, 1/2, 1/3
    };
    const marks = getDateMarks(wide, 'day', 2026);
    expect(marks.map((m) => m.label)).toEqual([
      '25/12/30',
      '25/12/31',
      '1/1',
      '1/2',
      '1/3',
    ]);
  });

  it("연도 경계 'month' 모드 — 다른 해 1일은 'YY/M월'", () => {
    const wide: GanttRangePx = {
      epoch: new Date('2025-10-15T00:00:00Z'),
      totalDays: 100, // 10/15/2025 ~ 1/22/2026 → 11/1, 12/1, 1/1
    };
    const marks = getDateMarks(wide, 'month', 2026);
    expect(marks.map((m) => m.label)).toEqual(['25년 11월', '25년 12월', '1월']);
  });
});

describe('extendRange (#31 — 무한스크롤 동적 확장)', () => {
  const base: GanttRangePx = {
    epoch: new Date('2026-04-24T00:00:00Z'),
    totalDays: 90,
  };

  it("'past' 60일 → epoch 가 60일 뒤로, totalDays += 60, deltaDaysAtStart=60", () => {
    const out = extendRange(base, 'past', 60);
    expect(out.range.epoch.toISOString().slice(0, 10)).toBe('2026-02-23');
    expect(out.range.totalDays).toBe(150);
    expect(out.deltaDaysAtStart).toBe(60);
  });

  it("'future' 60일 → epoch 동일, totalDays += 60, deltaDaysAtStart=0", () => {
    const out = extendRange(base, 'future', 60);
    expect(out.range.epoch.toISOString().slice(0, 10)).toBe('2026-04-24');
    expect(out.range.totalDays).toBe(150);
    expect(out.deltaDaysAtStart).toBe(0);
  });
});
