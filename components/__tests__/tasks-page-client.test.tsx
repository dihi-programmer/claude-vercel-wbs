/**
 * RED: TasksPageClient 뷰 토글 (Issue #7 Stage 4, SPEC §7 G-1).
 * Server Actions 는 vi.mock 으로 noop 처리해 UI 동작만 검증.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithChakra } from './helpers';
import type { Task } from '@/lib/db/schema';

vi.mock('@/app/actions/tasks', () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getDescendantCount: vi.fn().mockResolvedValue(0),
}));

vi.mock('@/app/actions/csv', () => ({
  applyCsvImport: vi.fn(),
}));

import { TasksPageClient } from '../tasks-page-client';

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

describe('<TasksPageClient /> 뷰 토글 (Stage 4)', () => {
  it('초기 렌더 → 목록 뷰 활성 + 토글 버튼 2개 존재', () => {
    renderWithChakra(<TasksPageClient initialTasks={[]} />);
    expect(screen.getByRole('button', { name: '목록' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '간트' })).toBeInTheDocument();
    expect(screen.getByText(/아직 작업이 없습니다/)).toBeInTheDocument();
  });

  it('"간트" 클릭 → GanttView 렌더, TaskList 의 row 버튼 사라짐', () => {
    const t = makeTask({
      id: 'a',
      title: 'MyTask',
      startDate: '2026-05-01',
      dueDate: '2026-05-31',
    });
    renderWithChakra(<TasksPageClient initialTasks={[t]} />);
    // 초기: TaskList 에 의해 role=button 이름='작업: MyTask' 있음
    expect(screen.getByRole('button', { name: '작업: MyTask' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '간트' }));
    // TaskList 의 row 버튼은 사라짐
    expect(screen.queryByRole('button', { name: '작업: MyTask' })).toBeNull();
    // GanttView 에서 타이틀은 Text 로 표시
    expect(screen.getByText('MyTask')).toBeInTheDocument();
  });

  it('"목록" 클릭 → 다시 TaskList row 버튼 복귀', () => {
    const t = makeTask({ id: 'a', title: 'MyTask' });
    renderWithChakra(<TasksPageClient initialTasks={[t]} />);
    fireEvent.click(screen.getByRole('button', { name: '간트' }));
    fireEvent.click(screen.getByRole('button', { name: '목록' }));
    expect(screen.getByRole('button', { name: '작업: MyTask' })).toBeInTheDocument();
  });

  it('툴바(+ 작업 추가 · CSV 내보내기/불러오기) 는 두 뷰 모두에서 유지', () => {
    renderWithChakra(<TasksPageClient initialTasks={[]} />);
    // 목록 뷰
    expect(screen.getByRole('button', { name: '+ 작업 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV 내보내기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV 불러오기' })).toBeInTheDocument();
    // 간트 뷰로 전환
    fireEvent.click(screen.getByRole('button', { name: '간트' }));
    expect(screen.getByRole('button', { name: '+ 작업 추가' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV 내보내기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CSV 불러오기' })).toBeInTheDocument();
  });
});
