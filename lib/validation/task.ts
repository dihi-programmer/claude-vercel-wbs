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

export function validateTaskInput(_input: TaskInput): ValidationResult {
  throw new Error('not implemented');
}
