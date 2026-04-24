/**
 * RED: TaskList (Issue #3 Stage 3).
 * 근거: SPEC.md §1 A-1 (빈 상태), A-2 (행 구성), C-1 (행 클릭 → 편집).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { TaskList } from '../task-list';
import { renderWithChakra, makeTask } from './helpers';

describe('<TaskList />', () => {
  it('tasks=[] → 빈 상태 문구 (SPEC A-1)', () => {
    renderWithChakra(<TaskList tasks={[]} onRowClick={vi.fn()} />);
    expect(screen.getByText(/아직 작업이 없습니다/)).toBeInTheDocument();
  });

  it('tasks 가 있으면 각 행이 role=button 으로 클릭 가능', () => {
    const t1 = makeTask({ id: 'id-1', title: 'Alpha' });
    const t2 = makeTask({ id: 'id-2', title: 'Beta' });
    renderWithChakra(<TaskList tasks={[t1, t2]} onRowClick={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('행 클릭 → onRowClick 이 해당 task 로 호출 (SPEC C-1)', () => {
    const t1 = makeTask({ id: 'id-1', title: 'Alpha' });
    const t2 = makeTask({ id: 'id-2', title: 'Beta' });
    const onRowClick = vi.fn();
    renderWithChakra(<TaskList tasks={[t1, t2]} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Beta'));
    expect(onRowClick).toHaveBeenCalledWith(t2);
  });
});
