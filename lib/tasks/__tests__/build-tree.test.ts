/**
 * RED: buildTaskTree (Issue #4 Stage 1).
 * 근거: SPEC.md §5 E-1/E-2/E-3, §1 A-3 (형제 createdAt ASC).
 */
import { describe, it, expect } from 'vitest';
import { buildTaskTree } from '@/lib/tasks/build-tree';
import type { Task } from '@/lib/db/schema';

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    id: overrides.id,
    parentId: overrides.parentId ?? null,
    title: overrides.title ?? `t-${overrides.id}`,
    description: null,
    assignee: null,
    status: 'todo',
    progress: 0,
    startDate: null,
    dueDate: null,
    createdAt: overrides.createdAt ?? new Date('2026-04-01T00:00:00Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T00:00:00Z'),
  };
}

describe('buildTaskTree', () => {
  it('빈 배열 → 빈 트리', () => {
    expect(buildTaskTree([])).toEqual([]);
  });

  it('모두 최상위(parentId=null) → roots 만, depth=0', () => {
    const t1 = makeTask({ id: 'a' });
    const t2 = makeTask({ id: 'b' });
    const tree = buildTaskTree([t1, t2]);
    expect(tree).toHaveLength(2);
    expect(tree.every((n) => n.depth === 0)).toBe(true);
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it('부모 → 자식 → children 에 포함, depth=1', () => {
    const parent = makeTask({ id: 'p' });
    const child = makeTask({ id: 'c', parentId: 'p' });
    const tree = buildTaskTree([parent, child]);
    expect(tree).toHaveLength(1);
    expect(tree[0].task.id).toBe('p');
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].task.id).toBe('c');
    expect(tree[0].children[0].depth).toBe(1);
  });

  it('손자까지 3단계 재귀 중첩, depth=2', () => {
    const p = makeTask({ id: 'p' });
    const c = makeTask({ id: 'c', parentId: 'p' });
    const g = makeTask({ id: 'g', parentId: 'c' });
    const tree = buildTaskTree([p, c, g]);
    const grandchild = tree[0].children[0].children[0];
    expect(grandchild.task.id).toBe('g');
    expect(grandchild.depth).toBe(2);
  });

  it('형제 순서는 createdAt ASC 유지 (SPEC A-3)', () => {
    const later = makeTask({ id: 'later', createdAt: new Date('2026-05-02T00:00:00Z') });
    const first = makeTask({ id: 'first', createdAt: new Date('2026-05-01T00:00:00Z') });
    const middle = makeTask({ id: 'middle', createdAt: new Date('2026-05-01T12:00:00Z') });
    const tree = buildTaskTree([later, first, middle]);
    expect(tree.map((n) => n.task.id)).toEqual(['first', 'middle', 'later']);
  });

  it('orphan parentId(존재하지 않는 부모 UUID) → root 로 승격 (방어)', () => {
    const orphan = makeTask({ id: 'orphan', parentId: '00000000-0000-0000-0000-000000000000' });
    const tree = buildTaskTree([orphan]);
    expect(tree).toHaveLength(1);
    expect(tree[0].task.id).toBe('orphan');
    expect(tree[0].depth).toBe(0);
  });

  it('입력 순서가 뒤섞여도 정상 트리 (자식 먼저, 부모 나중)', () => {
    const parent = makeTask({ id: 'p', createdAt: new Date('2026-05-01T00:00:00Z') });
    const child = makeTask({ id: 'c', parentId: 'p', createdAt: new Date('2026-05-02T00:00:00Z') });
    const tree = buildTaskTree([child, parent]);
    expect(tree).toHaveLength(1);
    expect(tree[0].task.id).toBe('p');
    expect(tree[0].children[0].task.id).toBe('c');
    expect(tree[0].children[0].depth).toBe(1);
  });
});
