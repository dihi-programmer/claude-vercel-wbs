/**
 * RED: GanttBar (Issue #7 Stage 2, SPEC §7 G-2 — px 기반 #31).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { GanttBar } from '../gantt-bar';
import { renderWithChakra } from './helpers';
import { LABEL_GAP_PX, pxPerDay } from '@/lib/gantt/calc';

const epoch = new Date('2026-04-24T00:00:00Z'); // Fri
const ppd = pxPerDay('day'); // 60

describe('<GanttBar />', () => {
  it('startDate 만 있고 dueDate 없음 → "— 일정 없음 —"', () => {
    renderWithChakra(
      <GanttBar startDate="2026-05-01" dueDate={null} progress={0} epoch={epoch} pxPerDay={ppd} />,
    );
    expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
  });

  it('dueDate 만 있고 startDate 없음 → "— 일정 없음 —"', () => {
    renderWithChakra(
      <GanttBar startDate={null} dueDate="2026-05-31" progress={0} epoch={epoch} pxPerDay={ppd} />,
    );
    expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
  });

  it('둘 다 있음 → data-left-px · data-width-px 속성 렌더', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-04"
        progress={50}
        epoch={epoch}
        pxPerDay={ppd}
      />,
    );
    const bar = container.querySelector('[data-left-px]');
    expect(bar).not.toBeNull();
    // start = epoch + 7d, due = start + 3d → leftPx = 7*60=420, widthPx = 4*60=240
    expect(bar?.getAttribute('data-left-px')).toBe('420');
    expect(bar?.getAttribute('data-width-px')).toBe('240');
    expect(screen.queryByText(/일정 없음/)).toBeNull();
  });

  it('진행률 0% → data-progress-pct="0"', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-04"
        progress={0}
        epoch={epoch}
        pxPerDay={ppd}
      />,
    );
    expect(container.querySelector('[data-progress-pct]')?.getAttribute('data-progress-pct')).toBe('0');
  });

  it('진행률 100% → data-progress-pct="100"', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-04"
        progress={100}
        epoch={epoch}
        pxPerDay={ppd}
      />,
    );
    expect(container.querySelector('[data-progress-pct]')?.getAttribute('data-progress-pct')).toBe('100');
  });

  it('진행률 60% → data-progress-pct="60"', () => {
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-04"
        progress={60}
        epoch={epoch}
        pxPerDay={ppd}
      />,
    );
    expect(container.querySelector('[data-progress-pct]')?.getAttribute('data-progress-pct')).toBe('60');
  });

  it("week 모드의 pxPerDay 로 leftPx/widthPx 가 1/7 로 압축", () => {
    const ppdWeek = pxPerDay('week'); // 60/7
    const { container } = renderWithChakra(
      <GanttBar
        startDate="2026-05-01"
        dueDate="2026-05-04"
        progress={50}
        epoch={epoch}
        pxPerDay={ppdWeek}
      />,
    );
    const bar = container.querySelector('[data-left-px]')!;
    // leftPx = 7 * (60/7) = 60, widthPx = 4 * (60/7) ≈ 34.28
    expect(Number(bar.getAttribute('data-left-px'))).toBeCloseTo(60, 2);
    expect(Number(bar.getAttribute('data-width-px'))).toBeCloseTo(4 * (LABEL_GAP_PX / 7), 2);
  });

  describe('overdue 표시 (Stage 3, SPEC §8 H-2 간트)', () => {
    it('overdue=true → data-overdue="true"', () => {
      const { container } = renderWithChakra(
        <GanttBar
          startDate="2026-05-01"
          dueDate="2026-05-04"
          progress={50}
          epoch={epoch}
          pxPerDay={ppd}
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
          dueDate="2026-05-04"
          progress={50}
          epoch={epoch}
          pxPerDay={ppd}
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
          epoch={epoch}
          pxPerDay={ppd}
          overdue
        />,
      );
      expect(screen.getByText(/일정 없음/)).toBeInTheDocument();
      expect(container.querySelector('[data-overdue]')).toBeNull();
    });
  });

  describe('"일정 없음" 수직 정렬 (#29)', () => {
    it('빈 상태 wrapper 가 data-testid="gantt-empty" 로 렌더되고 텍스트 포함', () => {
      const { container } = renderWithChakra(
        <GanttBar startDate={null} dueDate={null} progress={0} epoch={epoch} pxPerDay={ppd} />,
      );
      const empty = container.querySelector('[data-testid="gantt-empty"]');
      expect(empty).not.toBeNull();
      expect(empty?.textContent).toMatch(/일정 없음/);
    });
  });

  describe('"일정 없음" 가로 스크롤 시 viewport 중앙 (#39)', () => {
    it('빈 상태 wrapper 가 data-sticky-center="true" attribute 보유', () => {
      const { container } = renderWithChakra(
        <GanttBar startDate={null} dueDate={null} progress={0} epoch={epoch} pxPerDay={ppd} />,
      );
      const empty = container.querySelector('[data-testid="gantt-empty"]');
      expect(empty?.getAttribute('data-sticky-center')).toBe('true');
    });
  });
});
