'use client';

import { useMemo, useState } from 'react';
import { Badge, Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import type { TaskStatus } from '@/lib/validation/task';
import { buildTaskTree, type TaskNode } from '@/lib/tasks/build-tree';
import { isOverdue } from '@/lib/overdue/is-overdue';
import { StatusBadge } from './status-badge';

export type TaskListProps = {
  tasks: Task[];
  onRowClick: (task: Task) => void;
  onAddChildClick?: (task: Task) => void;
  onDeleteClick?: (task: Task) => void;
  onStatusCycle?: (task: Task) => void;
  now?: Date;
};

function formatShortDate(iso: string): string {
  // '2026-05-01' → '5/1' (선행 0 제거, 월/일 관용 포맷)
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function formatDateRange(start: string | null, due: string | null): string {
  if (!start && !due) return '—';
  if (!due) return `${formatShortDate(start!)} ~`;
  if (!start) return `~ ${formatShortDate(due)}`;
  return `${formatShortDate(start)} ~ ${formatShortDate(due)}`;
}

function flattenVisibleNodes(nodes: TaskNode[], collapsedIds: Set<string>): TaskNode[] {
  const out: TaskNode[] = [];
  const walk = (n: TaskNode): void => {
    out.push(n);
    if (!collapsedIds.has(n.task.id)) {
      for (const child of n.children) walk(child);
    }
  };
  for (const n of nodes) walk(n);
  return out;
}

export function TaskList({ tasks, onRowClick, onAddChildClick, onDeleteClick, onStatusCycle, now = new Date() }: TaskListProps) {
  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const visibleNodes = useMemo(() => flattenVisibleNodes(tree, collapsedIds), [tree, collapsedIds]);

  const toggleCollapsed = (id: string): void => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (tree.length === 0) {
    return (
      <Box py={10} textAlign="center">
        <Text color="fg.muted">아직 작업이 없습니다. 첫 작업을 추가해 시작하세요</Text>
      </Box>
    );
  }

  return (
    <Stack gap={2}>
      {visibleNodes.map((node) => {
        const { task, depth, children } = node;
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedIds.has(task.id);
        return (
          <Box
            key={task.id}
            role="button"
            aria-label={`작업: ${task.title}`}
            tabIndex={0}
            data-depth={depth}
            onClick={() => onRowClick(task)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(task);
              }
            }}
            cursor="pointer"
            p={3}
            pl={3 + depth * 6}
            borderWidth="1px"
            borderRadius="md"
            _hover={{ bg: 'bg.subtle' }}
          >
            <Flex gap={4} align="center">
              <Box minW={4}>
                {hasChildren && (
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={isCollapsed ? '펼치기' : '접기'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapsed(task.id);
                    }}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </Button>
                )}
              </Box>
              <Text flex="1" fontWeight="medium">{task.title}</Text>
              <Text color="fg.muted" minW="20">{task.assignee ?? '—'}</Text>
              <StatusBadge
                status={task.status as TaskStatus}
                onCycle={onStatusCycle ? () => onStatusCycle(task) : undefined}
              />
              <Text fontSize="sm" minW="12" textAlign="right">{task.progress}%</Text>
              {(() => {
                const overdue = isOverdue(task.dueDate, task.status, now);
                return (
                  <Flex
                    gap={1}
                    align="center"
                    minW="36"
                    justify="flex-end"
                    data-overdue={String(overdue)}
                  >
                    <Text
                      data-testid="task-date-range"
                      fontSize="sm"
                      color={overdue ? 'red.500' : 'fg.muted'}
                      whiteSpace="nowrap"
                    >
                      {formatDateRange(task.startDate, task.dueDate)}
                    </Text>
                    {overdue && (
                      <Badge colorPalette="red" variant="subtle" fontSize="xs">
                        지남
                      </Badge>
                    )}
                  </Flex>
                );
              })()}
              {onAddChildClick && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChildClick(task);
                  }}
                >
                  + 하위
                </Button>
              )}
              {onDeleteClick && (
                <Button
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteClick(task);
                  }}
                >
                  삭제
                </Button>
              )}
            </Flex>
          </Box>
        );
      })}
    </Stack>
  );
}
