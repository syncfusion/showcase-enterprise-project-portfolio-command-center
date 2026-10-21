// Reporting periods derived from the months the data actually has (period-selection.md, workflow 2.18.4).
// Copy to src/domain/periods.ts. The plan's `period-selection:` line names the pattern:
// - range-presets: reportingPresets() for the DateRangePicker's PresetsDirective. A short list: the latest
//   complete quarters, the current fiscal year to date, the latest complete fiscal years and the full range;
//   individual months are picked on the picker's calendar, not listed.
// - period-list: periodOptions() for a grouped, filterable DropDownList of every whole period.
// Every preset is covered by the data. From executive-kpi-analytics: its six hard-coded presets had dates the
// data did not cover (2026-10-10), and a preset for every month (2.18.0) turned the popup into a 36-item
// scrolling list that hid the calendar and cut "All data (Sep 2024 – Sep 2026)" off (2026-10-11).
// Self-contained and erasable TypeScript, so Node's type stripping can run the tests directly.

export type PeriodPreset = { label: string; start: Date; end: Date; group: 'Quarters' | 'Fiscal years' | 'Range' | 'Months' };
/** A DropDownList item: fields={{ value: 'value', text: 'text', groupBy: 'group' }}. */
export type PeriodOption = { value: string; text: string; group: PeriodPreset['group']; start: Date; end: Date };
export type PresetOptions = {
  /** First month of the fiscal year (1 = calendar years); a fiscal year is named by the year it ends in. */
  fiscalYearStartMonth?: number;
  /** How many of the latest complete quarters to list. */
  quarters?: number;
  /** How many of the latest complete fiscal years to list. */
  fiscalYears?: number;
  /** List the current, incomplete fiscal year from its start to the last month of data. */
  yearToDate?: boolean;
  /** Label for the year-to-date preset. */
  yearToDateLabel?: (fiscalYear: number) => string;
  /** Label for the whole range; keep it short: the popup list is narrow. */
  rangeLabel?: string;
  /** Also list every month (off by default: months are picked on the calendar). */
  months?: boolean;
};

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const label = (month: string) => monthFormat.format(new Date(`${month}-01T00:00:00Z`));
const parts = (month: string) => month.split('-').map(Number) as [number, number];
const first = (month: string) => { const [y, m] = parts(month); return new Date(y, m - 1, 1); };
const last = (month: string) => { const [y, m] = parts(month); return new Date(y, m, 0); };
const shift = (month: string, by: number) => { const [y, m] = parts(month); const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

/**
 * months: 'YYYY-MM' values present in the data (any order, repeats allowed).
 * Order: the latest complete quarters (newest first), the fiscal year to date, the latest complete fiscal
 * years, the full range, then (only with `months: true`) every month.
 */
export function reportingPresets(months: string[], {
  fiscalYearStartMonth = 1, quarters = 3, fiscalYears = 1, yearToDate = true,
  yearToDateLabel = (year: number) => `FY ${year}`, rangeLabel = 'Full data', months: listMonths = false,
}: PresetOptions = {}): PeriodPreset[] {
  const available = [...new Set(months)].filter(month => /^\d{4}-\d{2}$/.test(month)).sort();
  if (!available.length) return [];
  const has = new Set(available), oldest = available[0], newest = available[available.length - 1];
  const covered = (from: string, length: number) => Array.from({ length }, (_, i) => shift(from, i)).every(month => has.has(month));
  const presets: PeriodPreset[] = [];
  const newestFirst = [...available].reverse();

  for (const month of newestFirst) {
    const [year, m] = parts(month);
    if (presets.length < quarters && m % 3 === 0 && covered(shift(month, -2), 3))
      presets.push({ label: `Q${m / 3} ${year}`, start: first(shift(month, -2)), end: last(month), group: 'Quarters' });
  }

  const yearEnd = ((fiscalYearStartMonth + 10) % 12) + 1; // the month before the fiscal year starts
  const fiscalYearOf = (month: string) => { const [year, m] = parts(month); return m >= fiscalYearStartMonth && fiscalYearStartMonth > 1 ? year + 1 : year; };
  const startOfYear = (month: string) => { let start = month; while (parts(start)[1] !== fiscalYearStartMonth) start = shift(start, -1); return start; };
  const newestYearStart = startOfYear(newest);
  if (yearToDate && parts(newest)[1] !== yearEnd) {
    const months = available.filter(month => month >= newestYearStart).length;
    if (covered(newestYearStart, months) && has.has(newestYearStart))
      presets.push({ label: yearToDateLabel(fiscalYearOf(newest)), start: first(newestYearStart), end: last(newest), group: 'Fiscal years' });
  }
  let complete = 0;
  for (const month of newestFirst) {
    if (complete < fiscalYears && parts(month)[1] === yearEnd && covered(shift(month, -11), 12)) {
      presets.push({ label: `FY ${fiscalYearOf(month)}`, start: first(shift(month, -11)), end: last(month), group: 'Fiscal years' });
      complete++;
    }
  }

  presets.push({ label: rangeLabel, start: first(oldest), end: last(newest), group: 'Range' });
  if (listMonths) for (const month of newestFirst) presets.push({ label: label(month), start: first(month), end: last(month), group: 'Months' });
  return presets;
}

/**
 * Every whole period the data covers, for the period-list pattern: complete quarters, complete fiscal
 * years and months (each newest first), then the full range. Values are stable keys: `2026-Q3`,
 * `FY2025`, `2026-09`, `all`.
 */
export function periodOptions(months: string[], { fiscalYearStartMonth = 1, rangeLabel = 'Full data' }: Pick<PresetOptions, 'fiscalYearStartMonth' | 'rangeLabel'> = {}): PeriodOption[] {
  const available = [...new Set(months)].filter(month => /^\d{4}-\d{2}$/.test(month)).sort();
  if (!available.length) return [];
  const all = reportingPresets(available, { fiscalYearStartMonth, quarters: available.length, fiscalYears: available.length, yearToDate: false, rangeLabel, months: true });
  const key = (preset: PeriodPreset) => {
    const y = preset.end.getFullYear(), m = String(preset.end.getMonth() + 1).padStart(2, '0');
    if (preset.group === 'Quarters') return `${y}-${preset.label.slice(0, 2)}`;
    if (preset.group === 'Fiscal years') return `FY${preset.label.slice(3)}`;
    if (preset.group === 'Months') return `${y}-${m}`;
    return 'all';
  };
  const order: PeriodPreset['group'][] = ['Quarters', 'Fiscal years', 'Months', 'Range'];
  return order.flatMap(group => all.filter(preset => preset.group === group))
    .map(preset => ({ value: key(preset), text: preset.label, group: preset.group, start: preset.start, end: preset.end }));
}
