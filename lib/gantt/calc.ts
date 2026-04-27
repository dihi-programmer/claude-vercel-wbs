import type { Task } from '@/lib/db/schema';

export type GanttRange = { start: Date; end: Date };
export type GanttBar = {
  leftPct: number;
  widthPct: number;
  progressPct: number;
};

// #31 — px 기반 레이어 (가로 무한스크롤 + 모드 토글용)
export type GanttMode = 'day' | 'week' | 'month';
export type GanttRangePx = { epoch: Date; totalDays: number };
export type GanttBarPx = {
  leftPx: number;
  widthPx: number;
  progressPct: number;
};
export type GanttMark = {
  date: Date;
  leftPx: number;
  label: string;
};

// 라벨 사이의 시각적 간격 (모드 무관 동일).
export const LABEL_GAP_PX = 60;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDate(s: string): Date {
  // YYYY-MM-DD → UTC midnight.
  return new Date(`${s}T00:00:00Z`);
}

function startOfDayUtc(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * ONE_DAY_MS);
}

function firstMondayOnOrAfter(date: Date): Date {
  const d = startOfDayUtc(date);
  // 0=Sun, 1=Mon, ..., 6=Sat
  const day = d.getUTCDay();
  const daysUntilMonday = (1 - day + 7) % 7;
  return addDays(d, daysUntilMonday);
}

export function calculateRange(tasks: Task[], now: Date = new Date()): GanttRange {
  const dates: Date[] = [];
  for (const t of tasks) {
    if (t.startDate) dates.push(parseIsoDate(t.startDate));
    if (t.dueDate) dates.push(parseIsoDate(t.dueDate));
  }

  if (dates.length === 0) {
    // 기본: 오늘 ±4주.
    const today = startOfDayUtc(now);
    return {
      start: addDays(today, -28),
      end: addDays(today, 28),
    };
  }

  const minMs = Math.min(...dates.map((d) => d.getTime()));
  const maxMs = Math.max(...dates.map((d) => d.getTime()));
  return {
    start: addDays(new Date(minMs), -7),
    end: addDays(new Date(maxMs), 7),
  };
}

export function calculateBar(
  startDate: string,
  dueDate: string,
  progress: number,
  range: GanttRange,
): GanttBar {
  const totalMs = range.end.getTime() - range.start.getTime();
  const s = parseIsoDate(startDate).getTime() - range.start.getTime();
  const e = parseIsoDate(dueDate).getTime() - range.start.getTime();
  return {
    leftPct: (s / totalMs) * 100,
    widthPct: ((e - s) / totalMs) * 100,
    progressPct: Math.max(0, Math.min(100, progress)),
  };
}

export function getWeekMarks(range: GanttRange): Date[] {
  const marks: Date[] = [];
  let current = firstMondayOnOrAfter(range.start);
  while (current.getTime() <= range.end.getTime()) {
    marks.push(current);
    current = addDays(current, 7);
  }
  return marks;
}

// ---- #31 px 레이어 ----

export function pxPerDay(mode: GanttMode): number {
  switch (mode) {
    case 'day':
      return LABEL_GAP_PX;
    case 'week':
      return LABEL_GAP_PX / 7;
    case 'month':
      return LABEL_GAP_PX / 30;
  }
}

function daysBetween(epoch: Date, target: Date): number {
  return Math.round((target.getTime() - epoch.getTime()) / ONE_DAY_MS);
}

export function calculateBarPx(
  startDate: string,
  dueDate: string,
  progress: number,
  epoch: Date,
  ppd: number,
): GanttBarPx {
  const start = parseIsoDate(startDate);
  const due = parseIsoDate(dueDate);
  const offsetDays = daysBetween(epoch, start);
  // due 포함 일수: due - start + 1
  const inclusiveDays = daysBetween(start, due) + 1;
  return {
    leftPx: offsetDays * ppd,
    widthPx: inclusiveDays * ppd,
    progressPct: Math.max(0, Math.min(100, progress)),
  };
}

function formatMD(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function formatMonthLabel(d: Date): string {
  return `${d.getUTCMonth() + 1}월`;
}

export function getDateMarks(range: GanttRangePx, mode: GanttMode): GanttMark[] {
  const ppd = pxPerDay(mode);
  const marks: GanttMark[] = [];
  const epoch = startOfDayUtc(range.epoch);
  const endExclusive = addDays(epoch, range.totalDays);

  if (mode === 'day') {
    for (let i = 0; i < range.totalDays; i++) {
      const d = addDays(epoch, i);
      marks.push({ date: d, leftPx: i * ppd, label: formatMD(d) });
    }
    return marks;
  }

  if (mode === 'week') {
    let current = firstMondayOnOrAfter(epoch);
    while (current.getTime() < endExclusive.getTime()) {
      marks.push({
        date: current,
        leftPx: daysBetween(epoch, current) * ppd,
        label: formatMD(current),
      });
      current = addDays(current, 7);
    }
    return marks;
  }

  // 'month': 범위 내 각 월의 1일
  let current = new Date(Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth(), 1));
  if (current.getTime() < epoch.getTime()) {
    current = new Date(Date.UTC(epoch.getUTCFullYear(), epoch.getUTCMonth() + 1, 1));
  }
  while (current.getTime() < endExclusive.getTime()) {
    marks.push({
      date: current,
      leftPx: daysBetween(epoch, current) * ppd,
      label: formatMonthLabel(current),
    });
    current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1));
  }
  return marks;
}
