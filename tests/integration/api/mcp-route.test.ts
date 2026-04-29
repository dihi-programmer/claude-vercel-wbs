/**
 * RED 묶음 1 — Issue #43 / SPEC: MCP 서버 (Streamable HTTP, 2025-11-25).
 *
 * 환경 게이트 (MCP_PUBLIC_ENABLED) 와 MCP-Protocol-Version 헤더 협상 검증.
 * 실제 Route Handler 까지 호출하지만 DB 접근은 없음 — initialize 단계만.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ORIGINAL_ENV = { ...process.env };

beforeAll(() => {
  process.env.MCP_PUBLIC_ENABLED = '1';
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

beforeEach(() => {
  vi.resetModules();
});

async function loadRouteWithEnv(env: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import('@/app/api/mcp/route');
}

function buildInitializeBody(protocolVersion: string) {
  return {
    jsonrpc: '2.0' as const,
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: 'test-client', version: '0.0.1' },
    },
  };
}

function buildRequest(body: object, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/mcp — env 게이트', () => {
  it('MCP_PUBLIC_ENABLED 미설정 시 404', async () => {
    const { POST } = await loadRouteWithEnv({ MCP_PUBLIC_ENABLED: undefined });
    const res = await POST(buildRequest(buildInitializeBody('2025-11-25')));
    expect(res.status).toBe(404);
  });

  it('MCP_PUBLIC_ENABLED=0 도 404', async () => {
    const { POST } = await loadRouteWithEnv({ MCP_PUBLIC_ENABLED: '0' });
    const res = await POST(buildRequest(buildInitializeBody('2025-11-25')));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/mcp — MCP-Protocol-Version 헤더 협상', () => {
  it('미지원 버전 헤더는 400', async () => {
    const { POST } = await loadRouteWithEnv({ MCP_PUBLIC_ENABLED: '1' });
    const res = await POST(
      buildRequest(buildInitializeBody('2025-11-25'), { 'mcp-protocol-version': '2099-01-01' }),
    );
    expect(res.status).toBe(400);
  });

  it('헤더 누락 시 폴백(2025-03-26)으로 initialize 정상 응답', async () => {
    const { POST } = await loadRouteWithEnv({ MCP_PUBLIC_ENABLED: '1' });
    const res = await POST(buildRequest(buildInitializeBody('2025-03-26')));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toMatch(/"protocolVersion"/);
  });

  it('2025-11-25 헤더 + 동일 protocolVersion 으로 initialize → 응답에 2025-11-25', async () => {
    const { POST } = await loadRouteWithEnv({ MCP_PUBLIC_ENABLED: '1' });
    const res = await POST(
      buildRequest(buildInitializeBody('2025-11-25'), { 'mcp-protocol-version': '2025-11-25' }),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('2025-11-25');
  });
});
