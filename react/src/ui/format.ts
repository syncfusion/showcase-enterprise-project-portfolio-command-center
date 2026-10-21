// One formatting module for every number and date this showcase shows
// (design-system.md, "Number formatting"; factory/templates/react/format/format.ts).
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const percentFmt = (digits: number) => new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: digits });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

/** Full money with separators: tooltips, Grid cells, sentences. $1,691,064 */
export const money = (value: number): string => usd.format(value);
/** Counts with separators. 12,500 */
export const count = (value: number): string => whole.format(value);
/** A ratio (0.398) as a percentage. 39.8% */
export const percent = (ratio: number, digits = 1): string => percentFmt(digits).format(ratio);
/** A signed ratio, e.g. budget variance. +5.8% / -3.2% */
export const percentSigned = (ratio: number, digits = 1): string => `${ratio > 0 ? '+' : ''}${percentFmt(digits).format(ratio)}`;
/** Money in millions with three significant figures: KPI cards and chart axes. $6.89M, $1.2B, full under a million. */
export function compactMoney(value: number): string {
  const sign = value < 0 ? '-' : '', absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${sign}$${trim(absolute / 1_000_000_000)}B`;
  if (absolute >= 1_000_000) return `${sign}$${trim(absolute / 1_000_000)}M`;
  return usd.format(value);
}
const trim = (n: number) => String(Number(n.toFixed(2)));
/** A YYYY-MM month as "Oct 2026" (UTC so labels never shift). */
export const monthLabel = (month: string): string => monthFmt.format(new Date(`${month}-01T00:00:00Z`));
/** An ISO date as "Oct 16, 2026" (UTC). */
export const isoDate = (iso: string): string => dateFmt.format(new Date(`${iso}T00:00:00Z`));
/** Person-months with one decimal where it matters: 3.5 */
export const personMonths = (value: number): string => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);