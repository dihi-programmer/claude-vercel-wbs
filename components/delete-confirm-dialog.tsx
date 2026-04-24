'use client';

import { Button, Dialog, Portal, Text } from '@chakra-ui/react';

export type DeleteConfirmDialogProps = {
  open: boolean;
  childCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirmDialog({ open, childCount, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  const message =
    childCount > 0
      ? `이 작업과 하위 작업 ${childCount}개가 모두 삭제됩니다. 계속할까요?`
      : '이 작업을 삭제합니다. 계속할까요?';

  return (
    <Dialog.Root
      role="alertdialog"
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onCancel();
      }}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content aria-label="삭제 확인">
            <Dialog.Header>
              <Dialog.Title>삭제 확인</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text>{message}</Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">취소</Button>
              </Dialog.ActionTrigger>
              <Button colorPalette="red" onClick={onConfirm}>
                확인
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
