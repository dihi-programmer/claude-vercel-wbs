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
