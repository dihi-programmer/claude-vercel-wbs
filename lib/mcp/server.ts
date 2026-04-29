import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const SERVER_INFO = { name: 'wbs-mcp', version: '0.1.0' } as const;

// tool 등록은 묶음 2 에서 추가 (#43). 지금은 묶음 1 GREEN 만 통과시키기 위한 스켈레톤.
export function createMcpServer(): McpServer {
  return new McpServer(SERVER_INFO);
}
