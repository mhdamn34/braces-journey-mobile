import { formatCurrency } from '@/lib/format-currency';

describe('formatCurrency', () => {
  it('formats RM with cents and thousands grouping', () => {
    expect(formatCurrency(1250)).toBe('RM 1,250.00');
    expect(formatCurrency(1234567.5)).toBe('RM 1,234,567.50');
  });
  it('formats without cents', () => {
    expect(formatCurrency(8000, { showCents: false })).toBe('RM 8,000');
  });
});
