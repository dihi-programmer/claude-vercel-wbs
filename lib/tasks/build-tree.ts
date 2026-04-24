import type { Task } from '@/lib/db/schema';

export type TaskNode = {
  task: Task;
  children: TaskNode[];
  depth: number;
};

export function buildTaskTree(tasks: Task[]): TaskNode[] {
  // 1) createdAt ASC 로 정렬해 형제 순서를 SPEC A-3 로 정규화.
  const sorted = [...tasks].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  // 2) id → 노드 맵.
  const nodeMap = new Map<string, TaskNode>();
  for (const task of sorted) {
    nodeMap.set(task.id, { task, children: [], depth: 0 });
  }

  // 3) 각 노드를 부모의 children 에 붙이거나, orphan / null 이면 root 로.
  const roots: TaskNode[] = [];
  for (const task of sorted) {
    const node = nodeMap.get(task.id)!;
    const parent = task.parentId ? nodeMap.get(task.parentId) : undefined;
    if (parent && parent !== node) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 4) root 부터 재귀로 depth 주입.
  const setDepth = (node: TaskNode, depth: number): void => {
    node.depth = depth;
    for (const child of node.children) setDepth(child, depth + 1);
  };
  for (const root of roots) setDepth(root, 0);

  return roots;
}
