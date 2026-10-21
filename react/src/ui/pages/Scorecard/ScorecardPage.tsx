import { useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { AccumulationChartComponent, AccumulationSeriesCollectionDirective, AccumulationSeriesDirective, Inject as AccumulationInject, AccumulationLegend, AccumulationTooltip, AccumulationDataLabel, PieSeries } from '@syncfusion/ej2-react-charts';
import { ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject as ChartInject, LineSeries, Legend as ChartLegend, Tooltip as ChartTooltip, Category, DataLabel } from '@syncfusion/ej2-react-charts';
import { CheckCircle2, Wallet, Target, AlertTriangle } from 'lucide-react';
import { usePortfolioStore } from '../../../app/PortfolioStore';
import { budgetTotals, healthCounts, onTimeRatio, stageCounts, STAGES, openRisks, upcomingMilestones, trendFor } from '../../../domain/rules';
import { DEMO_TODAY } from '../../../domain/types';
import { compactMoney, percent, percentSigned, monthLabel, isoDate } from '../../format';
import { monthsIn, overlaps, useFilters } from '../../filters';
import { chartTheme, palette } from '../../../styles/palette';
import { useTheme } from '../../theme';
import { HealthBadge } from '../../components/HealthBadge';
import { SharedFilterBar } from '../../SharedFilterBar';
import { KpiCard } from '../../components/KpiCard';
import { PanelHeader } from '../../components/PanelHeader';
import { ErrorState } from '../../components/States';

export function ScorecardPage() {
  const { load, dataset, edits, profile } = usePortfolioStore();
  const { theme } = useTheme();
  const { period, periodRange, periodLabel } = useFilters();
  useEffect(() => { document.title = 'Executive Scorecard · Portfolio Command Center'; }, []);
  const data = dataset;

  // The reporting period scopes the health chart, the stage summary and the trend: projects whose
  // dates overlap it, and the months inside it. KPI cards always cover the whole book.
  const inPeriod = useMemo(() => (data ? (period === 'all' ? data.projects : data.projects.filter((p) => overlaps(p.start, p.end, periodRange))) : []), [data, period, periodRange]);
  const stages = useMemo(() => (data ? stageCounts(inPeriod, edits) : null), [data, inPeriod, edits]);
  const health = useMemo(() => (data ? healthCounts(inPeriod) : null), [data, inPeriod]);
  const allHealth = useMemo(() => (data ? healthCounts(data.projects) : null), [data]);
  const allStages = useMemo(() => (data ? stageCounts(data.projects, edits) : null), [data, edits]);
  const budgets = useMemo(() => (data ? budgetTotals(data.projects) : null), [data]);
  const onTime = useMemo(() => (data ? onTimeRatio(data, data.projects) : null), [data]);
  const risks = useMemo(() => (data ? openRisks(data, [...data.projects.map((p) => p.id), ...data.portfolios.map((po) => po.id)]) : null), [data]);
  const upcoming = useMemo(() => (data ? upcomingMilestones(data, 60) : null), [data]);

  // Trend: portfolio-level monthly snapshots (kpiSnapshots), averaged (never summed — the
  // ratios are shares) across portfolios per month, labelled as friendly month names.
  const trend = useMemo(() => {
    if (!data) return [];
    const acc = new Map<string, { total: number; count: number }>();
    for (const po of data.portfolios) {
      for (const t of trendFor(data, po.id)) {
        const entry = acc.get(t.month) ?? { total: 0, count: 0 };
        entry.total += t.onTimeRatio; entry.count += 1;
        acc.set(t.month, entry);
      }
    }
    const keep = new Set(monthsIn(periodRange));
    return [...acc.entries()].filter(([month]) => period === 'all' || keep.has(month)).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, { total, count }]) => ({ label: monthLabel(month).slice(0, 3), onTimeRatio: Math.round((total / count) * 100) }));
  }, [data, period, periodRange]);

  if (!load.ok || !data || !stages || !health || !budgets || !onTime || !risks || !upcoming || !allHealth || !allStages) {
    return <ErrorState title="We couldn't load the portfolio dataset." message={load.ok ? undefined : load.errors.join(' ')}>
      <button type="button" className="app-btn e-outline" onClick={() => window.location.reload()}>Reload</button>
    </ErrorState>;
  }

  const healthTotal = data.projects.length;
  const scopeNote = period === 'all' ? 'all projects' : `${inPeriod.length} projects active in ${periodLabel}`;
  const inScope = Math.max(1, health['On track'] + health.Watch + health['At risk']);
  const donut = (['On track', 'Watch', 'At risk'] as const).map((h) => ({
    health: h, count: health[h], share: Math.round((health[h] / inScope) * 100), label: `${Math.round((health[h] / inScope) * 100)}%`, healthColor: { 'On track': 'var(--app-chart-ontrack)', Watch: 'var(--app-chart-watch)', 'At risk': 'var(--app-chart-atrisk)' }[h],
  })).filter((d) => d.count > 0) // slices drawn largest-first (checked by the browser check's pie-order rule)
    .sort((a, b) => b.count - a.count);



  const projectNames = new Map(data.projects.map((p) => [p.id, p.name]));

  return (
    <div className="page scorecard-page">
      <header className="page-header">
        <div>
          <h1>Executive Scorecard</h1>
          <p data-testid="scorecard-summary">
            {healthTotal} projects across {data.portfolios.length} portfolios · demo-today {DEMO_TODAY}
          </p>
        </div>
        <p className="page-note">Sample command center: every edit stays in this session{profile === 'customer' ? ' and this browser' : ''}.</p>
      </header>
      <SharedFilterBar note="Scopes the health chart, stage summary and on-time trend; KPI cards cover the whole book" />

      <section aria-label="Key performance indicators">
        <div className="scorecard-grid" data-testid="scorecard-kpis">
          <Link to="/register" className="kpi-card-link" title="Review the project register">
            <KpiCard testId="kpi-projects" title="Active projects" icon={Target} value={String(healthTotal)}
              note={`${STAGES.filter((s) => allStages[s] > 0).length} stages in play — review the project register`} />
          </Link>
          <Link to="/risk-dependencies" className="kpi-card-link" title="Review risks and dependencies">
            <KpiCard testId="kpi-health" title="On track" icon={CheckCircle2}
              value={`${allHealth['On track']} of ${healthTotal}`}
              note={<>{allHealth['At risk']} at risk · {allHealth.Watch} on watch — review risks and dependencies</>} />
          </Link>
          <Link to="/capacity" className="kpi-card-link" title="Plan resource capacity">
            <KpiCard testId="kpi-budget" title="Budget variance" icon={Wallet}
              value={percentSigned(budgets.varianceRatio)}
              valueClass={budgets.varianceRatio > 0 ? 'variance-over' : budgets.varianceRatio < 0 ? 'variance-under' : undefined}
              note={<>{budgets.varianceRatio > 0 ? 'Over budget: ' : budgets.varianceRatio < 0 ? 'Under budget: ' : ''}{compactMoney(budgets.forecast)} forecast of {compactMoney(budgets.planned)} planned — plan resource capacity</>} />
          </Link>
          <Link to="/milestones" className="kpi-card-link" title="Track milestones and governance">
            <KpiCard testId="kpi-ontime" title="Milestones on time" icon={Target}
              value={`${percent(onTime.ratio)} (${onTime.onTime}/${onTime.completed})`}
              note="Completed milestones delivered by their baseline date — track milestones and governance" />
          </Link>
        </div>
      </section>

      {/* Asymmetric dashboard grid (T-07 rev 2): health donut gets room to breathe beside the
          stage table; trend + milestones + top risks fill the lower band without stretched
          empty cards. Fixed CSS grid — Dashboard Layout was dropped with user confirmation. */}
      <section aria-label="Portfolio breakdown" className="scorecard-breakdown">
        <div className="scorecard-panels">
          <article className="e-card panel-card panel-health">
            <PanelHeader title="Project health" sub={scopeNote} />
            <div className="panel-body health-body" id="scorecard-health-chart">
              <div className="chart-fill donut-fill">
              <AccumulationChartComponent
                key={theme}
                id="health-donut"
                width="100%"
                height="100%"
                theme={chartTheme(theme)}
                legendSettings={{ visible: false }}
                tooltip={{ enable: true, format: '${point.x}: <b>${point.y}</b> projects' }}
              >
                <AccumulationSeriesCollectionDirective>
                  <AccumulationSeriesDirective dataSource={donut} xName="health" yName="count" type="Pie" innerRadius="55%"
                    pointColorMapping="healthColor"
                    radius="70%"
                    dataLabel={{ visible: true, name: 'label', position: 'Outside', connectorStyle: { length: '14px', width: 1.5 }, font: { fontWeight: '600', size: '14px' } }}>
                  </AccumulationSeriesDirective>
                </AccumulationSeriesCollectionDirective>
                <AccumulationInject services={[PieSeries, AccumulationLegend, AccumulationTooltip, AccumulationDataLabel]} />
              </AccumulationChartComponent>
              <div className="donut-centre" aria-hidden="true"><strong>{inScope}</strong><span>projects</span></div>
              </div>
              <ul className="health-legend" data-testid="health-legend">
                {donut.map((d) => (
                  <li key={d.health}>
                    <HealthBadge health={d.health} />
                    <span className="health-legend-count">{d.count}</span>
                    <span className="health-legend-share">{d.share}% of projects</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className="e-card panel-card panel-stage">
            <PanelHeader title="Stage summary" sub={`Projects by stage (${scopeNote}), session edits applied`} />
            <div className="panel-body">
              <div className="stage-fill">
              <table className="stage-table" data-testid="stage-summary" aria-label={`Projects by stage (${scopeNote}), session edits applied`}>
                <thead><tr><th scope="col">Stage</th><th scope="col">Projects</th></tr></thead>
                <tbody>
                  {STAGES.map((s) => {
                    const width = `${(stages[s] / Math.max(...STAGES.map((x) => stages[x]), 1)) * 100}%`;
                    return (
                      <tr key={s}>
                        <th scope="row">{s}</th>
                        <td data-testid={`stage-${s.replace(/\s+/g, '-')}`}>
                          <span className="stage-count">{stages[s]}</span>
                          <span className="stage-bar" aria-hidden="true"><span className="stage-bar-fill" style={{ width }} /></span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <p className="page-note">Edited in this session: {Object.keys(edits).length}</p>
            </div>
          </article>
        </div>

        <div className="scorecard-panels scorecard-panels-second">
          <article className="e-card panel-card panel-trend">
            <PanelHeader title="On-time trend" sub={`Share of milestones on time, portfolio average${period === 'all' ? '' : `, ${periodLabel}`}`} />
            <div className="panel-body" id="scorecard-trend-chart">
              <div className="chart-fill trend-fill">
              <ChartComponent
                key={theme}
                id="ontime-trend"
                width="100%"
                height="100%"
                theme={chartTheme(theme)}
                palettes={[...palette(theme).series]}
                primaryXAxis={{ valueType: 'Category', labelPlacement: 'OnTicks' }}
                primaryYAxis={{ labelFormat: "{value}%", minimum: 50, maximum: 100, interval: 10, rangePadding: 'None' }}
                tooltip={{ enable: true, header: 'On-time share', format: '${point.x}: <b>${point.percentage}%</b> of milestones on time' }}
              >
                <SeriesCollectionDirective>
                  <SeriesDirective dataSource={trend}
                    xName="label" yName="onTimeRatio" type="Line" width={2}
                    marker={{ visible: true, dataLabel: { visible: true } }}>
                  </SeriesDirective>
                </SeriesCollectionDirective>
                <ChartInject services={[LineSeries, ChartLegend, ChartTooltip, Category, DataLabel]} />
              </ChartComponent>
              </div>
            </div>
          </article>

          <article className="e-card panel-card panel-milestones">
            <div className="e-card-header"><div className="e-card-header-title">Upcoming milestones (60 days)</div></div>
            <div className="panel-body">
              <ul className="mini-list" data-testid="upcoming-milestones">
                {upcoming.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Link to={`/milestones?project=${m.projectId}`} className="mini-name">{m.name}</Link>
                    <span className="mini-meta">{projectNames.get(m.projectId) ?? m.projectId} · due {isoDate(m.dueDate)}</span>
                  </li>
                ))}
              </ul>
              {upcoming.length === 0 && <p className="page-note">No milestones due in the next 60 days.</p>}
              <p className="page-note">{upcoming.length} milestones due in the 60 days after {isoDate(DEMO_TODAY)}</p>
            </div>
          </article>

          <article className="e-card panel-card panel-risks">
            <div className="e-card-header"><div className="e-card-header-title">Top open risks</div></div>
            <div className="panel-body">
              <ul className="mini-list" data-testid="top-risks">
                {risks.slice(0, 5).map((r) => (
                  <li key={r.id}>
                    <Link to="/risk-dependencies" className="mini-name">{r.title}</Link>
                    <span className="mini-meta">{r.severity}×{r.probability} · {r.state}</span>
                  </li>
                ))}
              </ul>
              <p className="page-note inline-note"><AlertTriangle size={14} aria-hidden="true" /> {risks.length} risks open or mitigating — review exposure on the risk board</p>
            </div>
          </article>
        </div>

        <div className="scorecard-panels scorecard-panels-third">
          <article className="e-card panel-card panel-portfolios">
            <div className="e-card-header"><div className="e-card-header-title">Portfolios</div></div>
            <div className="panel-body">
              <ul className="portfolio-list portfolio-list-cards" data-testid="portfolio-summary">
                {data.portfolios.map((po) => {
                  const programIds = new Set(data.programs.filter((pr) => pr.portfolioId === po.id).map((pr) => pr.id));
                  const projects = data.projects.filter((p) => programIds.has(p.programId));
                  const b = budgetTotals(projects);
                  const h = healthCounts(projects);
                  return (
                    <li key={po.id} className="portfolio-tile">
                      <Link to={`/register?portfolio=${po.id}`} className="portfolio-name">{po.name}</Link>
                      <span className="portfolio-meta">{projects.length} projects · {compactMoney(b.forecast)} forecast</span>
                      <span className="portfolio-health">
                        <HealthBadge health={h['At risk'] > 0 ? 'At risk' : h.Watch > 0 ? 'Watch' : 'On track'} />
                        <span className="portfolio-risk-note">{h['At risk']} at risk</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}