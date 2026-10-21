// The shared filter bar row: the period preset DropDownList (period-list pattern) and the
// portfolio chip set from another control (scorecard portfolio link, dependency node).
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { usePortfolioStore } from '../app/PortfolioStore';
import { FilterBar, FilterField } from './components/FilterBar';
import { DATA_MONTHS, useFilters } from './filters';
import { periodOptions } from '../domain/periods';
import { isoDate } from './format';

const OPTIONS = periodOptions(DATA_MONTHS);

export function SharedFilterBar({ note }: { note?: string }) {
  const { dataset } = usePortfolioStore();
  const { period, setPeriod, periodLabel, portfolio, setPortfolioFromChip, changed, reset } = useFilters();
  const portfolioName = portfolio ? dataset?.portfolios.find((po) => po.id === portfolio)?.name : undefined;

  return (
    <FilterBar
      title="Reporting scope"
      note={note ?? 'Applies to the period-driven views on this page'}
      canReset={changed}
      onReset={reset}
      chips={portfolioName ? [{ label: 'Portfolio', value: portfolioName, onRemove: setPortfolioFromChip }] : []}
    >
      <FilterField label="Reporting period" size="period" htmlFor="eppcc-period">
        <DropDownListComponent
          id="eppcc-period"
          dataSource={OPTIONS}
          fields={{ text: 'text', value: 'value', groupBy: 'group' }}
          value={period}
          change={(args) => { if (args.value) setPeriod(String(args.value)); }}
          popupWidth="240px"
        />
      </FilterField>
      <span className="filter-hint" aria-hidden="true">{periodLabel} · demo-today {isoDate('2026-10-16')}</span>
    </FilterBar>
  );
}