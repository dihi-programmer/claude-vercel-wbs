import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';

export async function listTasks() {
  return db.select().from(tasks).orderBy(asc(tasks.createdAt));
}

export async function getTaskById(id: string) {
  const [row] = await db.select().from(tasks).where(eq(tasks.id, id));
  return row ?? null;
}
