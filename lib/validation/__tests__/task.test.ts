/**
 * RED 테스트: validateTaskInput (Issue #3 Stage 1).
 *
 * 근거: SPEC.md §1 A-2 ("시작일·목표 기한 둘 다 선택적"), §2 B-2 (필드 제약, "목표 기한은 시작일 이후").
 * 이 단계에서 구현 (lib/validation/task.ts) 은 'not implemented' throw — 전 테스트 실패가 정상.
 */
import { describe, it, expect } from 'vitest';
import { validateTaskInput } from '@/lib/validation/task';

describe('validateTaskInput', () => {
  describe('title (B-2 필수 필드)', () => {
    it('빈 문자열 → invalid, errors.title 존재', () => {
      const result = validateTaskInput({ title: '' });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.title).toBeTruthy();
    });

    it('공백만 → invalid (trim 후 판정)', () => {
      const result = validateTaskInput({ title: '   ' });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.title).toBeTruthy();
    });

    it('정상 제목 → valid', () => {
      const result = validateTaskInput({ title: '킥오프 미팅' });
      expect(result.valid).toBe(true);
    });
  });

  describe('progress (B-2 0~100)', () => {
    it('-1 → invalid, errors.progress', () => {
      const result = validateTaskInput({ title: 'X', progress: -1 });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.progress).toBeTruthy();
    });

    it('101 → invalid, errors.progress', () => {
      const result = validateTaskInput({ title: 'X', progress: 101 });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.progress).toBeTruthy();
    });

    it('0 → valid (경계값)', () => {
      const result = validateTaskInput({ title: 'X', progress: 0 });
      expect(result.valid).toBe(true);
    });

    it('100 → valid (경계값)', () => {
      const result = validateTaskInput({ title: 'X', progress: 100 });
      expect(result.valid).toBe(true);
    });

    it('undefined → valid (기본값 사용)', () => {
      const result = validateTaskInput({ title: 'X' });
      expect(result.valid).toBe(true);
    });
  });

  describe('status (B-2 enum)', () => {
    it.each(['todo', 'doing', 'done'] as const)('status=%s → valid', (status) => {
      const result = validateTaskInput({ title: 'X', status });
      expect(result.valid).toBe(true);
    });

    it("status='blocked' 허용 외 → invalid, errors.status", () => {
      const result = validateTaskInput({ title: 'X', status: 'blocked' });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.status).toBeTruthy();
    });
  });

  describe('날짜 (A-2 nullable, B-2 기한 ≥ 시작일)', () => {
    it('start_date 만 있음 → valid', () => {
      const result = validateTaskInput({ title: 'X', startDate: '2026-05-01' });
      expect(result.valid).toBe(true);
    });

    it('due_date 만 있음 → valid', () => {
      const result = validateTaskInput({ title: 'X', dueDate: '2026-05-14' });
      expect(result.valid).toBe(true);
    });

    it('둘 다 없음 → valid', () => {
      const result = validateTaskInput({ title: 'X' });
      expect(result.valid).toBe(true);
    });

    it('start > due → invalid, errors.dueDate', () => {
      const result = validateTaskInput({
        title: 'X',
        startDate: '2026-05-14',
        dueDate: '2026-05-01',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.dueDate).toBeTruthy();
    });

    it('start === due → valid (같은 날 마감 허용)', () => {
      const result = validateTaskInput({
        title: 'X',
        startDate: '2026-05-14',
        dueDate: '2026-05-14',
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('에러 수집', () => {
    it('여러 필드 invalid 면 errors 객체에 각 키가 담김', () => {
      const result = validateTaskInput({
        title: '',
        progress: 200,
        status: 'blocked',
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(Object.keys(result.errors).sort()).toEqual(['progress', 'status', 'title']);
      }
    });
  });
});
