'use client';

import { useMemo, useState } from 'react';
import { Badge, Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import type { TaskStatus } from '@/lib/validation/task';
import { buildTaskTree, flattenVisibleNodes } from '@/lib/tasks/build-tree';
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

function formatShortDate(iso: string, currentYear: number): string {
  // 올해 → 'M/D', 다른 해 → 'YY/M/D' (간트 라벨과 동일 규칙)
  const d = new Date(`${iso}T00:00:00Z`);
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const y = d.getUTCFullYear();
  if (y === currentYear) return `${m}/${day}`;
  const yy = String(y % 100).padStart(2, '0');
  return `${yy}/${m}/${day}`;
}

function formatDateRange(start: string | null, due: string | null, currentYear: number): string {
  if (!start && !due) return '—';
  if (!due) return `${formatShortDate(start!, currentYear)} ~`;
  if (!start) return `~ ${formatShortDate(due, currentYear)}`;
  return `${formatShortDate(start, currentYear)} ~ ${formatShortDate(due, currentYear)}`;
}

export function TaskList({ tasks, onRowClick, onAddChildClick, onDeleteClick, onStatusCycle, now = new Date() }: TaskListProps) {
  const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const visibleNodes = useMemo(() => flattenVisibleNodes(tree, collapsedIds), [tree, collapsedIds]);
  const currentYear = now.getUTCFullYear();

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
      {/* 컬럼 헤더 (SPEC §1 A-4) — 작업 행과 동일 컬럼 폭/구조 */}
      <Box
        data-testid="task-list-header"
        p={3}
        pl="12px"
        borderTopWidth="1px"
        borderBottomWidth="1px"
        color="fg.muted"
        fontWeight="medium"
        fontSize="sm"
      >
        <Flex gap={4} align="center">
          <Box w={7} flexShrink={0} />
          <Text flex="1">제목</Text>
          <Text minW="20">담당자</Text>
          <Box minW="20" display="flex" justifyContent="center">
            <Text>상태</Text>
          </Box>
          <Text minW="12" textAlign="right">진행률</Text>
          <Flex minW="36" justify="flex-end">
            <Text>기간</Text>
          </Flex>
          {/* 행의 + 하위 / 삭제 버튼 자리 — 헤더는 같은 폭만 차지하고 시각적 비표시 */}
          {onAddChildClick && (
            <Button size="xs" variant="ghost" visibility="hidden" aria-hidden tabIndex={-1}>
              + 하위
            </Button>
          )}
          {onDeleteClick && (
            <Button size="xs" variant="ghost" visibility="hidden" aria-hidden tabIndex={-1}>
              삭제
            </Button>
          )}
        </Flex>
      </Box>
      {visibleNodes.map((node) => {
        const { task, depth, children } = node;
        const hasChildren = children.length > 0;
        const isCollapsed = collapsedIds.has(task.id);
        // Chakra v3 spacing scale 은 12,14,16... 으로 점프 — 임의 정수(15,21)는
        // 토큰 미스로 raw px fallback 됨. 직접 px 단위로 계산해 일관 증분 보장.
        const indentPx = 12 + depth * 24;
        return (
          <Box
            key={task.id}
            role="button"
            aria-label={`작업: ${task.title}`}
            tabIndex={0}
            data-depth={depth}
            data-indent-px={String(indentPx)}
            onClick={() => onRowClick(task)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick(task);
              }
            }}
            cursor="pointer"
            p={3}
            pl={`${indentPx}px`}
            borderWidth="1px"
            borderRadius="md"
            _hover={{ bg: 'bg.subtle' }}
          >
            <Flex gap={4} align="center">
              <Box
                w={7}
                flexShrink={0}
                display="flex"
                alignItems="center"
                justifyContent="center"
                data-testid="task-toggle-slot"
                data-slot-width="28"
              >
                {hasChildren && (
                  <Button
                    size="xs"
                    variant="ghost"
                    minW={0}
                    px={1}
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
              <Box minW="20" display="flex" justifyContent="center">
                <StatusBadge
                  status={task.status as TaskStatus}
                  onCycle={onStatusCycle ? () => onStatusCycle(task) : undefined}
                />
              </Box>
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
                      {formatDateRange(task.startDate, task.dueDate, currentYear)}
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
