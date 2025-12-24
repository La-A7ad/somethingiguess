import { test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Tailwind text', () => {
  render(<App />);
  expect(screen.getByText(/tailwind works/i)).toBeInTheDocument();
});
