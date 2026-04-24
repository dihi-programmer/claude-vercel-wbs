'use client';

import { useMemo, useState } from 'react';
import { Box, Button, Heading, Input, Stack, Text, Textarea } from '@chakra-ui/react';
import type { TaskInput } from '@/lib/validation/task';
import { validateTaskInput } from '@/lib/validation/task';
import type { Task } from '@/lib/db/schema';

export type TaskFormModalProps = {
  mode: 'create' | 'edit';
  open: boolean;
  initialValue?: Partial<Task>;
  onSubmit: (input: TaskInput) => void | Promise<void>;
  onClose: () => void;
};

type FormValues = {
  title: string;
  description: string;
  assignee: string;
  status: 'todo' | 'doing' | 'done';
  progress: number;
  startDate: string;
  dueDate: string;
};

function initialize(initial?: Partial<Task>): FormValues {
  return {
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    assignee: initial?.assignee ?? '',
    status: (initial?.status as FormValues['status']) ?? 'todo',
    progress: initial?.progress ?? 0,
    startDate: initial?.startDate ?? '',
    dueDate: initial?.dueDate ?? '',
  };
}

function toTaskInput(v: FormValues): TaskInput {
  return {
    title: v.title.trim(),
    description: v.description === '' ? null : v.description,
    assignee: v.assignee === '' ? null : v.assignee,
    status: v.status,
    progress: v.progress,
    startDate: v.startDate === '' ? null : v.startDate,
    dueDate: v.dueDate === '' ? null : v.dueDate,
  };
}

export function TaskFormModal({ mode, open, initialValue, onSubmit, onClose }: TaskFormModalProps) {
  const [values, setValues] = useState<FormValues>(() => initialize(initialValue));

  const validation = useMemo(() => validateTaskInput(toTaskInput(values)), [values]);
  const errors = validation.valid ? ({} as Record<string, string>) : validation.errors;
  const canSubmit = validation.valid;

  if (!open) return null;

  const titleLabel = mode === 'create' ? '새 작업' : '작업 수정';

  return (
    <Box role="dialog" aria-label={titleLabel} p={6} borderWidth="1px" borderRadius="md" bg="bg">
      <Heading size="md" mb={4}>{titleLabel}</Heading>
      <Stack gap={3}>
        <Box>
          <label htmlFor="task-title">제목 *</label>
          <Input
            id="task-title"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
          {errors.title && <Text color="red.500" fontSize="sm">{errors.title}</Text>}
        </Box>

        <Box>
          <label htmlFor="task-description">설명</label>
          <Textarea
            id="task-description"
            value={values.description}
            onChange={(e) => setValues({ ...values, description: e.target.value })}
          />
        </Box>

        <Box>
          <label htmlFor="task-assignee">담당자</label>
          <Input
            id="task-assignee"
            value={values.assignee}
            onChange={(e) => setValues({ ...values, assignee: e.target.value })}
          />
        </Box>

        <Box>
          <label htmlFor="task-status">상태</label>
          <select
            id="task-status"
            value={values.status}
            onChange={(e) =>
              setValues({ ...values, status: e.target.value as FormValues['status'] })
            }
          >
            <option value="todo">할 일</option>
            <option value="doing">진행 중</option>
            <option value="done">완료</option>
          </select>
        </Box>

        <Box>
          <label htmlFor="task-progress">진행률</label>
          <Input
            id="task-progress"
            type="number"
            min={0}
            max={100}
            value={values.progress}
            onChange={(e) => setValues({ ...values, progress: Number(e.target.value) })}
          />
          {errors.progress && <Text color="red.500" fontSize="sm">{errors.progress}</Text>}
        </Box>

        <Box>
          <label htmlFor="task-start-date">시작일</label>
          <Input
            id="task-start-date"
            type="date"
            value={values.startDate}
            onChange={(e) => setValues({ ...values, startDate: e.target.value })}
          />
        </Box>

        <Box>
          <label htmlFor="task-due-date">목표 기한</label>
          <Input
            id="task-due-date"
            type="date"
            value={values.dueDate}
            onChange={(e) => setValues({ ...values, dueDate: e.target.value })}
          />
          {errors.dueDate && <Text color="red.500" fontSize="sm">{errors.dueDate}</Text>}
        </Box>

        <Stack direction="row" gap={2} justify="flex-end">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              if (canSubmit) void onSubmit(toTaskInput(values));
            }}
          >
            저장
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
