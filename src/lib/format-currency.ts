type CurrencyOptions = {
  showCents?: boolean;
};

export function formatCurrency(amount: number, options: CurrencyOptions = {}) {
  const showCents = options.showCents ?? true;
  const fixedAmount = amount.toFixed(showCents ? 2 : 0);
  const [wholeAmount, cents] = fixedAmount.split('.');
  const groupedAmount = wholeAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `RM ${groupedAmount}${cents ? `.${cents}` : ''}`;
}
