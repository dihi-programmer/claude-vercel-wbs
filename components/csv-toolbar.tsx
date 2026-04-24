'use client';

import { useRef, useState, useTransition } from 'react';
import { Box, Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react';
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

      {/* CSV 미리보기 Dialog */}
      <Dialog.Root
        open={state.kind === 'preview'}
        onOpenChange={(e) => {
          if (!e.open) close();
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content aria-label="CSV 미리보기">
              <Dialog.Header>
                <Dialog.Title>CSV 미리보기</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {state.kind === 'preview' && (
                  <>
                    <Text>
                      {state.preview.toAdd.length}개 추가 · 제외{' '}
                      {state.preview.skipped.length}건
                    </Text>
                    {state.preview.skipped.length > 0 && (
                      <Box mt={3}>
                        <Text fontWeight="medium" fontSize="sm">
                          제외 사유
                        </Text>
                        <Stack gap={1} mt={1}>
                          {state.preview.skipped.map((s, i) => (
                            <Text key={i} fontSize="sm" color="fg.muted">
                              행 {s.rowIndex}: {s.reason}
                            </Text>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline">취소</Button>
                </Dialog.ActionTrigger>
                <Button
                  onClick={handleApply}
                  disabled={
                    isPending ||
                    (state.kind === 'preview' && state.preview.toAdd.length === 0)
                  }
                >
                  적용
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* 가져오기 결과 Dialog */}
      <Dialog.Root
        open={state.kind === 'done'}
        onOpenChange={(e) => {
          if (!e.open) close();
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content aria-label="CSV 가져오기 결과">
              <Dialog.Header>
                <Dialog.Title>CSV 가져오기 결과</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                {state.kind === 'done' && (
                  <>
                    <Text>
                      {state.result.addedCount}개 추가됨 · {state.result.skippedCount}건 제외
                    </Text>
                    {state.result.skipReasons.length > 0 && (
                      <Stack gap={1} mt={2}>
                        {state.result.skipReasons.map((r, i) => (
                          <Text key={i} fontSize="sm" color="fg.muted">
                            {r}
                          </Text>
                        ))}
                      </Stack>
                    )}
                  </>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button>닫기</Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
}
