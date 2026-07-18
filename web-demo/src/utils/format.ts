// Currency formatting helpers. All amounts in this app are Indian Rupees (INR).

const inr = (decimals: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** Format a number as INR, e.g. formatINR(786898.67) -> "₹7,86,898.67". */
export function formatINR(amount: number, decimals = 2): string {
  return inr(decimals).format(amount);
}

/** Format with an explicit +/- sign, e.g. "+₹450.00" / "-₹75.00". */
export function formatSignedINR(amount: number, positive: boolean, decimals = 2): string {
  const sign = positive ? '+' : '-';
  return `${sign}${formatINR(Math.abs(amount), decimals)}`;
}
