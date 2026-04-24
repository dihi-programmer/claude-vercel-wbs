export type TaskInput = {
  title?: string;
  description?: string | null;
  assignee?: string | null;
  status?: string;
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
  parentId?: string | null;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: Record<string, string> };

export class TaskValidationError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super(`검증 실패: ${Object.keys(errors).join(', ')}`);
    this.name = 'TaskValidationError';
  }
}

export type TaskStatus = 'todo' | 'doing' | 'done';

const STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
  todo: 'doing',
  doing: 'done',
  done: 'todo',
};

export function cycleStatus(current: TaskStatus): TaskStatus {
  return STATUS_CYCLE[current];
}

// SPEC §3 C-2: progress === 100 이면 status 를 'done' 으로 자동 승격.
// 역방향(단수 status 변화 → progress 조정)은 일부러 안 함 — 사용자가 직접 조정.
export function applyProgressCompletionRule(input: TaskInput): TaskInput {
  if (input.progress === 100 && input.status !== 'done') {
    return { ...input, status: 'done' };
  }
  return input;
}

const ALLOWED_STATUS = ['todo', 'doing', 'done'] as const;

export function validateTaskInput(input: TaskInput): ValidationResult {
  const errors: Record<string, string> = {};

  if ((input.title ?? '').trim().length === 0) {
    errors.title = '제목은 필수입니다';
  }

  if (input.progress !== undefined && (input.progress < 0 || input.progress > 100)) {
    errors.progress = '진행률은 0~100 사이여야 합니다';
  }

  if (input.status !== undefined && !ALLOWED_STATUS.includes(input.status as (typeof ALLOWED_STATUS)[number])) {
    errors.status = "상태는 'todo', 'doing', 'done' 중 하나여야 합니다";
  }

  if (input.startDate && input.dueDate && input.startDate > input.dueDate) {
    errors.dueDate = '목표 기한은 시작일과 같거나 이후여야 합니다';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }
  return { valid: true };
}
