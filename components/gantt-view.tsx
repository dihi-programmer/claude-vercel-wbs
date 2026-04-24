'use client';

import { Box, Flex, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import { calculateRange, getWeekMarks, type GanttRange } from '@/lib/gantt/calc';
import { buildTaskTree, type TaskNode } from '@/lib/tasks/build-tree';
import { GanttBar } from './gantt-bar';

export type GanttViewProps = {
  tasks: Task[];
  now?: Date;
};

const LEFT_COL_WIDTH = '240px';
const ROW_HEIGHT = '36px';

function flattenTree(nodes: TaskNode[]): TaskNode[] {
  const out: TaskNode[] = [];
  const walk = (n: TaskNode): void => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const n of nodes) walk(n);
  return out;
}

function formatWeekLabel(d: Date): string {
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

function pctOfRange(d: Date, range: GanttRange): number {
  const total = range.end.getTime() - range.start.getTime();
  return ((d.getTime() - range.start.getTime()) / total) * 100;
}

export function GanttView({ tasks, now = new Date() }: GanttViewProps) {
  if (tasks.length === 0) {
    return (
      <Box py={10} textAlign="center">
        <Text color="fg.muted">아직 작업이 없습니다. 첫 작업을 추가해 시작하세요</Text>
      </Box>
    );
  }

  const range = calculateRange(tasks, now);
  const flat = flattenTree(buildTaskTree(tasks));
  const weekMarks = getWeekMarks(range);

  const nowMs = now.getTime();
  const todayInRange = nowMs >= range.start.getTime() && nowMs <= range.end.getTime();
  const todayPct = todayInRange ? pctOfRange(now, range) : null;

  return (
    <Flex borderWidth="1px" borderRadius="md" overflow="hidden">
      {/* 좌측: 작업 트리 */}
      <Box width={LEFT_COL_WIDTH} flexShrink={0} borderRightWidth="1px">
        {/* 헤더 높이 맞춤 */}
        <Box h={ROW_HEIGHT} borderBottomWidth="1px" />
        {flat.map((node) => (
          <Flex
            key={node.task.id}
            h={ROW_HEIGHT}
            alignItems="center"
            pl={3 + node.depth * 4}
            pr={2}
            borderBottomWidth="1px"
            gap={2}
            data-depth={node.depth}
          >
            <Text fontSize="sm" fontWeight="medium" flex="1" truncate>
              {node.task.title}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {node.task.progress}%
            </Text>
          </Flex>
        ))}
      </Box>

      {/* 우측: 날짜 그리드 + 막대 + 오늘선 */}
      <Box flex="1" position="relative" minW="0">
        {/* 주 단위 눈금 헤더 */}
        <Box h={ROW_HEIGHT} borderBottomWidth="1px" position="relative">
          {weekMarks.map((d, i) => (
            <Text
              key={i}
              position="absolute"
              left={`${pctOfRange(d, range)}%`}
              top="50%"
              transform="translate(-50%, -50%)"
              fontSize="xs"
              color="fg.muted"
              whiteSpace="nowrap"
            >
              {formatWeekLabel(d)}
            </Text>
          ))}
        </Box>

        {/* 각 작업 행 */}
        {flat.map((node) => (
          <Box
            key={node.task.id}
            h={ROW_HEIGHT}
            borderBottomWidth="1px"
            position="relative"
          >
            <GanttBar
              startDate={node.task.startDate}
              dueDate={node.task.dueDate}
              progress={node.task.progress}
              range={range}
            />
          </Box>
        ))}

        {/* 오늘 세로선 overlay */}
        {todayPct !== null && (
          <Box
            data-testid="today-line"
            position="absolute"
            top={0}
            bottom={0}
            left={`${todayPct}%`}
            width="2px"
            bg="red.500"
            pointerEvents="none"
          />
        )}
      </Box>
    </Flex>
  );
}
