// Filter state shared by the pages that carry a period and a portfolio filter
// (app-plan.md, "Filter fields"; period-list pattern from `period-selection:`).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { periodOptions } from '../domain/periods';

/** Every YYYY-MM the fixture's allocations cover (2026-04 .. 2026-10), newest first for periodOptions. */
export const DATA_MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

export interface FilterState {
  period: string;            // periodOptions value ('2026-Q3' | 'FY2027' | '2026-09' | 'all')
  periodLabel: string;
  periodRange: { start: Date; end: Date };
  portfolio: string | null;  // portfolio id or null for all
  setPeriod(period: string): void;
  setPortfolioFromChip(): void;
  changed: boolean;
  reset(): void;
}

const Ctx = createContext<FilterState | null>(null);

// Full data by default, so every page opens on the whole book; a quarter or month narrows it.
export const DEFAULT_PERIOD = 'all';

/** A project counts in a period when its dates overlap it (inclusive). */
export function overlaps(start: string, end: string, range: { start: Date; end: Date }): boolean {
  const s = new Date(`${start}T00:00:00`), e = new Date(`${end}T00:00:00`);
  return s <= range.end && e >= range.start;
}

/** The data months (YYYY-MM) inside a period. */
export function monthsIn(range: { start: Date; end: Date }): string[] {
  return DATA_MONTHS.filter((month) => {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1) >= new Date(range.start.getFullYear(), range.start.getMonth(), 1) && new Date(y, m - 1, 1) <= range.end;
  });
}

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const [period, setPeriod] = useState<string>(DEFAULT_PERIOD);

  const options = useMemo(() => periodOptions(DATA_MONTHS), []);
  const current = useMemo(() => options.find((o) => o.value === period) ?? options[0], [options, period]);
  const portfolio = params.get('portfolio');

  const setPeriodValue = useCallback((value: string) => setPeriod(value), []);
  const setPortfolioFromChip = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('portfolio');
    setParams(next, { replace: true });
  }, [params, setParams]);
  const reset = useCallback(() => {
    const next = new URLSearchParams(params);
    next.delete('portfolio');
    setParams(next, { replace: true });
    setPeriod(DEFAULT_PERIOD);
  }, [params, setParams]);

  const value = useMemo<FilterState>(() => ({
    period: current?.value ?? 'all',
    periodLabel: current?.text ?? 'Full data',
    periodRange: { start: current?.start ?? new Date('2026-04-01'), end: current?.end ?? new Date('2026-10-31') },
    portfolio,
    setPeriod: setPeriodValue,
    setPortfolioFromChip,
    changed: (current?.value ?? 'all') !== DEFAULT_PERIOD || portfolio !== null,
    reset,
  }), [current, portfolio, setPeriodValue, setPortfolioFromChip, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters(): FilterState {
  const filters = useContext(Ctx);
  if (!filters) throw new Error('useFilters must be used inside FiltersProvider');
  return filters;
}