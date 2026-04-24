import type { Task } from '@/lib/db/schema';

export type GanttRange = { start: Date; end: Date };
export type GanttBar = {
  leftPct: number;
  widthPct: number;
  progressPct: number;
};

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
