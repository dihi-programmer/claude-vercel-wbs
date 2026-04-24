import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL 이 설정되지 않았습니다. `.env.local` 을 확인하세요.');
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
