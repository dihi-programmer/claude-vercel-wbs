/**
 * RED: StatusBadge (Issue #5 Stage 3, SPEC §3 C-2).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { StatusBadge } from '../status-badge';
import { renderWithChakra } from './helpers';
import type { TaskStatus } from '@/lib/validation/task';

describe('<StatusBadge />', () => {
  it.each<[TaskStatus, string]>([
    ['todo', '할 일'],
    ['doing', '진행 중'],
    ['done', '완료'],
  ])('status=%s → 한글 라벨 "%s" 표시', (status, label) => {
    renderWithChakra(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('onCycle 없으면 button 렌더 안 됨 (읽기 전용)', () => {
    renderWithChakra(<StatusBadge status="todo" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('onCycle 제공 시 button 렌더, 클릭 → onCycle 호출', () => {
    const onCycle = vi.fn();
    renderWithChakra(<StatusBadge status="todo" onCycle={onCycle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onCycle).toHaveBeenCalledTimes(1);
  });

  it('배지 클릭은 부모 onClick 을 호출하지 않음 (stopPropagation)', () => {
    const parentClick = vi.fn();
    const onCycle = vi.fn();
    renderWithChakra(
      <div onClick={parentClick} role="presentation">
        <StatusBadge status="todo" onCycle={onCycle} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onCycle).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
