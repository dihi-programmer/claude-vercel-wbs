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

  describe('기간 컬럼 + overdue (Stage 2, SPEC §1 A-2, §8 H-2)', () => {
    it('시작일 + 목표 기한 있음 → "M/D ~ M/D" 렌더', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        startDate: '2026-05-01',
        dueDate: '2026-05-10',
      });
      renderWithChakra(
        <TaskList tasks={[t]} onRowClick={vi.fn()} now={new Date('2026-04-01T00:00:00Z')} />,
      );
      expect(screen.getByTestId('task-date-range')).toHaveTextContent('5/1 ~ 5/10');
    });

    it('시작일만 있음 → "M/D ~"', () => {
      const t = makeTask({ id: 'a', title: 'X', startDate: '2026-05-01' });
      renderWithChakra(<TaskList tasks={[t]} onRowClick={vi.fn()} />);
      expect(screen.getByTestId('task-date-range')).toHaveTextContent('5/1 ~');
    });

    it('목표 기한만 있음 → "~ M/D"', () => {
      const t = makeTask({ id: 'a', title: 'X', dueDate: '2026-05-10' });
      renderWithChakra(
        <TaskList tasks={[t]} onRowClick={vi.fn()} now={new Date('2026-04-01T00:00:00Z')} />,
      );
      expect(screen.getByTestId('task-date-range')).toHaveTextContent('~ 5/10');
    });

    it('날짜 둘 다 없음 → "—"', () => {
      const t = makeTask({ id: 'a', title: 'X' });
      renderWithChakra(<TaskList tasks={[t]} onRowClick={vi.fn()} />);
      expect(screen.getByTestId('task-date-range')).toHaveTextContent('—');
    });

    it('과거 목표 기한 + status=doing → "지남" 배지 + data-overdue="true"', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        dueDate: '2026-05-01',
        status: 'doing',
      });
      renderWithChakra(
        <TaskList
          tasks={[t]}
          onRowClick={vi.fn()}
          now={new Date('2026-05-10T00:00:00Z')}
        />,
      );
      expect(screen.getByText('지남')).toBeInTheDocument();
      const cell = screen.getByTestId('task-date-range').parentElement;
      expect(cell).toHaveAttribute('data-overdue', 'true');
    });

    it('과거 목표 기한 + status=done → "지남" 배지 없음 (H-3)', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        dueDate: '2026-05-01',
        status: 'done',
        progress: 100,
      });
      renderWithChakra(
        <TaskList
          tasks={[t]}
          onRowClick={vi.fn()}
          now={new Date('2026-05-10T00:00:00Z')}
        />,
      );
      expect(screen.queryByText('지남')).toBeNull();
    });

    it('미래 목표 기한 → 경고 없음', () => {
      const t = makeTask({
        id: 'a',
        title: 'X',
        dueDate: '2026-05-20',
        status: 'doing',
      });
      renderWithChakra(
        <TaskList
          tasks={[t]}
          onRowClick={vi.fn()}
          now={new Date('2026-05-10T00:00:00Z')}
        />,
      );
      expect(screen.queryByText('지남')).toBeNull();
    });
  });

  describe('상태 배지 배선 (Issue #5 Stage 5, SPEC §3 C-2)', () => {
    it('onStatusCycle 없으면 배지는 한글 라벨만 읽기 전용 표시', () => {
      const t = makeTask({ id: 'x', title: 'X', status: 'todo' });
      renderWithChakra(<TaskList tasks={[t]} onRowClick={vi.fn()} />);
      expect(screen.getByText('할 일')).toBeInTheDocument();
    });

    it('onStatusCycle 제공 시 배지 버튼 클릭 → 해당 task 로 콜백 호출', () => {
      const t = makeTask({ id: 'x', title: 'X', status: 'doing' });
      const onStatusCycle = vi.fn();
      renderWithChakra(
        <TaskList
          tasks={[t]}
          onRowClick={vi.fn()}
          onStatusCycle={onStatusCycle}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /진행 중/ }));
      expect(onStatusCycle).toHaveBeenCalledWith(t);
    });

    it('배지 클릭은 onRowClick 호출 안 됨 (stopPropagation)', () => {
      const t = makeTask({ id: 'x', title: 'X', status: 'todo' });
      const onStatusCycle = vi.fn();
      const onRowClick = vi.fn();
      renderWithChakra(
        <TaskList
          tasks={[t]}
          onRowClick={onRowClick}
          onStatusCycle={onStatusCycle}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /할 일/ }));
      expect(onStatusCycle).toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe('펼침/접힘 (Stage 3, SPEC §5 E-2)', () => {
    it('접기 버튼 클릭 → ▶ 로 바뀌고 자식 숨김', () => {
      const p = makeTask({ id: 'p', title: 'Parent' });
      const c = makeTask({ id: 'c', parentId: 'p', title: 'Child' });
      renderWithChakra(<TaskList tasks={[p, c]} onRowClick={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: '접기' }));
      expect(screen.queryByRole('button', { name: '작업: Child' })).toBeNull();
      expect(screen.getByRole('button', { name: '펼치기' })).toBeInTheDocument();
    });

    it('펼치기 버튼 클릭 → ▼ 로 복원, 자식 다시 보임', () => {
      const p = makeTask({ id: 'p', title: 'Parent' });
      const c = makeTask({ id: 'c', parentId: 'p', title: 'Child' });
      renderWithChakra(<TaskList tasks={[p, c]} onRowClick={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: '접기' }));
      fireEvent.click(screen.getByRole('button', { name: '펼치기' }));
      expect(screen.getByRole('button', { name: '작업: Child' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '접기' })).toBeInTheDocument();
    });

    it('토글 클릭은 onRowClick 호출 안 됨 (stopPropagation)', () => {
      const p = makeTask({ id: 'p', title: 'Parent' });
      const c = makeTask({ id: 'c', parentId: 'p', title: 'Child' });
      const onRowClick = vi.fn();
      renderWithChakra(<TaskList tasks={[p, c]} onRowClick={onRowClick} />);
      fireEvent.click(screen.getByRole('button', { name: '접기' }));
      expect(onRowClick).not.toHaveBeenCalled();
    });

    it('조부 접으면 자식과 손자 모두 사라짐', () => {
      const p = makeTask({ id: 'p', title: 'Parent' });
      const c = makeTask({ id: 'c', parentId: 'p', title: 'Child' });
      const g = makeTask({ id: 'g', parentId: 'c', title: 'Grandchild' });
      renderWithChakra(<TaskList tasks={[p, c, g]} onRowClick={vi.fn()} />);
      // Parent 접기 버튼 (여러 개 중 Parent 의 것)
      const parentRow = screen.getByRole('button', { name: '작업: Parent' });
      const toggleInParentRow = parentRow.querySelector('button[aria-label="접기"]') as HTMLElement;
      fireEvent.click(toggleInParentRow);
      expect(screen.queryByRole('button', { name: '작업: Child' })).toBeNull();
      expect(screen.queryByRole('button', { name: '작업: Grandchild' })).toBeNull();
    });
  });
});
