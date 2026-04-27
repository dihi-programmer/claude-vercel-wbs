/**
 * RED: GanttView (Issue #7 Stage 3, SPEC §7 G-2 + #31 px 레이어/모드).
 */
import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { GanttView } from '../gantt-view';
import { renderWithChakra } from './helpers';
import { LABEL_GAP_PX } from '@/lib/gantt/calc';
import type { Task } from '@/lib/db/schema';

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    id: overrides.id,
    parentId: overrides.parentId ?? null,
    title: overrides.title,
    description: null,
    assignee: null,
    status: 'todo',
    progress: overrides.progress ?? 0,
    startDate: overrides.startDate ?? null,
    dueDate: overrides.dueDate ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T00:00:00Z'),
  };
}

describe('<GanttView />', () => {
  it('tasks=[] → 빈 상태 문구', () => {
    renderWithChakra(<GanttView tasks={[]} />);
    expect(screen.getByText(/아직 작업이 없습니다/)).toBeInTheDocument();
  });

  it('3 tasks (계층) → DFS 순서로 3행 렌더', () => {
    const p = makeTask({ id: 'p', title: 'Parent' });
    const c = makeTask({
      id: 'c',
      title: 'Child',
      parentId: 'p',
      createdAt: new Date('2026-04-02T00:00:00Z'),
    });
    const g = makeTask({
      id: 'g',
      title: 'Grandchild',
      parentId: 'c',
      createdAt: new Date('2026-04-03T00:00:00Z'),
    });
    renderWithChakra(<GanttView tasks={[p, c, g]} />);
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Grandchild')).toBeInTheDocument();
  });

  it('주 단위 눈금 헤더 텍스트 렌더 (월/일)', () => {
    const t = makeTask({
      id: 'a',
      title: 'X',
      startDate: '2026-05-01',
      dueDate: '2026-05-31',
    });
    renderWithChakra(<GanttView tasks={[t]} />);
    // range ≈ 2026-04-24 ~ 2026-06-07, weekMarks: 4/27, 5/4, 5/11, 5/18, 5/25, 6/1
    expect(screen.getByText('5/4')).toBeInTheDocument();
    expect(screen.getByText('5/11')).toBeInTheDocument();
  });

  it('오늘이 range 안 → today-line 엘리먼트 존재', () => {
    const t = makeTask({
      id: 'a',
      title: 'X',
      startDate: '2026-05-01',
      dueDate: '2026-05-31',
    });
    const now = new Date('2026-05-14T00:00:00Z');
    const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
    expect(container.querySelector('[data-testid="today-line"]')).not.toBeNull();
  });

  // (#31) 새 모델에서 today 는 항상 range 의 anchor 로 포함됨 →
  // "오늘 range 밖 → today-line 없음" 케이스는 더 이상 의미 없음 (제거).

  it('각 행에 data-depth 속성 (계층 들여쓰기)', () => {
    const p = makeTask({ id: 'p', title: 'Parent' });
    const c = makeTask({
      id: 'c',
      title: 'Child',
      parentId: 'p',
      createdAt: new Date('2026-04-02T00:00:00Z'),
    });
    const { container } = renderWithChakra(<GanttView tasks={[p, c]} />);
    const depthNodes = container.querySelectorAll('[data-depth]');
    const depths = Array.from(depthNodes).map((n) => n.getAttribute('data-depth'));
    expect(depths).toContain('0');
    expect(depths).toContain('1');
  });

  it('depth 별 들여쓰기가 16px 일관 증분 (#27 — 2depth+ Chakra spacing fallback 버그)', () => {
    const a = makeTask({ id: 'a', title: 'A' });
    const b = makeTask({
      id: 'b',
      title: 'B',
      parentId: 'a',
      createdAt: new Date('2026-04-02T00:00:00Z'),
    });
    const c = makeTask({
      id: 'c',
      title: 'C',
      parentId: 'b',
      createdAt: new Date('2026-04-03T00:00:00Z'),
    });
    const d = makeTask({
      id: 'd',
      title: 'D',
      parentId: 'c',
      createdAt: new Date('2026-04-04T00:00:00Z'),
    });
    const { container } = renderWithChakra(<GanttView tasks={[a, b, c, d]} />);
    const rows = container.querySelectorAll('[data-depth]');
    const indentPxs = Array.from(rows).map((r) => Number(r.getAttribute('data-indent-px')));
    expect(indentPxs).toEqual([12, 28, 44, 60]);
  });

  describe('#31 px 레이어 + 모드', () => {
    it('기본 모드 = "week" → data-mode="week", data-px-per-day ≈ 60/7', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-31',
      });
      const now = new Date('2026-05-14T00:00:00Z');
      const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
      const scroller = container.querySelector('[data-mode]');
      expect(scroller?.getAttribute('data-mode')).toBe('week');
      const ppd = Number(scroller?.getAttribute('data-px-per-day'));
      expect(ppd).toBeCloseTo(LABEL_GAP_PX / 7, 4);
    });

    it('today-line 에 data-today-px = (now - epoch) * pxPerDay', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-31',
      });
      const now = new Date('2026-05-14T00:00:00Z');
      const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
      const scroller = container.querySelector('[data-mode]')!;
      const epochIso = scroller.getAttribute('data-epoch-iso')!;
      const ppd = Number(scroller.getAttribute('data-px-per-day'));
      const epoch = new Date(epochIso);
      const expected =
        ((now.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000)) * ppd;
      const todayLine = container.querySelector('[data-testid="today-line"]')!;
      expect(Number(todayLine.getAttribute('data-today-px'))).toBeCloseTo(expected, 1);
    });

    it('헤더 마크가 [data-mark-leftpx] 로 렌더되고, week 모드에서 월요일 라벨 모두 포함', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-31',
      });
      const now = new Date('2026-05-14T00:00:00Z');
      const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
      const marks = container.querySelectorAll('[data-mark-leftpx]');
      expect(marks.length).toBeGreaterThan(0);
      const labels = Array.from(marks).map((m) => m.textContent);
      expect(labels).toContain('5/4');
      expect(labels).toContain('5/11');
      expect(labels).toContain('5/18');
    });

    it('"일" 클릭 → data-mode="day", data-px-per-day=60', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-31',
      });
      const now = new Date('2026-05-14T00:00:00Z');
      const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
      fireEvent.click(screen.getByRole('button', { name: '일' }));
      const scroller = container.querySelector('[data-mode]')!;
      expect(scroller.getAttribute('data-mode')).toBe('day');
      expect(Number(scroller.getAttribute('data-px-per-day'))).toBe(LABEL_GAP_PX);
      // day 모드 → 마크 개수 = totalDays
      const totalDays = Number(scroller.getAttribute('data-total-days'));
      const marks = container.querySelectorAll('[data-mark-leftpx]');
      expect(marks.length).toBe(totalDays);
    });

    it('"월" 클릭 → data-mode="month", 라벨이 "M월" 형식', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-31',
      });
      const now = new Date('2026-05-14T00:00:00Z');
      const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
      fireEvent.click(screen.getByRole('button', { name: '월' }));
      const scroller = container.querySelector('[data-mode]')!;
      expect(scroller.getAttribute('data-mode')).toBe('month');
      expect(Number(scroller.getAttribute('data-px-per-day'))).toBeCloseTo(LABEL_GAP_PX / 30, 4);
      // 4/1~6/30 범위 → 5/1, 6/1 두 mark
      const labels = Array.from(container.querySelectorAll('[data-mark-leftpx]')).map(
        (m) => m.textContent,
      );
      expect(labels).toContain('5월');
      expect(labels).toContain('6월');
    });

    it('totalDays 가 epoch ~ end 일수와 일치 (data-total-days)', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-31',
      });
      const now = new Date('2026-05-14T00:00:00Z');
      const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
      const scroller = container.querySelector('[data-mode]')!;
      const totalDays = Number(scroller.getAttribute('data-total-days'));
      // 초기 범위: min(start,today)-30d ~ max(due,today)+30d
      // epoch=2026-04-01, end=2026-06-30 → 90일
      expect(totalDays).toBe(90);
    });
  });
});
