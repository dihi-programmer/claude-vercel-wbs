import type { Task } from '@/lib/db/schema';

export type ParentRef =
  | { kind: 'existing'; id: string }
  | { kind: 'csvRow'; toAddIndex: number }
  | null;

export type PreviewRow = {
  title: string;
  description: string | null;
  assignee: string | null;
  status: 'todo' | 'doing' | 'done';
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  parent: ParentRef;
};

export type SkipReason = {
  rowIndex: number; // 1-based (헤더 제외 데이터 행 번호)
  reason: string;
};

export type PreviewResult = {
  toAdd: PreviewRow[];
  skipped: SkipReason[];
};

export function previewCsvImport(_text: string, _existing: Task[]): PreviewResult {
  // RED 스텁 — GREEN 단계에서 실제 파서 + 규칙 적용으로 교체.
  throw new Error('not implemented');
}
