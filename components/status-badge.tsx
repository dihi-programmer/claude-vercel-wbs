'use client';

import { Badge, Button } from '@chakra-ui/react';
import type { TaskStatus } from '@/lib/validation/task';

export type StatusBadgeProps = {
  status: TaskStatus;
  onCycle?: () => void;
};

const LABEL: Record<TaskStatus, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
};

const COLOR: Record<TaskStatus, string> = {
  todo: 'gray',
  doing: 'blue',
  done: 'green',
};

export function StatusBadge({ status, onCycle }: StatusBadgeProps) {
  const label = LABEL[status];
  const color = COLOR[status];

  if (onCycle) {
    return (
      <Button
        size="xs"
        variant="subtle"
        colorPalette={color}
        aria-label={`상태: ${label}, 클릭하여 다음 상태로`}
        onClick={(e) => {
          e.stopPropagation();
          onCycle();
        }}
      >
        {label}
      </Button>
    );
  }

  return (
    <Badge colorPalette={color} variant="subtle">
      {label}
    </Badge>
  );
}
