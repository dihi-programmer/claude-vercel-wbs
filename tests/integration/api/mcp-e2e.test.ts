/**
 * e2e — Issue #43: MCP Streamable HTTP 엔드포인트 왕복.
 *
 * Route Handler 의 POST 를 직접 호출 (HTTP 서버 기동 없이) 하면서, JSON-RPC
 * envelope 으로 initialize → tools/list → tools/call 의 전체 흐름을 검증.
 * MCP-Protocol-Version 협상도 함께 회귀.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import postgres from 'postgres';

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.MCP_PUBLIC_ENABLED = '1';
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

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

const PROTOCOL = '2025-11-25';

async function postJson(body: object) {
  const { POST } = await import('@/app/api/mcp/route');
  const req = new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': PROTOCOL,
    },
    body: JSON.stringify(body),
  });
  const res = await POST(req);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('MCP e2e — Route Handler 까지 왕복', () => {
  it('initialize → tools/list → 5개 tool 노출, protocolVersion=2025-11-25', async () => {
    const init = await postJson({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: PROTOCOL,
        capabilities: {},
        clientInfo: { name: 'e2e', version: '0.0.1' },
      },
    });
    expect(init.status).toBe(200);
    expect(init.body.result.protocolVersion).toBe(PROTOCOL);

    const list = await postJson({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(list.status).toBe(200);
    const names = (list.body.result.tools as Array<{ name: string }>).map((t) => t.name).sort();
    expect(names).toEqual(['create_task', 'delete_task', 'get_task', 'list_tasks', 'update_task']);
  });

  it('tools/call create_task → list_tasks 결과에 새 row 포함', async () => {
    const created = await postJson({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'create_task', arguments: { title: 'e2e task' } },
    });
    expect(created.status).toBe(200);
    const createdRow = JSON.parse(created.body.result.content[0].text);
    expect(createdRow.title).toBe('e2e task');

    const listed = await postJson({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'list_tasks', arguments: {} },
    });
    const rows = JSON.parse(listed.body.result.content[0].text) as Array<{ id: string }>;
    expect(rows.map((r) => r.id)).toContain(createdRow.id);
  });
});
