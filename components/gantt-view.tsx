'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import {
  pxPerDay,
  getDateMarks,
  type GanttMode,
  type GanttRangePx,
} from '@/lib/gantt/calc';
import { buildTaskTree, type TaskNode } from '@/lib/tasks/build-tree';
import { isOverdue } from '@/lib/overdue/is-overdue';
import { GanttBar } from './gantt-bar';
import { GanttModeToggle } from './gantt-mode-toggle';

export type GanttViewProps = {
  tasks: Task[];
  now?: Date;
};

const LEFT_COL_WIDTH = '240px';
const ROW_HEIGHT = '36px';
const INITIAL_PAD_DAYS = 30;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function flattenTree(nodes: TaskNode[]): TaskNode[] {
  const out: TaskNode[] = [];
  const walk = (n: TaskNode): void => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const n of nodes) walk(n);
  return out;
}

function startOfDayUtc(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * ONE_DAY_MS);
}

function calculateInitialRangePx(tasks: Task[], now: Date): GanttRangePx {
  const today = startOfDayUtc(now);
  const dates: Date[] = [today];
  for (const t of tasks) {
    if (t.startDate) dates.push(new Date(`${t.startDate}T00:00:00Z`));
    if (t.dueDate) dates.push(new Date(`${t.dueDate}T00:00:00Z`));
  }
  const minMs = Math.min(...dates.map((d) => d.getTime()));
  const maxMs = Math.max(...dates.map((d) => d.getTime()));
  const epoch = addDays(new Date(minMs), -INITIAL_PAD_DAYS);
  const end = addDays(new Date(maxMs), INITIAL_PAD_DAYS);
  const totalDays = Math.round((end.getTime() - epoch.getTime()) / ONE_DAY_MS);
  return { epoch, totalDays };
}

export function GanttView({ tasks, now = new Date() }: GanttViewProps) {
  const [mode, setMode] = useState<GanttMode>('week');
  const range = useMemo(
    () => calculateInitialRangePx(tasks, now),
    [tasks, now],
  );
  const ppd = pxPerDay(mode);
  const flat = useMemo(() => flattenTree(buildTaskTree(tasks)), [tasks]);
  const marks = useMemo(() => getDateMarks(range, mode), [range, mode]);

  const totalWidthPx = range.totalDays * ppd;
  const todayPx =
    ((startOfDayUtc(now).getTime() - range.epoch.getTime()) / ONE_DAY_MS) * ppd;

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const prevPpdRef = useRef<number>(ppd);

  // 마운트 시 오늘 중심으로 스크롤 보정.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = todayPx - el.clientWidth / 2;
    // mount 1회만; mode 변경 보정은 아래 effect 에서.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 모드 변경 시: 변경 직전 viewport 중심에 보이던 날짜를 새 모드에서도
  // 동일한 viewport 중심에 두도록 scrollLeft 를 보정.
  useEffect(() => {
    const el = scrollerRef.current;
    const prevPpd = prevPpdRef.current;
    if (!el || prevPpd === ppd) return;
    const prevCenterPx = el.scrollLeft + el.clientWidth / 2;
    const centerDays = prevCenterPx / prevPpd;
    el.scrollLeft = centerDays * ppd - el.clientWidth / 2;
    prevPpdRef.current = ppd;
  }, [ppd]);

  if (tasks.length === 0) {
    return (
      <Box py={10} textAlign="center">
        <Text color="fg.muted">아직 작업이 없습니다. 첫 작업을 추가해 시작하세요</Text>
      </Box>
    );
  }

  return (
    <Box>
    <Flex borderWidth="1px" borderRadius="md" overflow="hidden">
      {/* 좌측: 작업 트리 */}
      <Box width={LEFT_COL_WIDTH} flexShrink={0} borderRightWidth="1px">
        <Box h={ROW_HEIGHT} borderBottomWidth="1px" />
        {flat.map((node) => {
          const indentPx = 12 + node.depth * 16;
          return (
            <Flex
              key={node.task.id}
              h={ROW_HEIGHT}
              alignItems="center"
              pl={`${indentPx}px`}
              pr={2}
              borderBottomWidth="1px"
              gap={2}
              data-depth={node.depth}
              data-indent-px={String(indentPx)}
            >
              <Text fontSize="sm" fontWeight="medium" flex="1" truncate>
                {node.task.title}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {node.task.progress}%
              </Text>
            </Flex>
          );
        })}
      </Box>

      {/* 우측: 가로 스크롤 컨테이너 */}
      <Box
        ref={scrollerRef}
        flex="1"
        minW="0"
        overflowX="auto"
        position="relative"
        data-mode={mode}
        data-px-per-day={String(ppd)}
        data-epoch-iso={range.epoch.toISOString()}
        data-total-days={String(range.totalDays)}
      >
        {/* 스크롤되는 wide inner box */}
        <Box width={`${totalWidthPx}px`} position="relative">
          {/* 헤더 — sticky top */}
          <Box
            h={ROW_HEIGHT}
            borderBottomWidth="1px"
            position="sticky"
            top={0}
            bg="bg"
            zIndex={1}
          >
            {marks.map((m, i) => (
              <Text
                key={i}
                position="absolute"
                left={`${m.leftPx}px`}
                top="50%"
                transform="translate(-50%, -50%)"
                fontSize="xs"
                color="fg.muted"
                whiteSpace="nowrap"
                data-mark-leftpx={String(m.leftPx)}
              >
                {m.label}
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
                epoch={range.epoch}
                pxPerDay={ppd}
                overdue={isOverdue(node.task.dueDate, node.task.status, now)}
              />
            </Box>
          ))}

          {/* 오늘 세로선 overlay */}
          <Box
            data-testid="today-line"
            data-today-px={String(todayPx)}
            position="absolute"
            top={0}
            bottom={0}
            left={`${todayPx}px`}
            width="2px"
            bg="red.500"
            pointerEvents="none"
          />
        </Box>
      </Box>
    </Flex>
    {/* 하단 모드 토글 */}
    <Flex justify="center" mt={3}>
      <GanttModeToggle value={mode} onChange={setMode} />
    </Flex>
    </Box>
  );
}
