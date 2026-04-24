'use client';

import { Box, Button, Stack, Text } from '@chakra-ui/react';

export type DeleteConfirmDialogProps = {
  open: boolean;
  childCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirmDialog({ open, childCount, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!open) return null;

  const message =
    childCount > 0
      ? `이 작업과 하위 작업 ${childCount}개가 모두 삭제됩니다. 계속할까요?`
      : '이 작업을 삭제합니다. 계속할까요?';

  return (
    <Box role="dialog" aria-label="삭제 확인" p={6} borderWidth="1px" borderRadius="md" bg="bg">
      <Text mb={4}>{message}</Text>
      <Stack direction="row" gap={2} justify="flex-end">
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button colorPalette="red" onClick={onConfirm}>확인</Button>
      </Stack>
    </Box>
  );
}
