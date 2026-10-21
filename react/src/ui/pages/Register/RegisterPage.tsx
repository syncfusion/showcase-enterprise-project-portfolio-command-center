import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ColumnDirective, ColumnsDirective, GridComponent, Inject, Search, Sort, Toolbar, ExcelExport } from '@syncfusion/ej2-react-grids';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { usePortfolioStore } from '../../../app/PortfolioStore';
import { stageOf, validateStageMove } from '../../../domain/session-rules';
import type { Project, Stage } from '../../../domain/types';
import { ErrorState } from '../../components/States';
import { HealthBadge } from '../../components/HealthBadge';
import { SharedFilterBar } from '../../SharedFilterBar';
import { overlaps, useFilters } from '../../filters';
import { compactMoney } from '../../format';

const STAGES: Stage[] = ['Planning', 'Prioritized', 'In flight', 'Gate review', 'Closed'];

type Row = Project & { effectiveStage: Stage; program: string; portfolio: string; variance: number };

/** Signed compact money with a tone: over budget reads as a problem, under as good. */
function Variance({ value }: { value: number }) {
  if (value === 0) return <span>$0</span>;
  return <span className={value > 0 ? 'variance-over' : 'variance-under'}>{value > 0 ? '+' : ''}{compactMoney(value)}</span>;
}

function Progress({ value }: { value: number }) {
  return (
    <span className="progress" aria-label={`${value}% complete`}>
      <span className="progress-track" aria-hidden="true"><span className="progress-fill" style={{ width: `${value}%` }} /></span>
      <span className="progress-value">{value}%</span>
    </span>
  );
}

