/**
 * RED: CsvToolbar (Issue #6 Stage 5, SPEC §6 F-1 · F-2).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { CsvToolbar } from '../csv-toolbar';
import { renderWithChakra } from './helpers';

vi.mock('@/app/actions/csv', () => ({
  applyCsvImport: vi.fn().mockResolvedValue({
    addedCount: 1,
    skippedCount: 0,
    skipReasons: [],
  }),
}));

import { applyCsvImport } from '@/app/actions/csv';

const HEADER = '제목,설명,담당자,상태,진행률,시작일,목표 기한,상위 작업 제목';

describe('<CsvToolbar />', () => {
  it('"CSV 내보내기" 와 "CSV 불러오기" 버튼 렌더', () => {
    renderWithChakra(<CsvToolbar existingTasks={[]} />);
    expect(screen.getByRole('button', { name: /CSV 내보내기/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CSV 불러오기/ })).toBeInTheDocument();
  });

  it('파일 선택 → 미리보기 다이얼로그에 "N개 추가 · 제외 M건" 표시', async () => {
    renderWithChakra(<CsvToolbar existingTasks={[]} />);
    const csv = `${HEADER}\r\nA,,,할 일,0,,,\r\n,,,,0,,,`;
    const file = new File([csv], 'wbs.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('CSV 파일 선택') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/1개 추가/)).toBeInTheDocument();
      expect(screen.getByText(/제외 1건/)).toBeInTheDocument();
    });
  });

  it('미리보기에 제외 사유 리스트 노출', async () => {
    renderWithChakra(<CsvToolbar existingTasks={[]} />);
    const csv = `${HEADER}\r\n,,,,0,,,`;
    const file = new File([csv], 'wbs.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('CSV 파일 선택') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/제목이 비어 있음/)).toBeInTheDocument();
    });
  });

  it('"적용" 클릭 → applyCsvImport 호출 (파일 텍스트를 인자로)', async () => {
    renderWithChakra(<CsvToolbar existingTasks={[]} />);
    const csv = `${HEADER}\r\nA,,,할 일,0,,,`;
    const file = new File([csv], 'wbs.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('CSV 파일 선택') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    const applyBtn = await screen.findByRole('button', { name: /적용/ });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(applyCsvImport).toHaveBeenCalledWith(csv);
    });
  });
});
