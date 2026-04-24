'use client';

import { useRef, useState, useTransition } from 'react';
import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';
import type { Task } from '@/lib/db/schema';
import { previewCsvImport, type PreviewResult } from '@/lib/csv/parse';
import { applyCsvImport, type ImportResult } from '@/app/actions/csv';

export type CsvToolbarProps = {
  existingTasks: Task[];
};

type State =
  | { kind: 'idle' }
  | { kind: 'preview'; text: string; preview: PreviewResult }
  | { kind: 'done'; result: ImportResult };

export function CsvToolbar({ existingTasks }: CsvToolbarProps) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const preview = previewCsvImport(text, existingTasks);
    setState({ kind: 'preview', text, preview });
    // 같은 파일을 다시 선택할 수 있도록 input 을 초기화.
    e.target.value = '';
  };

  const handleApply = () => {
    if (state.kind !== 'preview') return;
    const { text } = state;
    startTransition(async () => {
      try {
        const result = await applyCsvImport(text);
        setState({ kind: 'done', result });
      } catch (err) {
        console.error('applyCsvImport failed', err);
      }
    });
  };

  const close = () => setState({ kind: 'idle' });

  return (
    <>
      <Stack direction="row" gap={2}>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = '/api/csv/export';
          }}
        >
          CSV 내보내기
        </Button>
        <Button variant="outline" onClick={openFilePicker}>
          CSV 불러오기
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV 파일 선택"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </Stack>

      {state.kind === 'preview' && (
        <Box
          mt={4}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          bg="bg"
          role="dialog"
          aria-label="CSV 미리보기"
        >
          <Heading size="md" mb={2}>CSV 미리보기</Heading>
          <Text>
            {state.preview.toAdd.length}개 추가 · 제외 {state.preview.skipped.length}건
          </Text>
          {state.preview.skipped.length > 0 && (
            <Box mt={3}>
              <Text fontWeight="medium" fontSize="sm">제외 사유</Text>
              <Stack gap={1} mt={1}>
                {state.preview.skipped.map((s, i) => (
                  <Text key={i} fontSize="sm" color="fg.muted">
                    행 {s.rowIndex}: {s.reason}
                  </Text>
                ))}
              </Stack>
            </Box>
          )}
          <Stack direction="row" gap={2} mt={4} justify="flex-end">
            <Button variant="outline" onClick={close}>취소</Button>
            <Button
              onClick={handleApply}
              disabled={isPending || state.preview.toAdd.length === 0}
            >
              적용
            </Button>
          </Stack>
        </Box>
      )}

      {state.kind === 'done' && (
        <Box
          mt={4}
          p={4}
          borderWidth="1px"
          borderRadius="md"
          bg="bg"
          role="status"
          aria-label="CSV 가져오기 결과"
        >
          <Text>
            {state.result.addedCount}개 추가됨 · {state.result.skippedCount}건 제외
          </Text>
          {state.result.skipReasons.length > 0 && (
            <Stack gap={1} mt={2}>
              {state.result.skipReasons.map((r, i) => (
                <Text key={i} fontSize="sm" color="fg.muted">{r}</Text>
              ))}
            </Stack>
          )}
          <Stack direction="row" gap={2} mt={4} justify="flex-end">
            <Button onClick={close}>닫기</Button>
          </Stack>
        </Box>
      )}
    </>
  );
}
