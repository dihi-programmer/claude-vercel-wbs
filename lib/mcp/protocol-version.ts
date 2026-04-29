// MCP Streamable HTTP 사양:
//   https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
// 헤더가 없으면 사양상 2025-03-26 으로 폴백, 미지원 버전은 400 거절.
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-11-25', '2025-03-26'] as const;
export const FALLBACK_PROTOCOL_VERSION = '2025-03-26';
export const PREFERRED_PROTOCOL_VERSION = '2025-11-25';

export type NegotiationResult =
  | { ok: true; version: (typeof SUPPORTED_PROTOCOL_VERSIONS)[number] }
  | { ok: false };

export function negotiateProtocolVersion(headerValue: string | null): NegotiationResult {
  const candidate = headerValue ?? FALLBACK_PROTOCOL_VERSION;
  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(candidate as (typeof SUPPORTED_PROTOCOL_VERSIONS)[number])) {
    return { ok: false };
  }
  return { ok: true, version: candidate as (typeof SUPPORTED_PROTOCOL_VERSIONS)[number] };
}
