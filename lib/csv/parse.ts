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
  rowIndex: number; // 1-based (헤더 제외)
  reason: string;
};

export type PreviewResult = {
  toAdd: PreviewRow[];
  skipped: SkipReason[];
};

// SPEC §6 F-2 에 따라 상태 라벨을 관대하게 매핑 — 한글 라벨 + 영문 코드 모두 허용.
const LABEL_TO_STATUS: Record<string, PreviewRow['status']> = {
  '할 일': 'todo',
  '진행 중': 'doing',
  완료: 'done',
  todo: 'todo',
  doing: 'doing',
  done: 'done',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// RFC 4180 파서 — quoted 필드 내부의 쉼표·CR·LF·"" 이스케이프 지원.
function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
      } else {
        field += c;
        i++;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
        i++;
      } else if (c === ',') {
        row.push(field);
        field = '';
        i++;
      } else if (c === '\r') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        if (text[i + 1] === '\n') i += 2;
        else i++;
      } else if (c === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else {
        field += c;
        i++;
      }
    }
  }
  // 마지막 필드 flush (trailing newline 이 없는 경우)
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeStatus(raw: string): PreviewRow['status'] {
  return LABEL_TO_STATUS[raw.trim()] ?? 'todo';
}

function normalizeDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  return ISO_DATE.test(trimmed) ? trimmed : null;
}

function normalizeNullableString(raw: string): string | null {
  return raw === '' ? null : raw;
}

function normalizeProgress(raw: string): number {
  const n = Number(raw.trim());
  if (!Number.isFinite(n)) return 0;
  return n;
}

export function previewCsvImport(text: string, existing: Task[]): PreviewResult {
  const rows = parseRows(text);
  if (rows.length === 0) return { toAdd: [], skipped: [] };

  // rows[0] 는 헤더로 가정. 데이터 행은 rows[1..].
  const dataRows = rows.slice(1);

  const existingByTitle = new Map<string, Task>();
  for (const t of existing) {
    if (!existingByTitle.has(t.title)) existingByTitle.set(t.title, t);
  }

  const toAdd: PreviewRow[] = [];
  const skipped: SkipReason[] = [];
  const addedIndexByTitle = new Map<string, number>();

  dataRows.forEach((row, idx) => {
    const rowIndex = idx + 1; // 1-based
    // 8 열 미만이면 뒤를 빈 문자열로 채움
    const col = (i: number): string => (row[i] ?? '').toString();
    const title = col(0).trim();
    if (title === '') {
      skipped.push({ rowIndex, reason: '제목이 비어 있음' });
      return;
    }

    const parentTitle = col(7).trim();
    let parent: ParentRef = null;
    if (parentTitle !== '') {
      // 우선순위: (1) CSV 내 이전 행 (2) 기존 DB task.
      const csvIdx = addedIndexByTitle.get(parentTitle);
      if (csvIdx !== undefined) {
        parent = { kind: 'csvRow', toAddIndex: csvIdx };
      } else {
        const ex = existingByTitle.get(parentTitle);
        if (ex) parent = { kind: 'existing', id: ex.id };
      }
    }

    const preview: PreviewRow = {
      title,
      description: normalizeNullableString(col(1)),
      assignee: normalizeNullableString(col(2)),
      status: normalizeStatus(col(3)),
      progress: normalizeProgress(col(4)),
      startDate: normalizeDate(col(5)),
      dueDate: normalizeDate(col(6)),
      parent,
    };

    const newIndex = toAdd.length;
    toAdd.push(preview);
    // 동명 부모 → "먼저 매칭" 원칙: 이미 등록된 제목은 덮어쓰지 않음.
    if (!addedIndexByTitle.has(title)) addedIndexByTitle.set(title, newIndex);
  });

  return { toAdd, skipped };
}
