'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import {
  pxPerDay,
  getDateMarks,
  extendRange,
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
const INITIAL_PAD_DAYS = 90;
const EDGE_THRESHOLD_PX = 200;
const EXTEND_DAYS = 60;
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
  // 초기 범위는 마운트 시 1회만 계산. 이후 onScroll 로 동적 확장.
  // (now 기본값이 매 렌더 새 객체라 useMemo 의존성으로 못 씀 → useState init 사용)
  const [range, setRange] = useState<GanttRangePx>(() =>
    calculateInitialRangePx(tasks, now),
  );
  const ppd = pxPerDay(mode);
  const flat = useMemo(() => flattenTree(buildTaskTree(tasks)), [tasks]);
  const currentYear = startOfDayUtc(now).getUTCFullYear();
  const marks = useMemo(
    () => getDateMarks(range, mode, currentYear),
    [range, mode, currentYear],
  );

  const totalWidthPx = range.totalDays * ppd;
  const todayPx =
    ((startOfDayUtc(now).getTime() - range.epoch.getTime()) / ONE_DAY_MS) * ppd;

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // 마지막 "today 중앙 정렬" 을 마친 ppd · centerNonce 조합. 다음 중 하나가
  // 변경됐을 때만 재정렬: 모드 변경(ppd) / "오늘" 버튼(centerNonce 증가).
  // onScroll 로 인한 range 확장 (epoch 이동) 만으로는 재정렬되지 않도록 가드.
  const lastCenteredPpdRef = useRef<number | null>(null);
  const lastCenteredNonceRef = useRef<number>(0);
  const [centerNonce, setCenterNonce] = useState(0);
  const goToToday = () => setCenterNonce((n) => n + 1);

  // 마운트 시 + 모드 변경 시 + "오늘" 클릭 시 today 를 viewport 중심으로.
  // 컨텐츠 폭이 viewport 보다 좁아 today 를 중앙에 둘 수 없으면
  // 부족한 만큼 양방향으로 자동 확장한 뒤 다음 사이클에서 scrollLeft 설정.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ppdChanged = lastCenteredPpdRef.current !== ppd;
    const nonceChanged = lastCenteredNonceRef.current !== centerNonce;
    if (!ppdChanged && !nonceChanged) return;
    const wanted = todayPx - el.clientWidth / 2;
    const contentWidth = range.totalDays * ppd;
    const overflowLeft = Math.max(0, -wanted);
    const overflowRight = Math.max(0, wanted + el.clientWidth - contentWidth);
    if (overflowLeft > 0 || overflowRight > 0) {
      let next = range;
      if (overflowLeft > 0) {
        const days = Math.ceil(overflowLeft / ppd);
        next = extendRange(next, 'past', days).range;
      }
      if (overflowRight > 0) {
        const days = Math.ceil(overflowRight / ppd);
        next = extendRange(next, 'future', days).range;
      }
      setRange(next);
      // refs 는 그대로 두어 다음 사이클에서 정렬 계속.
      return;
    }
    el.scrollLeft = wanted;
    lastCenteredPpdRef.current = ppd;
    lastCenteredNonceRef.current = centerNonce;
  }, [ppd, todayPx, range, centerNonce]);

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

      {/* 우측: 가로 스크롤 컨테이너 (스크롤바 시각적 숨김) */}
      <Box
        ref={scrollerRef}
        flex="1"
        minW="0"
        overflowX="auto"
        position="relative"
        css={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
        data-mode={mode}
        data-px-per-day={String(ppd)}
        data-epoch-iso={range.epoch.toISOString()}
        data-total-days={String(range.totalDays)}
        onScroll={(e) => {
          const el = e.currentTarget;
          const nearLeft = el.scrollLeft < EDGE_THRESHOLD_PX;
          const nearRight =
            el.scrollWidth - (el.scrollLeft + el.clientWidth) < EDGE_THRESHOLD_PX;
          if (nearLeft) {
            const out = extendRange(range, 'past', EXTEND_DAYS);
            setRange(out.range);
            // 시각적 점프 방지 — prepend 한 만큼 scrollLeft 보정.
            requestAnimationFrame(() => {
              if (scrollerRef.current) {
                scrollerRef.current.scrollLeft += out.deltaDaysAtStart * ppd;
              }
            });
          } else if (nearRight) {
            const out = extendRange(range, 'future', EXTEND_DAYS);
            setRange(out.range);
          }
        }}
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
    {/* 하단 모드 토글 + "오늘" 버튼 */}
    <Flex justify="center" align="center" mt={3} gap={2}>
      <GanttModeToggle value={mode} onChange={setMode} />
      <Button size="sm" variant="outline" onClick={goToToday}>
        오늘
      </Button>
    </Flex>
    </Box>
  );
}
