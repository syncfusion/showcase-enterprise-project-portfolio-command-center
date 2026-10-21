import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject as GridInject, Sort, Page } from '@syncfusion/ej2-react-grids';
import { ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject as ChartInject, ColumnSeries, LineSeries, Legend, Tooltip, Category} from '@syncfusion/ej2-react-charts';
import { Gauge, AlertTriangle, TrendingUp, CalendarDays } from 'lucide-react';
import { chartTheme, palette } from '../../../styles/palette';
import { useTheme } from '../../theme';
import { personMonths, percent } from '../../format';
import { monthLabel } from '../../format';
import { usePortfolioStore } from '../../../app/PortfolioStore';
import { ErrorState } from '../../components/States';
import { KpiCard } from '../../components/KpiCard';
import { SharedFilterBar } from '../../SharedFilterBar';
import { DATA_MONTHS, monthsIn, useFilters } from '../../filters';

/** Resource Capacity (T-09 rev 3): KPI strip + role allocation vs capacity + monthly
 *  utilization with a 100% strip line + resource grid with over-allocation second cue. */
export function CapacityPage() {
  const { load, dataset } = usePortfolioStore();
  const { theme } = useTheme();
  const [params] = useSearchParams();
  const roleFilter = params.get('role');
  useEffect(() => { document.title = 'Resource Capacity · Portfolio Command Center'; }, []);

  // One period model: the shared Reporting period picks the months (allocations cover Apr–Oct 2026).
  const { period, periodRange } = useFilters();
  const months = useMemo(() => {
    const inRange = period === 'all' ? DATA_MONTHS : monthsIn(periodRange);
    return inRange.length ? inRange : DATA_MONTHS.slice(-1);
  }, [period, periodRange]);

  const resources = useMemo(() => {
    if (!dataset) return [];
    return roleFilter ? dataset.resources.filter((r) => r.role === roleFilter) : dataset.resources;
  }, [dataset, roleFilter]);

  // Per-resource window totals (the grid rows).
  const rows = useMemo(() => {
    if (!dataset) return [];
    return resources.map((r) => {
      const allocated = months.reduce((sum, month) => {
        const m = dataset.allocations.filter((a) => a.resourceId === r.id && a.month === month);
        return sum + m.reduce((s, a) => s + a.personMonths, 0);
      }, 0);
      const capacity = months.reduce((s) => s + r.monthlyCapacity, 0);
      return { ...r, allocated, capacity, load: capacity > 0 ? allocated / capacity : 0 };
    }).sort((a, b) => b.load - a.load);
  }, [dataset, resources, months]);

  const totals = useMemo(() => {
    const allocated = rows.reduce((s, r) => s + r.allocated, 0);
    const capacity = rows.reduce((s, r) => s + r.capacity, 0);
    return { allocated, capacity, ratio: capacity > 0 ? allocated / capacity : 0 };
  }, [rows]);

  const overCount = useMemo(() => rows.filter((r) => r.load > 1).length, [rows]);
  const busiest = rows[0];

  // Stacked allocation vs capacity by role: capacity as a backdrop, allocated in front.
  const byRole = useMemo(() => {
    if (!dataset) return [];
    const roles = [...new Set(resources.map((r) => r.role))].sort();
    const rowByRole = new Map<string, { allocated: number; capacity: number }[]>();
    for (const row of rows) {
      const list = rowByRole.get(row.role) ?? [];
      list.push({ allocated: row.allocated, capacity: row.capacity });
      rowByRole.set(row.role, list);
    }
    return roles.map((role) => {
      const roleRows = rowByRole.get(role) ?? [];
      const allocated = roleRows.reduce((s, r) => s + r.allocated, 0);
      const capacity = roleRows.reduce((s, r) => s + r.capacity, 0);
      const unallocated = Math.max(0, capacity - allocated);
      return {
        role,
        label: `${role} (${roleRows.length})`,
        allocated: Math.round(allocated * 10) / 10,
        spare: Math.round(unallocated * 10) / 10,
        capacity,
        utilization: capacity > 0 ? Math.round((allocated / capacity) * 100) : 0,
      };
    });
  }, [dataset, resources, rows]);

  // Monthly utilization % for the window, with the 100% target strip line.
  const byMonth = useMemo(() => {
    if (!dataset) return [];
    return months.map((month) => {
      const monthAlloc = dataset.allocations.filter((a) => resources.some((r) => r.id === a.resourceId) && a.month === month);
      const allocated = monthAlloc.reduce((sum, a) => sum + a.personMonths, 0);
      const capacity = resources.reduce((sum, r) => sum + r.monthlyCapacity, 0);
      return {
        label: monthLabel(month),
        utilization: capacity > 0 ? Math.round((allocated / capacity) * 100) : 0,
        full: 100,
        ratio: capacity > 0 ? `${Math.round((allocated / capacity) * 100)}% of capacity: ${personMonths(allocated)} of ${personMonths(capacity)} person-months` : 'no capacity',
      };
    });
  }, [dataset, resources, months]);

  // The tooltip reads a plain ratio (never a >100% share): 'allocated 234 of 100 capacity person-months'.
  // ITooltipRenderEventArgs: point.x/point.y and the top-level text/headerText (the skill's user-interaction.md).
  const onTooltipRender = (args: { point?: { x?: unknown; y?: unknown; index?: number }; text?: string; headerText?: string }) => {
    const point = args.point;
    if (point) {
      // No header: "Apr 2026" beside "62%" would read as one number; the month leads the text instead.
      args.headerText = '';
      args.text = `${String(point.x)} · ${byMonth[point.index ?? -1]?.ratio ?? `${Number(point.y)}% of capacity`}`;
    }
  };
  const utilMax = Math.max(110, Math.ceil((Math.max(0, ...byMonth.map((m) => m.utilization)) + 10) / 10) * 10);

  if (!load.ok || !dataset) {
    return <ErrorState title="We couldn't load the portfolio dataset." message={load.ok ? undefined : load.errors.join(' ')} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Resource Capacity</h1>
          <p data-testid="capacity-summary">
            {resources.length} resources · {months.length} months in view · demo-today 2026-10-16
            {roleFilter ? ` · ${roleFilter} role` : ''}
          </p>
        </div>
      </header>
      <SharedFilterBar note="Picks the months for every figure on this page; allocations cover Apr–Oct 2026" />
      <p className="page-note">A person-month is one person working one month. Over 100% means more than full time.</p>

      <section aria-label="Capacity highlights">
        <div className="scorecard-grid capacity-kpis" data-testid="capacity-kpis">
          <KpiCard testId="kpi-utilization" title="Book utilization" icon={Gauge}
            value={percent(totals.ratio, 0)}
            note={<>{personMonths(totals.allocated)} allocated of {personMonths(totals.capacity)} capacity</>} />
          <KpiCard testId="kpi-over" title="Over-allocated" icon={AlertTriangle}
            value={String(overCount)}
            note={`${overCount === 0 ? 'no resources' : `${overCount} of ${rows.length} resources`} above 100% load`} />
          <KpiCard testId="kpi-busiest" title="Most loaded" icon={TrendingUp}
            value={busiest ? percent(busiest.load, 0) : '—'}
            note={busiest ? `${busiest.name} · ${busiest.role}` : 'no resources in view'} />
          <KpiCard testId="kpi-months" title="Months in view" icon={CalendarDays}
            value={String(months.length)}
            note={`${monthLabel(months[0])} – ${monthLabel(months[months.length - 1])}`} />
        </div>
      </section>

      <section aria-label="Allocation by role">
        <article className="e-card panel-card">
          <div className="e-card-header"><div className="e-card-header-title">Allocation vs capacity by role</div></div>
          <div className="panel-body" id="capacity-chart">
            <ChartComponent key={theme} id="role-chart" width="100%" height="300px" theme={chartTheme(theme)}
              palettes={[palette(theme).series[0], palette(theme).neutral]}
              primaryXAxis={{ valueType: 'Category' }}
              primaryYAxis={{ title: 'Person-months', labelFormat: '{value}' }}
              tooltip={{ enable: true }}
              legendSettings={{ visible: true, position: 'Bottom' }}>
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={byRole} xName="label" yName="allocated" type="Column" name="Allocated"
                  tooltipMappingName="utilization" columnWidth={0.6} />
                <SeriesDirective dataSource={byRole} xName="label" yName="spare" type="Column" name="Spare capacity"
                  columnWidth={0.6} />
              </SeriesCollectionDirective>
              <ChartInject services={[ColumnSeries, Legend, Tooltip, Category]} />
            </ChartComponent>
            <p className="page-note">Allocated load against monthly capacity for the {months.length}-month window; hover a bar for utilization.</p>
          </div>
        </article>
      </section>

      <section aria-label="Utilization by month" className="capacity-panels">
        <article className="e-card panel-card">
          <div className="e-card-header"><div className="e-card-header-title">Utilization by month</div></div>
          <div className="panel-body" id="utilization-chart-panel">
            <ChartComponent key={theme} id="utilization-chart" width="100%" height="260px" theme={chartTheme(theme)}
              palettes={[palette(theme).series[0]]}
              primaryXAxis={{ valueType: 'Category' }}
              primaryYAxis={{ labelFormat: "{value}%", title: 'Utilization', minimum: 0, maximum: utilMax, interval: 20 }}
              tooltip={{ enable: true }}
              tooltipRender={onTooltipRender}
              legendSettings={{ visible: true, position: 'Bottom' }}>
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={byMonth} xName="label" yName="utilization" type="Column" name="Allocated"
                  tooltipMappingName="ratio" />
                <SeriesDirective dataSource={byMonth} xName="label" yName="full" type="Line" name="Full capacity (100%)"
                  fill={palette(theme).reference} width={2} dashArray="6,4" enableTooltip={false} />
              </SeriesCollectionDirective>
              <ChartInject services={[ColumnSeries, LineSeries, Legend, Tooltip, Category]} />
            </ChartComponent>
            <p className="page-note">Dashed line marks 100% of capacity: the whole team fully booked.</p>
          </div>
        </article>
      </section>

      <section aria-label="Resource allocation">
        <article className="e-card panel-card">
          <div className="e-card-header">
            <div className="e-card-header-title">Resource allocation ({monthLabel(months[0])} – {monthLabel(months[months.length - 1])})</div>
          </div>
          <div className="panel-body">
            <GridComponent dataSource={rows} allowSorting allowTextWrap height="auto" id="capacity-grid">
              <ColumnsDirective>
                <ColumnDirective field="name" headerText="Resource" width={160} />
                <ColumnDirective field="role" headerText="Role" width={90} />
                <ColumnDirective field="allocated" headerText="Allocated (pm)" textAlign="Right" format="N1" width={140} />
                <ColumnDirective field="capacity" headerText="Capacity (pm)" textAlign="Right" format="N1" width={140} />
                <ColumnDirective field="loadPct" headerText="Load" width={120}
                  template={(props: Record<string, unknown>) => {
                    const load = Number(props.load);
                    const over = load > 1;
                    return <span className={over ? 'status-badge tone-danger' : 'status-badge tone-success'}>
                      {over ? '▲' : '●'} {percent(load, 0)}
                    </span>;
                  }} />
              </ColumnsDirective>
              <GridInject services={[Sort, Page]} />
            </GridComponent>
            <p className="page-note">Sorted by load, heaviest first. ▲ over 100% (over-allocated); ● within capacity.</p>
          </div>
        </article>
      </section>
    </div>
  );
}