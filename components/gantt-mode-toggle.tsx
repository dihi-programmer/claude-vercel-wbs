'use client';

import { Button, ButtonGroup } from '@chakra-ui/react';
import type { GanttMode } from '@/lib/gantt/calc';

export type GanttModeToggleProps = {
  value: GanttMode;
  onChange: (mode: GanttMode) => void;
};

const OPTIONS: { mode: GanttMode; label: string }[] = [
  { mode: 'day', label: '일' },
  { mode: 'week', label: '주' },
  { mode: 'month', label: '월' },
];

export function GanttModeToggle({ value, onChange }: GanttModeToggleProps) {
  return (
    <ButtonGroup size="sm" attached>
      {OPTIONS.map(({ mode, label }) => (
        <Button
          key={mode}
          variant={value === mode ? 'solid' : 'outline'}
          aria-pressed={value === mode}
          onClick={() => onChange(mode)}
        >
          {label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
