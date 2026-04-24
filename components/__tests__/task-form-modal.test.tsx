/**
 * RED: TaskFormModal (Issue #3 Stage 3).
 * 근거: SPEC.md §2 B (생성), §3 C (수정).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { TaskFormModal } from '../task-form-modal';
import { renderWithChakra } from './helpers';

describe('<TaskFormModal />', () => {
  it('mode=create · open → 모든 필드 빈, 저장 버튼 비활성', () => {
    renderWithChakra(
      <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByLabelText(/제목/)).toHaveValue('');
    expect(screen.getByRole('button', { name: /저장/ })).toBeDisabled();
  });

  it('제목 입력 → 저장 버튼 활성', () => {
    renderWithChakra(
      <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '킥오프' } });
    expect(screen.getByRole('button', { name: /저장/ })).not.toBeDisabled();
  });

  it('저장 클릭 → onSubmit 이 입력값으로 호출 (TaskInput 모양)', () => {
    const onSubmit = vi.fn();
    renderWithChakra(
      <TaskFormModal mode="create" open onSubmit={onSubmit} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/제목/), { target: { value: '킥오프' } });
    fireEvent.change(screen.getByLabelText(/담당자/), { target: { value: '김PM' } });
    fireEvent.click(screen.getByRole('button', { name: /저장/ }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: '킥오프', assignee: '김PM' }),
    );
  });

  it("mode='edit' + initialValue → 필드에 초기값 채움", () => {
    renderWithChakra(
      <TaskFormModal
        mode="edit"
        open
        initialValue={{
          title: 'existing',
          assignee: '김PM',
          status: 'doing',
          progress: 50,
        }}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/제목/)).toHaveValue('existing');
    expect(screen.getByLabelText(/담당자/)).toHaveValue('김PM');
  });

  it('ESC 키 → onClose 호출 (#25 Chakra Dialog 전환)', () => {
    const onClose = vi.fn();
    renderWithChakra(
      <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={onClose} />,
    );
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('startDate > dueDate → 에러 메시지 노출, 저장 버튼 비활성 (SPEC B-2)', () => {
    renderWithChakra(
      <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/제목/), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-05-14' } });
    fireEvent.change(screen.getByLabelText(/목표 기한/), { target: { value: '2026-05-01' } });
    expect(screen.getByText(/목표 기한은 시작일/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /저장/ })).toBeDisabled();
  });

  describe('진행률 ↔ 상태 자동 반영 (Stage 4, SPEC §3 C-2)', () => {
    it('진행률 100 입력 → 상태 select 값이 "done" 으로 자동 전환', () => {
      renderWithChakra(
        <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={vi.fn()} />,
      );
      fireEvent.change(screen.getByLabelText(/제목/), { target: { value: 'X' } });
      fireEvent.change(screen.getByLabelText(/진행률/), { target: { value: '100' } });
      expect((screen.getByLabelText(/상태/) as HTMLSelectElement).value).toBe('done');
    });

    it('진행률 100 후 상태를 "진행 중" 으로 수동 변경 → 진행률 100 유지 (역방향 없음)', () => {
      renderWithChakra(
        <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={vi.fn()} />,
      );
      fireEvent.change(screen.getByLabelText(/제목/), { target: { value: 'X' } });
      fireEvent.change(screen.getByLabelText(/진행률/), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText(/상태/), { target: { value: 'doing' } });
      expect((screen.getByLabelText(/진행률/) as HTMLInputElement).value).toBe('100');
      expect((screen.getByLabelText(/상태/) as HTMLSelectElement).value).toBe('doing');
    });

    it('진행률 99 입력 → 상태 변경 없음 (초기 todo 유지)', () => {
      renderWithChakra(
        <TaskFormModal mode="create" open onSubmit={vi.fn()} onClose={vi.fn()} />,
      );
      fireEvent.change(screen.getByLabelText(/제목/), { target: { value: 'X' } });
      fireEvent.change(screen.getByLabelText(/진행률/), { target: { value: '99' } });
      expect((screen.getByLabelText(/상태/) as HTMLSelectElement).value).toBe('todo');
    });
  });
});
