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

  it('onAddChildClick props 제공 → "+ 하위" 버튼 렌더 (SPEC B-1)', () => {
    const t = makeTask({ id: 'x', title: 'Parent' });
    renderWithChakra(
      <TaskList tasks={[t]} onRowClick={vi.fn()} onAddChildClick={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /하위/ })).toBeInTheDocument();
  });

  it('"+ 하위" 클릭 → onAddChildClick 만 호출 (onRowClick 은 호출 안 됨)', () => {
    const t = makeTask({ id: 'x', title: 'Parent' });
    const onRowClick = vi.fn();
    const onAddChildClick = vi.fn();
    renderWithChakra(
      <TaskList tasks={[t]} onRowClick={onRowClick} onAddChildClick={onAddChildClick} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /하위/ }));
    expect(onAddChildClick).toHaveBeenCalledWith(t);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('onDeleteClick props 제공 → "삭제" 버튼 렌더 (SPEC D-1)', () => {
    const t = makeTask({ id: 'x', title: 'X' });
    renderWithChakra(
      <TaskList tasks={[t]} onRowClick={vi.fn()} onDeleteClick={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
  });

  it('"삭제" 클릭 → onDeleteClick 만 호출 (onRowClick 은 호출 안 됨)', () => {
    const t = makeTask({ id: 'x', title: 'X' });
    const onRowClick = vi.fn();
    const onDeleteClick = vi.fn();
    renderWithChakra(
      <TaskList tasks={[t]} onRowClick={onRowClick} onDeleteClick={onDeleteClick} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /삭제/ }));
    expect(onDeleteClick).toHaveBeenCalledWith(t);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  describe('트리 렌더 (Stage 2, SPEC §5 E)', () => {
    it('입력이 뒤섞여도 DFS 순서로 렌더 (부모 → 자식)', () => {
      const c = makeTask({ id: 'c', parentId: 'p', title: 'Child' });
      const p = makeTask({ id: 'p', title: 'Parent' });
      renderWithChakra(<TaskList tasks={[c, p]} onRowClick={vi.fn()} />);
      const buttons = screen.getAllByRole('button', { name: /^작업:/ });
      expect(buttons[0].getAttribute('aria-label')).toBe('작업: Parent');
      expect(buttons[1].getAttribute('aria-label')).toBe('작업: Child');
    });

    it('깊이에 따른 data-depth 속성 (E-1 들여쓰기 근거)', () => {
      const p = makeTask({ id: 'p', title: 'Parent' });
      const c = makeTask({ id: 'c', parentId: 'p', title: 'Child' });
      const g = makeTask({ id: 'g', parentId: 'c', title: 'Grandchild' });
      renderWithChakra(<TaskList tasks={[p, c, g]} onRowClick={vi.fn()} />);
      expect(screen.getByRole('button', { name: '작업: Parent' })).toHaveAttribute('data-depth', '0');
      expect(screen.getByRole('button', { name: '작업: Child' })).toHaveAttribute('data-depth', '1');
      expect(screen.getByRole('button', { name: '작업: Grandchild' })).toHaveAttribute('data-depth', '2');
    });

    it('자식 있는 행에 "▼" 아이콘 렌더 (E-2)', () => {
      const p = makeTask({ id: 'p' });
      const c = makeTask({ id: 'c', parentId: 'p' });
      renderWithChakra(<TaskList tasks={[p, c]} onRowClick={vi.fn()} />);
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('자식 없는 단일 행에는 ▼/▶ 아이콘 없음 (E-2)', () => {
      const t = makeTask({ id: 'solo' });
      renderWithChakra(<TaskList tasks={[t]} onRowClick={vi.fn()} />);
      expect(screen.queryByText('▼')).toBeNull();
      expect(screen.queryByText('▶')).toBeNull();
    });

    it('orphan parentId → root(depth=0) 로 렌더', () => {
      const orphan = makeTask({
        id: 'orphan',
        parentId: '00000000-0000-0000-0000-000000000000',
        title: 'Orphan',
      });
      renderWithChakra(<TaskList tasks={[orphan]} onRowClick={vi.fn()} />);
      expect(screen.getByRole('button', { name: '작업: Orphan' })).toHaveAttribute('data-depth', '0');
    });
  });
});
