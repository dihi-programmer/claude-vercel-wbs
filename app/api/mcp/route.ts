/**
 * MCP Streamable HTTP 엔드포인트 (#43, 사양 2025-11-25).
 *
 * - 환경 게이트: MCP_PUBLIC_ENABLED=1 일 때만 응답. 그 외 모든 메서드 404 (존재 은닉).
 * - 트랜스포트: WebStandardStreamableHTTPServerTransport (stateless, JSON 응답).
 * - 프로토콜 버전: 2025-11-25 우선, 헤더 누락 시 사양대로 2025-03-26 폴백, 미지원은 400.
 *
 * 매 요청마다 McpServer + Transport 새로 생성 (stateless) → Vercel serverless 와 호환.
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';
import { negotiateProtocolVersion } from '@/lib/mcp/protocol-version';

export const dynamic = 'force-dynamic';

function isMcpEnabled() {
  return process.env.MCP_PUBLIC_ENABLED === '1';
}

async function handle(request: Request): Promise<Response> {
  if (!isMcpEnabled()) {
    return new Response(null, { status: 404 });
  }

  const negotiated = negotiateProtocolVersion(request.headers.get('mcp-protocol-version'));
  if (!negotiated.ok) {
    return Response.json(
      {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Unsupported MCP-Protocol-Version' },
        id: null,
      },
      { status: 400 },
    );
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close();
    await server.close();
  }
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handle(request);
}
