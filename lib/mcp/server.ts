/**
 * WBS Task CRUD 를 노출하는 McpServer (#43).
 *
 * 5 tool: list_tasks / get_task / create_task / update_task / delete_task.
 * DB 접근은 기존 함수 재사용 (`@/app/actions/tasks`, `@/lib/queries/tasks`) — 새 쿼리 없음.
 * 검증/도메인 에러(`TaskValidationError`, `Error`)는 isError 응답으로 매핑.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createTask, deleteTask, updateTask } from '@/app/actions/tasks';
import { getTaskById, listTasks } from '@/lib/queries/tasks';
import type { TaskInput } from '@/lib/validation/task';

const SERVER_INFO = { name: 'wbs-mcp', version: '0.1.0' } as const;

const taskWriteShape = {
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
};

const idShape = { id: z.string().uuid() };

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function ok(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

async function safe(run: () => Promise<unknown>): Promise<ToolResult> {
  try {
    return ok(await run());
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
}

export function createMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO);

  server.registerTool(
    'list_tasks',
    { description: '모든 Task 를 createdAt 오름차순 평면 배열로 반환' },
    async () => ok(await listTasks()),
  );

  server.registerTool(
    'get_task',
    { description: 'id 로 Task 단건 조회', inputSchema: idShape },
    async ({ id }) => {
      const row = await getTaskById(id);
      if (!row) return fail(`Task ${id} 를 찾을 수 없습니다`);
      return ok(row);
    },
  );

  server.registerTool(
    'create_task',
    { description: '새 Task 생성. title 필수, 그 외 선택. parentId 지정 시 하위 작업', inputSchema: taskWriteShape },
    async (input) => safe(() => createTask(input as TaskInput)),
  );

  server.registerTool(
    'update_task',
    {
      description: 'Task 부분 업데이트. progress=100 시 status=done 자동 적용',
      inputSchema: { ...idShape, ...Object.fromEntries(Object.entries(taskWriteShape).map(([k, v]) => [k, v.optional()])) },
    },
    async ({ id, ...patch }) => safe(() => updateTask(id as string, patch as TaskInput)),
  );

  server.registerTool(
    'delete_task',
    { description: 'Task 단건 삭제. 자식은 FK on delete cascade', inputSchema: idShape },
    async ({ id }) => safe(async () => {
      await deleteTask(id);
      return { id, deleted: true };
    }),
  );

  return server;
}
