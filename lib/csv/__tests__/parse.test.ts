/**
 * RED: previewCsvImport (Issue #6 Stage 2, SPEC §6 F-2).
 */
import { describe, it, expect } from 'vitest';
import { previewCsvImport } from '@/lib/csv/parse';
import type { Task } from '@/lib/db/schema';

const HEADER = '제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목';

function makeTask(overrides: Partial<Task> & { id: string; title: string }): Task {
  return {
    id: overrides.id,
    parentId: overrides.parentId ?? null,
    title: overrides.title,
    description: overrides.description ?? null,
    assignee: overrides.assignee ?? null,
    status: overrides.status ?? 'todo',
    progress: overrides.progress ?? 0,
    startDate: overrides.startDate ?? null,
    dueDate: overrides.dueDate ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-04-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T00:00:00Z'),
  };
}

describe('previewCsvImport', () => {
  it('헤더만 있는 CSV → toAdd=[], skipped=[]', () => {
    expect(previewCsvImport(HEADER, [])).toEqual({ toAdd: [], skipped: [] });
  });

  it('정상 행 → 열 순서에 맞게 TaskInput 매핑', () => {
    const csv = `${HEADER}\r\n킥오프,첫 미팅,김PM,진행 중,30,2026-05-01,2026-05-03,`;
    const result = previewCsvImport(csv, []);
    expect(result.skipped).toHaveLength(0);
    expect(result.toAdd).toHaveLength(1);
    expect(result.toAdd[0]).toMatchObject({
      title: '킥오프',
      description: '첫 미팅',
      assignee: '김PM',
      status: 'doing',
      progress: 30,
      startDate: '2026-05-01',
      dueDate: '2026-05-03',
      parent: null,
    });
  });

  it('제목이 비어 있음 → skipped (reason 포함)', () => {
    const csv = `${HEADER}\r\n,설명만,담당자,할 일,0,,,`;
    const result = previewCsvImport(csv, []);
    expect(result.toAdd).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toMatch(/제목/);
  });

  it('상태가 허용 외 값 → status=todo fallback, row 는 toAdd 포함', () => {
    const csv = `${HEADER}\r\nX,,,잘못된상태,0,,,`;
    const result = previewCsvImport(csv, []);
    expect(result.skipped).toHaveLength(0);
    expect(result.toAdd).toHaveLength(1);
    expect(result.toAdd[0].status).toBe('todo');
  });

  it('시작일 형식 불량 → startDate=null, row 는 toAdd 포함', () => {
    const csv = `${HEADER}\r\nX,,,할 일,0,2026/05/01,,`;
    const result = previewCsvImport(csv, []);
    expect(result.skipped).toHaveLength(0);
    expect(result.toAdd).toHaveLength(1);
    expect(result.toAdd[0].startDate).toBeNull();
  });

  it('목표 기한 형식 불량 → dueDate=null', () => {
    const csv = `${HEADER}\r\nX,,,할 일,0,,not-a-date,`;
    const result = previewCsvImport(csv, []);
    expect(result.toAdd[0].dueDate).toBeNull();
  });

  it('상위 작업 제목이 CSV 내 이전 행과 일치 → parent.kind="csvRow"', () => {
    const csv = `${HEADER}\r\nParent,,,할 일,0,,,\r\nChild,,,할 일,0,,,Parent`;
    const result = previewCsvImport(csv, []);
    expect(result.toAdd).toHaveLength(2);
    expect(result.toAdd[1].parent).toEqual({ kind: 'csvRow', toAddIndex: 0 });
  });

  it('상위 작업 제목이 기존 DB task 와 일치 → parent.kind="existing"', () => {
    const csv = `${HEADER}\r\nChild,,,할 일,0,,,ExistingParent`;
    const existing = [makeTask({ id: 'parent-id', title: 'ExistingParent' })];
    const result = previewCsvImport(csv, existing);
    expect(result.toAdd[0].parent).toEqual({ kind: 'existing', id: 'parent-id' });
  });

  it('상위 작업 제목이 어느 쪽에도 매칭 안 됨 → parent=null', () => {
    const csv = `${HEADER}\r\nOrphan,,,할 일,0,,,Nonexistent`;
    const result = previewCsvImport(csv, []);
    expect(result.toAdd[0].parent).toBeNull();
  });

  it('RFC 4180: quoted 필드 안의 쉼표·개행·이스케이프 따옴표 파싱', () => {
    // 제목: 포함, 쉼표 · 설명: 그는 "안녕"\n라고\r\n나머지는 기본값
    const csv = `${HEADER}\r\n"포함, 쉼표","그는 ""안녕""\n라고",,할 일,0,,,`;
    const result = previewCsvImport(csv, []);
    expect(result.toAdd).toHaveLength(1);
    expect(result.toAdd[0].title).toBe('포함, 쉼표');
    expect(result.toAdd[0].description).toBe('그는 "안녕"\n라고');
  });
});
