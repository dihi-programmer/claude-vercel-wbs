/**
 * RED 묶음 2 — Issue #43: 5개 MCP tool 동작 검증.
 *
 * InMemoryTransport.createLinkedPair() 로 Client ↔ McpServer 직결 (HTTP 우회).
 * 실제 로컬 Postgres 에 연결 — 각 it 전 TRUNCATE.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import postgres from 'postgres';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '@/lib/mcp/server';
import { createTask } from '@/app/actions/tasks';

const connectionString = process.env.DATABASE_URL!;
let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(connectionString, { prepare: false, max: 1, onnotice: () => {} });
});

afterAll(async () => {
  await sql.end();
});

beforeEach(async () => {
  await sql`TRUNCATE tasks RESTART IDENTITY CASCADE`;
});

async function connectPair() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMcpServer();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '0.0.1' });
  await client.connect(clientTransport);
  return { client, server };
}

function parseTextContent(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const text = result.content?.[0]?.text;
  if (!text) throw new Error('no text content in tool result');
  return JSON.parse(text);
}

describe('MCP tools', () => {
  it('list_tasks: createdAt 오름차순 평면 배열', async () => {
    const { client } = await connectPair();
    const a = await createTask({ title: 'A' });
    await new Promise((r) => setTimeout(r, 10));
    const b = await createTask({ title: 'B' });
    await new Promise((r) => setTimeout(r, 10));
    const c = await createTask({ title: 'C' });

    const result = await client.callTool({ name: 'list_tasks', arguments: {} });
    const rows = parseTextContent(result as never) as Array<{ id: string; title: string }>;
    expect(rows.map((r) => r.id)).toEqual([a.id, b.id, c.id]);
    expect(rows.map((r) => r.title)).toEqual(['A', 'B', 'C']);
  });

  it('get_task: 존재하는 id 단건 반환', async () => {
    const { client } = await connectPair();
    const created = await createTask({ title: '킥오프' });
    const result = await client.callTool({ name: 'get_task', arguments: { id: created.id } });
    const row = parseTextContent(result as never) as { id: string; title: string };
    expect(row.id).toBe(created.id);
    expect(row.title).toBe('킥오프');
  });

  it('get_task: 존재하지 않는 id 는 isError', async () => {
    const { client } = await connectPair();
    const result = (await client.callTool({
      name: 'get_task',
      arguments: { id: '00000000-0000-0000-0000-000000000000' },
    })) as { isError?: boolean; content: Array<{ text?: string }> };
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text ?? '').toMatch(/00000000-0000-0000-0000-000000000000/);
  });

  it('create_task: title 만으로 최소 생성', async () => {
    const { client } = await connectPair();
    const result = await client.callTool({
      name: 'create_task',
      arguments: { title: '리서치' },
    });
    const row = parseTextContent(result as never) as { id: string; title: string; status: string };
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.title).toBe('리서치');
    expect(row.status).toBe('todo');
  });

  it('create_task with parentId: 하위 작업 생성', async () => {
    const { client } = await connectPair();
    const parent = await createTask({ title: '부모' });
    const result = await client.callTool({
      name: 'create_task',
      arguments: { title: '자식', parentId: parent.id },
    });
    const row = parseTextContent(result as never) as { parentId: string };
    expect(row.parentId).toBe(parent.id);
  });

  it('create_task: title 빈 문자열은 isError', async () => {
    const { client } = await connectPair();
    const result = (await client.callTool({
      name: 'create_task',
      arguments: { title: '' },
    })) as { isError?: boolean };
    expect(result.isError).toBe(true);
  });

  it('update_task: progress=100 이면 status 자동 done', async () => {
    const { client } = await connectPair();
    const created = await createTask({ title: 'X', progress: 0, status: 'doing' });
    const result = await client.callTool({
      name: 'update_task',
      arguments: { id: created.id, progress: 100 },
    });
    const row = parseTextContent(result as never) as { progress: number; status: string };
    expect(row.progress).toBe(100);
    expect(row.status).toBe('done');
  });

  it('update_task: 시작일>마감일 검증 실패는 isError', async () => {
    const { client } = await connectPair();
    const created = await createTask({ title: 'Y' });
    const result = (await client.callTool({
      name: 'update_task',
      arguments: { id: created.id, startDate: '2026-05-10', dueDate: '2026-05-05' },
    })) as { isError?: boolean };
    expect(result.isError).toBe(true);
  });

  it('delete_task: 부모 삭제 시 자식 cascade', async () => {
    const { client } = await connectPair();
    const parent = await createTask({ title: '부모' });
    const child = await createTask({ title: '자식', parentId: parent.id });

    await client.callTool({ name: 'delete_task', arguments: { id: parent.id } });

    const remaining = await sql`SELECT id FROM tasks WHERE id IN (${parent.id}, ${child.id})`;
    expect(remaining).toHaveLength(0);
  });
});
