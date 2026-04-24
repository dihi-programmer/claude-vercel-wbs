/**
 * RED: GanttBar (Issue #7 Stage 2, SPEC §7 G-2).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { GanttBar } from '../gantt-bar';
import { renderWithChakra } from './helpers';
import type { GanttRange } from '@/lib/gantt/calc';

const range: GanttRange = {
  start: new Date('2026-05-01T00:00:00Z'),
  end: new Date('2026-05-31T00:00:00Z'),
};

describe('<GanttBar />', () => {
  it('startDate 만 있고 dueDate 없음 → "— 일정 없음 —"', () => {
    renderWithChakra(
      <GanttBar startDate="2026-05-01" dueDate={null} progress={0} range={range} />,
    );
    expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
  });

  it('dueDate 만 있고 startDate 없음 → "— 일정 없음 —"', () => {
    renderWithChakra(
      <GanttBar startDate={null} dueDate="2026-05-31" progress={0} range={range} />,
    );
    expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
  });

  it('둘 다 있음 → data-left-pct · data-width-pct 속성 렌더', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-31"
        progress={50}
        range={range}
      />,
    );
    const bar = container.querySelector('[data-left-pct]');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('data-width-pct')).not.toBeNull();
    // 일정 없음 문구는 없어야 함
    expect(screen.queryByText(/일정 없음/)).toBeNull();
  });

  it('진행률 0% → data-progress-pct="0"', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-31"
        progress={0}
        range={range}
      />,
    );
    expect(container.querySelector('[data-progress-pct]')?.getAttribute('data-progress-pct')).toBe('0');
  });

  it('진행률 100% → data-progress-pct="100"', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-31"
        progress={100}
        range={range}
      />,
    );
    expect(container.querySelector('[data-progress-pct]')?.getAttribute('data-progress-pct')).toBe('100');
  });

  it('진행률 60% → data-progress-pct="60"', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-31"
        progress={60}
        range={range}
      />,
    );
    expect(container.querySelector('[data-progress-pct]')?.getAttribute('data-progress-pct')).toBe('60');
  });

  describe('overdue 표시 (Stage 3, SPEC §8 H-2 간트)', () => {
    it('overdue=true → data-overdue="true"', () => {
      const { container } = renderWithChakra(
        <GanttBar
          startDate="2026-05-01"
          dueDate="2026-05-31"
          progress={50}
          range={range}
          overdue
        />,
      );
      const bar = container.querySelector('[data-overdue]');
      expect(bar?.getAttribute('data-overdue')).toBe('true');
    });

    it('overdue 기본값(생략) → data-overdue="false"', () => {
      const { container } = renderWithChakra(
        <GanttBar
          startDate="2026-05-01"
          dueDate="2026-05-31"
          progress={50}
          range={range}
        />,
      );
      const bar = container.querySelector('[data-overdue]');
      expect(bar?.getAttribute('data-overdue')).toBe('false');
    });

    it('"일정 없음" 분기에서는 overdue 무관 — 텍스트만 렌더, 막대 없음', () => {
      const { container } = renderWithChakra(
        <GanttBar
          startDate={null}
          dueDate="2026-05-31"
          progress={50}
          range={range}
          overdue
        />,
      );
      expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
      expect(container.querySelector('[data-overdue]')).toBeNull();
    });
  });
});
