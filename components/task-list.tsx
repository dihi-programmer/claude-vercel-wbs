'use client';

import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';

export type TaskListProps = {
  tasks: Task[];
  onRowClick: (task: Task) => void;
  onAddChildClick?: (task: Task) => void;
  onDeleteClick?: (task: Task) => void;
};

export function TaskList({ tasks, onRowClick, onAddChildClick, onDeleteClick }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Box py={10} textAlign="center">
        <Text color="fg.muted">아직 작업이 없습니다. 첫 작업을 추가해 시작하세요</Text>
      </Box>
    );
  }

  return (
    <Stack gap={2}>
      {tasks.map((task) => (
        <Box
          key={task.id}
          role="button"
          aria-label={`작업: ${task.title}`}
          tabIndex={0}
          onClick={() => onRowClick(task)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(task);
            }
          }}
          cursor="pointer"
          p={3}
          borderWidth="1px"
          borderRadius="md"
          _hover={{ bg: 'bg.subtle' }}
        >
          <Flex gap={4} align="center">
            <Text flex="1" fontWeight="medium">{task.title}</Text>
            <Text color="fg.muted" minW="20">{task.assignee ?? '—'}</Text>
            <Text fontSize="sm">{task.status}</Text>
            <Text fontSize="sm" minW="12" textAlign="right">{task.progress}%</Text>
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
      ))}
    </Stack>
  );
}
