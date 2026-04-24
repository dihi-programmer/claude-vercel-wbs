// SPEC §8 H-1: today > due_date AND status != 'done' → overdue.
// H-3 완료는 경고 즉시 해제 — done 이면 항상 false.
// 당일 경계: today === due_date 는 아직 overdue 아님 (마감 당일 여유 해석).

function parseIsoDateUtc(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

function startOfDayUtc(d: Date): Date {
  const clone = new Date(d);
  clone.setUTCHours(0, 0, 0, 0);
  return clone;
}

export function isOverdue(
  dueDate: string | null,
  status: string,
  now: Date = new Date(),
): boolean {
  if (!dueDate) return false;
  if (status === 'done') return false;
  const today = startOfDayUtc(now);
  const due = parseIsoDateUtc(dueDate);
  return today.getTime() > due.getTime();
}
