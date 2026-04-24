import { render, type RenderResult } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import type { ReactElement } from 'react';

export function renderWithChakra(ui: ReactElement): RenderResult {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

const BASE_DATE = new Date('2026-04-01T00:00:00Z');

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    parentId: null,
    title: 'Sample Task',
    description: null,
    assignee: null,
    status: 'todo',
    progress: 0,
    startDate: null,
    dueDate: null,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  };
}
