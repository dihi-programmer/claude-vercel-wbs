import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { TasksPageClient } from '@/components/tasks-page-client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.createdAt));
  return <TasksPageClient initialTasks={allTasks} />;
}
