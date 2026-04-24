/**
 * RED: isOverdue (Issue #11 Stage 1, SPEC §8 H-1 · H-3).
 */
import { describe, it, expect } from 'vitest';
import { isOverdue } from '@/lib/overdue/is-overdue';

describe('isOverdue (SPEC §8 H-1 · H-3)', () => {
  const today = new Date('2026-05-14T00:00:00Z');

  it('dueDate = null → false', () => {
    expect(isOverdue(null, 'todo', today)).toBe(false);
  });

  it('dueDate 가 미래 → false (status 무관)', () => {
    expect(isOverdue('2026-05-20', 'todo', today)).toBe(false);
    expect(isOverdue('2026-05-20', 'doing', today)).toBe(false);
  });

  it('dueDate 가 과거 + status=todo → true', () => {
    expect(isOverdue('2026-05-10', 'todo', today)).toBe(true);
  });

  it('dueDate 가 과거 + status=doing → true', () => {
    expect(isOverdue('2026-05-10', 'doing', today)).toBe(true);
  });

  it('dueDate 가 과거 + status=done → false (H-3 완료는 경고 해제)', () => {
    expect(isOverdue('2026-05-10', 'done', today)).toBe(false);
  });

  it('dueDate === today → false (당일은 아직 overdue 아님)', () => {
    expect(isOverdue('2026-05-14', 'todo', today)).toBe(false);
  });
});
