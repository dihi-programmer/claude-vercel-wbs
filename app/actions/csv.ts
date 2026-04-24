'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { previewCsvImport } from '@/lib/csv/parse';

export type ImportResult = {
  addedCount: number;
  skippedCount: number;
  skipReasons: string[];
};

export async function applyCsvImport(text: string): Promise<ImportResult> {
  // 기존 task 전체를 한 번 읽어와 parent title 매칭용으로 사용.
  const existing = await db.select().from(tasks);
  const preview = previewCsvImport(text, existing);

  const skipReasons: string[] = preview.skipped.map(
    (s) => `행 ${s.rowIndex}: ${s.reason}`,
  );
  let addedCount = 0;
  // toAdd 의 각 index → 삽입된 row id 매핑 (실패한 행은 없음).
  const insertedIdByIndex = new Map<number, string>();

  for (let i = 0; i < preview.toAdd.length; i++) {
    const row = preview.toAdd[i];

    let parentId: string | null = null;
    if (row.parent?.kind === 'existing') {
      parentId = row.parent.id;
    } else if (row.parent?.kind === 'csvRow') {
      parentId = insertedIdByIndex.get(row.parent.toAddIndex) ?? null;
    }

    try {
      const [inserted] = await db
        .insert(tasks)
        .values({
          title: row.title,
          description: row.description,
          assignee: row.assignee,
          status: row.status,
          progress: row.progress,
          startDate: row.startDate,
          dueDate: row.dueDate,
          parentId,
        })
        .returning();
      insertedIdByIndex.set(i, inserted.id);
      addedCount++;
    } catch (err) {
      skipReasons.push(
        `행 (${row.title}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  revalidatePath('/');

  return {
    addedCount,
    skippedCount: preview.toAdd.length + preview.skipped.length - addedCount,
    skipReasons,
  };
}
