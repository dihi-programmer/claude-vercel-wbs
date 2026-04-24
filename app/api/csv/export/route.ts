import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { tasksToCsv } from '@/lib/csv/serialize';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.createdAt));
  const csv = tasksToCsv(allTasks);

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wbs-${today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
