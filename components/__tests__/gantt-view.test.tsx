/**
 * RED: GanttView (Issue #7 Stage 3, SPEC §7 G-2).
 */
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { GanttView } from '../gantt-view';
import { renderWithChakra } from './helpers';
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

  it('오늘이 range 밖 → today-line 없음', () => {
    const t = makeTask({
      id: 'a',
      title: 'X',
      startDate: '2026-05-01',
      dueDate: '2026-05-31',
    });
    const now = new Date('2027-01-01T00:00:00Z');
    const { container } = renderWithChakra(<GanttView tasks={[t]} now={now} />);
    expect(container.querySelector('[data-testid="today-line"]')).toBeNull();
  });

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
});
