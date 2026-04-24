'use client';

import { useState, useTransition } from 'react';
import { Box, Button, Flex, Heading } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import type { TaskInput, TaskStatus } from '@/lib/validation/task';
import { cycleStatus } from '@/lib/validation/task';
import { createTask, updateTask, deleteTask, getDescendantCount } from '@/app/actions/tasks';
import { TaskList } from './task-list';
import { TaskFormModal } from './task-form-modal';
import { DeleteConfirmDialog } from './delete-confirm-dialog';
import { CsvToolbar } from './csv-toolbar';
import { GanttView } from './gantt-view';

type ModalState =
  | { kind: 'none' }
  | { kind: 'create'; parentId: string | null }
  | { kind: 'edit'; task: Task }
  | { kind: 'delete'; task: Task; childCount: number };

export function TasksPageClient({ initialTasks }: { initialTasks: Task[] }) {
  const [modal, setModal] = useState<ModalState>({ kind: 'none' });
  const [view, setView] = useState<'list' | 'gantt'>('list');
  const [, startTransition] = useTransition();

  const close = () => setModal({ kind: 'none' });

  const handleCreateSubmit = (input: TaskInput) => {
    const parentId = modal.kind === 'create' ? modal.parentId : null;
    startTransition(async () => {
      try {
        await createTask({ ...input, parentId });
        close();
      } catch (err) {
        console.error('createTask failed', err);
      }
    });
  };

  const handleEditSubmit = (input: TaskInput) => {
    if (modal.kind !== 'edit') return;
    const taskId = modal.task.id;
    startTransition(async () => {
      try {
        await updateTask(taskId, input);
        close();
      } catch (err) {
        console.error('updateTask failed', err);
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (modal.kind !== 'delete') return;
    const taskId = modal.task.id;
    startTransition(async () => {
      try {
        await deleteTask(taskId);
        close();
      } catch (err) {
        console.error('deleteTask failed', err);
      }
    });
  };

  const openDelete = async (task: Task) => {
    const childCount = await getDescendantCount(task.id);
    setModal({ kind: 'delete', task, childCount });
  };

  const handleStatusCycle = (task: Task) => {
    const next = cycleStatus(task.status as TaskStatus);
    startTransition(async () => {
      try {
        await updateTask(task.id, { status: next });
      } catch (err) {
        console.error('updateTask (status cycle) failed', err);
      }
    });
  };

  return (
    <Box p={6} maxW="5xl" mx="auto">
      <Flex justify="space-between" align="center" mb={6} gap={4}>
        <Heading size="lg">WBS</Heading>
        <Flex gap={2} align="center">
          <Flex gap={1} align="center">
            <Button
              size="sm"
              variant={view === 'list' ? 'solid' : 'outline'}
              onClick={() => setView('list')}
            >
              목록
            </Button>
            <Button
              size="sm"
              variant={view === 'gantt' ? 'solid' : 'outline'}
              onClick={() => setView('gantt')}
            >
              간트
            </Button>
          </Flex>
          <CsvToolbar existingTasks={initialTasks} />
          <Button onClick={() => setModal({ kind: 'create', parentId: null })}>
            + 작업 추가
          </Button>
        </Flex>
      </Flex>

      {view === 'list' ? (
        <TaskList
          tasks={initialTasks}
          onRowClick={(task) => setModal({ kind: 'edit', task })}
          onAddChildClick={(task) => setModal({ kind: 'create', parentId: task.id })}
          onDeleteClick={(task) => void openDelete(task)}
          onStatusCycle={handleStatusCycle}
        />
      ) : (
        <GanttView tasks={initialTasks} />
      )}

      {/* Dialog 들은 Portal 로 body 에 렌더되므로 Box 래퍼 불필요 (#25). */}
      {modal.kind === 'create' && (
        <TaskFormModal
          mode="create"
          open
          onSubmit={handleCreateSubmit}
          onClose={close}
        />
      )}

      {modal.kind === 'edit' && (
        <TaskFormModal
          key={modal.task.id}
          mode="edit"
          open
          initialValue={modal.task}
          onSubmit={handleEditSubmit}
          onClose={close}
        />
      )}

      {modal.kind === 'delete' && (
        <DeleteConfirmDialog
          open
          childCount={modal.childCount}
          onConfirm={handleDeleteConfirm}
          onCancel={close}
        />
      )}
    </Box>
  );
}