export function RegisterPage() {
  const { load, dataset, edits, editStage, profile } = usePortfolioStore();
  const { periodRange, periodLabel, period } = useFilters();
  const [params] = useSearchParams();
  const portfolioFilter = params.get('portfolio');
  const healthFilter = params.get('health');
  const projectFilter = params.get('project');
  const gridRef = useRef<GridComponent>(null);

  useEffect(() => { document.title = 'Portfolio Register · Portfolio Command Center'; }, []);

  const rows = useMemo<Row[]>(() => {
    if (!dataset) return [];
    let list = dataset.projects;
    if (period !== 'all') list = list.filter((p) => overlaps(p.start, p.end, periodRange));
    if (portfolioFilter) list = list.filter((p) => dataset.programs.find((pr) => pr.id === p.programId)?.portfolioId === portfolioFilter);
    if (healthFilter) list = list.filter((p) => p.health === healthFilter);
    if (projectFilter) list = list.filter((p) => p.id === projectFilter);
    return list.map((p) => ({
      ...p,
      effectiveStage: stageOf(p, edits),
      program: dataset.programs.find((pr) => pr.id === p.programId)?.name ?? '',
      portfolio: dataset.portfolios.find((po) => po.id === dataset.programs.find((pr) => pr.id === p.programId)?.portfolioId)?.name ?? '',
      variance: p.forecastBudget - p.plannedBudget,
    }));
  }, [dataset, edits, period, periodRange, portfolioFilter, healthFilter, projectFilter]);

  const [toast, setToast] = useState<{ title: string; content: string; key: number } | null>(null);
  const notify = useCallback((title: string, content: string) => {
    setToast({ title, content, key: Date.now() });
  }, []);

  const onStageChange = useCallback((projectId: string, next: Stage) => {
    if (!dataset) return;
    const project = dataset.projects.find((p) => p.id === projectId) as Project | undefined;
    if (!project) return;
    const current = stageOf(project, edits);
    const error = validateStageMove(project.stage, current, next);
    if (error) { notify('Stage not changed', error); return; }
    editStage(projectId, next);
    notify('Stage updated', `${projectId} moved to "${next}" (this session${profile === 'customer' ? ', kept in this browser' : ''}).`);
  }, [dataset, edits, editStage, profile, notify]);

  // Known correction (syncfusion-component-skills.json): the built-in toolbar Search input renders
  // without an accessible name; set it in the Grid's created event.
  const onCreated = useCallback(() => {
    const grid = gridRef.current;
    const input = grid?.element?.querySelector('.e-toolbar .e-search input') as HTMLInputElement | null;
    if (input && !input.getAttribute('aria-label')) input.setAttribute('aria-label', 'Search projects');
  }, []);

  if (!load.ok || !dataset) {
    return <ErrorState title="We couldn't load the portfolio dataset." message={load.ok ? undefined : load.errors.join(' ')}>
      <button type="button" className="app-btn e-outline" onClick={() => window.location.reload()}>Reload</button>
    </ErrorState>;
  }

  // Syncfusion DropDownList per row (plan: "inline DropDownList"). The `select` event fires before the
  // value changes, so a denied move cancels it and the cell keeps the stage the store holds.
  const stagePicker = (projectId: string, name: string, value: Stage, width = '140px') => (
    <DropDownListComponent
      dataSource={STAGES}
      value={value}
      width={width}
      popupHeight="220px"
      htmlAttributes={{ 'aria-label': `Stage for ${name}` }}
      select={(args) => {
        const next = (args.item?.textContent ?? '').trim() as Stage;
        if (!STAGES.includes(next) || next === value) return;
        const project = dataset.projects.find((p) => p.id === projectId);
        if (project && validateStageMove(project.stage, value, next)) args.cancel = true;
        onStageChange(projectId, next);
      }}
    />
  );

  const onToolbarClick = (args: { item: { id?: string } }) => {
    if (args.item.id === 'register-export-csv') {
      void gridRef.current?.csvExport({ fileName: 'portfolio-register.csv', includeHiddenColumn: true });
      notify('Export started', `${rows.length} register rows exported as CSV (current filters and search apply).`);
    }
  };

  const scope = [
    portfolioFilter ? `in ${dataset.portfolios.find((po) => po.id === portfolioFilter)?.name ?? portfolioFilter}` : 'across all portfolios',
    period !== 'all' ? `active in ${periodLabel}` : '',
  ].filter(Boolean).join(' · ');

  return (
    <div className="page register-page">
      <header className="page-header">
        <div>
          <h1>Portfolio Register</h1>
          <p data-testid="register-summary">
            {rows.length} {rows.length === 1 ? 'project' : 'projects'} {scope}
            {projectFilter && <> · filtered to {projectFilter} — <Link to="/register" className="text-link">show all projects</Link></>}
          </p>
        </div>
        <p className="page-note">
          Stage changes are {profile === 'customer' ? 'kept in this browser' : 'session-only'}; Reset returns to the shipped baseline.
        </p>
      </header>
      <SharedFilterBar note="Shows projects whose dates overlap the period; the CSV export follows it" />

      <div className="register-grid-wrap">
        <GridComponent
          ref={gridRef}
          dataSource={rows}
          id="register-grid"
          allowSorting
          allowExcelExport
          toolbar={['Search', { id: 'register-export-csv', text: 'Export CSV', tooltipText: 'Export the filtered register as CSV' }]}
          toolbarClick={onToolbarClick}
          created={onCreated}
          height="auto" allowTextWrap textWrapSettings={{ wrapMode: 'Content' }}
        >
          <ColumnsDirective>
            <ColumnDirective field="id" headerText="ID" isPrimaryKey width={76} />
            <ColumnDirective field="name" headerText="Project" minWidth={180}
              template={(props: Row) => (
                <span className="project-cell">
                  <span className="project-name">{props.name}</span>
                  <span className="project-meta">{props.portfolio} · {props.manager}</span>
                </span>
              )} />
            <ColumnDirective field="effectiveStage" headerText="Stage" width={156}
              template={(props: Row) => stagePicker(props.id, props.name, props.effectiveStage)} />
            <ColumnDirective field="health" headerText="Health" width={110} template={(props: Row) => <HealthBadge health={props.health} />} />
            <ColumnDirective field="priority" headerText="Priority" textAlign="Right" width={80} customAttributes={{ class: 'num' }}
              template={(props: Row) => <span>P{props.priority}</span>} />
            <ColumnDirective field="portfolio" headerText="Portfolio" visible={false} />
            <ColumnDirective field="program" headerText="Program" visible={false} />
            <ColumnDirective field="plannedBudget" headerText="Planned" format="C0" visible={false} />
            <ColumnDirective field="forecastBudget" headerText="Forecast" textAlign="Right" width={110} customAttributes={{ class: 'num' }}
              template={(props: Row) => <span className="project-cell"><span>{compactMoney(props.forecastBudget)}</span><span className="project-meta">of {compactMoney(props.plannedBudget)}</span></span>} />
            <ColumnDirective field="variance" headerText="Variance" textAlign="Right" width={100} customAttributes={{ class: 'num' }}
              template={(props: Row) => <Variance value={props.variance} />} />
            <ColumnDirective field="completion" headerText="Complete" width={120}
              template={(props: Row) => <Progress value={props.completion} />} />
          </ColumnsDirective>
          <Inject services={[Sort, Search, Toolbar, ExcelExport]} />
        </GridComponent>
      </div>

      {/* Phones: one card per project instead of a ten-column grid. */}
      <ul className="register-list" aria-label="Projects">
        {rows.map((p) => (
          <li key={p.id} className="e-card register-item">
            <div className="register-item-head">
              <span className="project-cell">
                <span className="project-name">{p.name}</span>
                <span className="project-meta">{p.id} · {p.portfolio} · {p.manager}</span>
              </span>
              <HealthBadge health={p.health} />
            </div>
            {stagePicker(p.id, p.name, p.effectiveStage, '100%')}
            <dl>
              <dt>Forecast</dt><dd>{compactMoney(p.forecastBudget)} of {compactMoney(p.plannedBudget)}</dd>
              <dt>Variance</dt><dd><Variance value={p.variance} /></dd>
              <dt>Priority</dt><dd>P{p.priority}</dd>
            </dl>
            <Progress value={p.completion} />
          </li>
        ))}
      </ul>

      {toast && (
        <ToastComponent
          key={toast.key}
          title={toast.title}
          content={toast.content}
          position={{ X: 'Right', Y: 'Top' }}
          showCloseButton
          timeOut={5000}
          cssClass="app-toast"
        />
      )}
    </div>
  );
}
