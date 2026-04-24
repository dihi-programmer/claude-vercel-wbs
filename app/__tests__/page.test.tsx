import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import Home from '../page';

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

describe('<Home />', () => {
  it('"WBS 부트스트랩 완료 ✅" heading 을 렌더한다', () => {
    renderWithChakra(<Home />);
    const heading = screen.getByRole('heading', { name: /WBS 부트스트랩 완료/ });
    expect(heading).toBeInTheDocument();
  });

  it('배선된 스택 요약을 본문에 표시한다', () => {
    renderWithChakra(<Home />);
    expect(
      screen.getByText(/Next\.js 14 · Chakra UI v3 · Supabase · Drizzle ORM/),
    ).toBeInTheDocument();
  });
});
