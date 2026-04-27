'use client';

import { Box, Text } from '@chakra-ui/react';
import { calculateBarPx } from '@/lib/gantt/calc';

export type GanttBarProps = {
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  epoch: Date;
  pxPerDay: number;
  overdue?: boolean;
};

export function GanttBar({
  startDate,
  dueDate,
  progress,
  epoch,
  pxPerDay,
  overdue = false,
}: GanttBarProps) {
  // SPEC §7 G-2: 시작일/목표 기한 중 하나라도 비면 막대 없이 "— 일정 없음 —" 표기.
  // CSS sticky 로 가로 스크롤해도 viewport 중앙에 고정 (#39).
  if (!startDate || !dueDate) {
    return (
      <Box
        position="sticky"
        left="50%"
        h="100%"
        display="inline-flex"
        alignItems="center"
        whiteSpace="nowrap"
        style={{ transform: 'translateX(-50%)' }}
        data-testid="gantt-empty"
        data-sticky-center="true"
      >
        <Text fontSize="sm" color="fg.muted">
          — 일정 없음 —
        </Text>
      </Box>
    );
  }

  const bar = calculateBarPx(startDate, dueDate, progress, epoch, pxPerDay);

  return (
    <Box
      position="absolute"
      top="50%"
      transform="translateY(-50%)"
      left={`${bar.leftPx}px`}
      width={`${bar.widthPx}px`}
      height="20px"
      borderRadius="sm"
      bg="blue.100"
      overflow="hidden"
      // SPEC §8 H-2 간트: overdue 시 빨강 테두리.
      borderWidth={overdue ? '2px' : '0'}
      borderColor={overdue ? 'red.500' : 'transparent'}
      data-left-px={String(bar.leftPx)}
      data-width-px={String(bar.widthPx)}
      data-progress-pct={String(bar.progressPct)}
      data-overdue={String(overdue)}
    >
      {/* 진행률 채움 — SPEC §7 G-2 "진행률만큼 진한 색, 나머지는 옅은 색" */}
      <Box
        width={`${bar.progressPct}%`}
        height="100%"
        bg="blue.500"
      />
    </Box>
  );
}
