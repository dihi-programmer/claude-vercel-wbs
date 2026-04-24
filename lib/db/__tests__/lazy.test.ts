/**
 * RED: lib/db lazy connection (Issue #17 Stage 1).
 *
 * 모듈 import 만으로는 DATABASE_URL 체크 안 함.
 * 실제 쿼리(= db 객체의 property 접근) 시점에만 검증 + 연결.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIG_DATABASE_URL = process.env.DATABASE_URL;

describe('lib/db lazy connection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (ORIG_DATABASE_URL !== undefined) {
      process.env.DATABASE_URL = ORIG_DATABASE_URL;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it('DATABASE_URL 없이 모듈 import → throw 하지 않음', async () => {
    delete process.env.DATABASE_URL;
    await expect(import('@/lib/db')).resolves.toBeDefined();
  });

  it('db 는 import 후 정의되어 있음 (Proxy 객체)', async () => {
    delete process.env.DATABASE_URL;
    const mod = await import('@/lib/db');
    expect(mod.db).toBeDefined();
    expect(typeof mod.db).toBe('object');
  });

  it('DATABASE_URL 없이 db property 접근 → DATABASE_URL 관련 throw', async () => {
    delete process.env.DATABASE_URL;
    const { db } = await import('@/lib/db');
    expect(() => {
      // property get 이 lazy 로 내부 초기화 트리거
      const _ = (db as unknown as { select: unknown }).select;
      void _;
    }).toThrow(/DATABASE_URL/);
  });

  it('DATABASE_URL 있을 때 db property 접근 → throw 하지 않음', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/test';
    const { db } = await import('@/lib/db');
    expect(() => {
      const _ = (db as unknown as { select: unknown }).select;
      void _;
    }).not.toThrow();
  });
});
