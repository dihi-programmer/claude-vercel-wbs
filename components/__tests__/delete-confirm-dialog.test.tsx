/**
 * RED: DeleteConfirmDialog (Issue #3 Stage 3).
 * 근거: SPEC.md §4 D-2.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteConfirmDialog } from '../delete-confirm-dialog';
import { renderWithChakra } from './helpers';

describe('<DeleteConfirmDialog />', () => {
  it('childCount=0 → 기본 메시지 (D-2)', () => {
    renderWithChakra(
      <DeleteConfirmDialog open childCount={0} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('이 작업을 삭제합니다. 계속할까요?')).toBeInTheDocument();
  });

  it('childCount=3 → "하위 작업 3개" 문구 포함 (D-2)', () => {
    renderWithChakra(
      <DeleteConfirmDialog open childCount={3} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText(/하위 작업 3개/)).toBeInTheDocument();
  });

  it('확인 클릭 → onConfirm, 취소 클릭 → onCancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithChakra(
      <DeleteConfirmDialog open childCount={0} onConfirm={onConfirm} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('Dialog 가 Portal 을 통해 render container 밖에 렌더됨 (#25)', () => {
    const { container } = renderWithChakra(
      <DeleteConfirmDialog open childCount={0} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    // role="alertdialog" (삭제 확인용)
    expect(container.querySelector('[role="alertdialog"]')).toBeNull();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });
});
