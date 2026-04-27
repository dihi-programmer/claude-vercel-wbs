/**
 * RED: GanttModeToggle (#31 Stage 3, SPEC §7 G-2).
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { GanttModeToggle } from '../gantt-mode-toggle';
import { renderWithChakra } from './helpers';

describe('<GanttModeToggle />', () => {
  it('일/주/월 3개 버튼 렌더', () => {
    renderWithChakra(<GanttModeToggle value="week" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '일' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '주' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '월' })).toBeInTheDocument();
  });

  it('value="week" → "주" 버튼만 aria-pressed=true', () => {
    renderWithChakra(<GanttModeToggle value="week" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '일' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByRole('button', { name: '주' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '월' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('value="day" → "일" 만 pressed', () => {
    renderWithChakra(<GanttModeToggle value="day" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '일' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '주' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('"월" 클릭 → onChange("month") 호출', () => {
    const onChange = vi.fn();
    renderWithChakra(<GanttModeToggle value="week" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '월' }));
    expect(onChange).toHaveBeenCalledWith('month');
  });
});
