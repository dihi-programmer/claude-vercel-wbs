import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy connection — 모듈 import 만으로는 DATABASE_URL 을 읽지 않는다.
// Next 14 의 "collecting page data" 같은 import 전파 단계에서 top-level throw
// 가 빌드를 깨는 것을 방지 (Issue #17).

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleClient | undefined;

function getDb(): DrizzleClient {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL 이 설정되지 않았습니다. `.env.local` 을 확인하세요.');
  }
  const client = postgres(url, { prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}

// Proxy 를 통해 호출처(`import { db }`) 를 유지하면서도 실제 초기화는
// property 접근 시점까지 지연. 함수는 bind 해서 Drizzle builder chain 의
// this 컨텍스트 보존.
export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop) {
    const actual = getDb();
    const value = (actual as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(actual) : value;
  },
});
