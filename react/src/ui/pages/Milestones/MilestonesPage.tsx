import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { GanttComponent, ColumnsDirective, ColumnDirective, Inject, Selection, Sort, DayMarkers } from '@syncfusion/ej2-react-gantt';
import type { IQueryTaskbarInfoEventArgs } from '@syncfusion/ej2-react-gantt';
import { KanbanComponent, ColumnsDirective as KanbanColumnsDirective, ColumnDirective as KanbanColumnDirective } from '@syncfusion/ej2-react-kanban';
import { GridComponent, ColumnsDirective as GridColumns, ColumnDirective as GridColumn, Inject as GridInject, Page, Sort as GridSort } from '@syncfusion/ej2-react-grids';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { usePortfolioStore } from '../../../app/PortfolioStore';
import { stageOf, STAGES, onTimeRatio } from '../../../domain/rules';
import { validateStageMove } from '../../../domain/session';
import type { Health, Milestone, Stage } from '../../../domain/types';
import { DEMO_TODAY } from '../../../domain/types';
import { ErrorState } from '../../components/States';
import { PanelHeader } from '../../components/PanelHeader';
import { HealthBadge } from '../../components/HealthBadge';
import { isoDate, percent } from '../../format';
import { useTheme } from '../../theme';
import { palette } from '../../../styles/palette';

interface GanttTask {
  TaskID: string;
  TaskName: string;
  StartDate: Date;
  EndDate: Date;
  Progress: number;
  subtasks?: GanttTask[];
  health?: Health;
}

type MilestoneRow = Milestone & { project: string; slip: number };

const DAY = 86_400_000;
const date = (iso: string) => new Date(`${iso}T00:00:00`);

function MilestoneStatus({ row }: { row: MilestoneRow }) {
  if (row.status === 'Completed') {
    return row.slip <= 0
      ? <span className="status-badge tone-success"><CheckCircle2 size={13} aria-hidden="true" />Done on time</span>
      : <span className="status-badge tone-warning"><AlertTriangle size={13} aria-hidden="true" />Done {row.slip}d late</span>;
  }
  if (row.status === 'Late') return <span className="status-badge tone-danger"><AlertTriangle size={13} aria-hidden="true" />Late</span>;
  return row.slip > 0
    ? <span className="status-badge tone-warning"><Clock size={13} aria-hidden="true" />Forecast {row.slip}d late</span>
    : <span className="status-badge tone-neutral"><Clock size={13} aria-hidden="true" />Scheduled</span>;
}

/** Milestones & Timeline (T-11): the project Gantt (portfolio → project, coloured by health), the
 *  phase-gate milestone list, and the governance Kanban whose card moves drive the session state (BR-2). */
export function MilestonesPage() {
  const { load, dataset, edits, editStage, profile } = usePortfolioStore();
  const { theme } = useTheme();
  const [params] = useSearchParams();
  const focusProject = params.get('project');
  const [toast, setToast] = useState<{ title: string; content: string; key: number } | null>(null);
  // Bumped when a drop is denied: remounting the board re-reads the store's stages, so a rejected card returns to its column.
  const [boardKey, setBoardKey] = useState(0);
  const notify = useCallback((title: string, content: string) => setToast({ title, content, key: Date.now() }), []);
  useEffect(() => { document.title = 'Milestones & Timeline · Portfolio Command Center'; }, []);

  const tasks = useMemo(() => {
    if (!dataset) return [];
    return dataset.portfolios.map((po) => {
      const children: GanttTask[] = dataset.projects
        .filter((p) => dataset.programs.find((pr) => pr.id === p.programId)?.portfolioId === po.id)
        .map((p) => ({ TaskID: p.id, TaskName: p.name, StartDate: date(p.start), EndDate: date(p.end), Progress: p.completion, health: p.health }));
      return {
        TaskID: `po-${po.id}`, TaskName: po.name, Progress: 0, subtasks: children,
        StartDate: new Date(Math.min(...children.map((c) => c.StartDate.getTime()))),
        EndDate: new Date(Math.max(...children.map((c) => c.EndDate.getTime()))),
      } satisfies GanttTask;
    });
  }, [dataset]);

  // The timeline spans every project (Jan 2026 – Sep 2027 in the fixture), padded to whole months.
  const range = useMemo(() => {
    if (!dataset) return { start: new Date('2026-01-01'), end: new Date('2027-12-31') };
    const starts = dataset.projects.map((p) => date(p.start).getTime());
    const ends = dataset.projects.map((p) => date(p.end).getTime());
    const s = new Date(Math.min(...starts)), e = new Date(Math.max(...ends));
    return { start: new Date(s.getFullYear(), s.getMonth(), 1), end: new Date(e.getFullYear(), e.getMonth() + 1, 0) };
  }, [dataset]);

  const milestoneRows = useMemo<MilestoneRow[]>(() => {
    if (!dataset) return [];
    const names = new Map(dataset.projects.map((p) => [p.id, p.name]));
    return dataset.milestones
      .filter((m) => !focusProject || m.projectId === focusProject)
      .map((m) => ({ ...m, project: `${m.projectId} · ${names.get(m.projectId) ?? ''}`, slip: Math.round((date(m.dueDate).getTime() - date(m.baselineDate).getTime()) / DAY) }))
      .sort((a, b) => {
        const doneA = a.status === 'Completed', doneB = b.status === 'Completed';
        if (doneA !== doneB) return doneA ? 1 : -1;
        return doneA ? b.dueDate.localeCompare(a.dueDate) : a.dueDate.localeCompare(b.dueDate);
      });
  }, [dataset, focusProject]);

  const kanbanCards = useMemo(() => {
    if (!dataset) return [];
    return dataset.projects.map((p) => ({
      ID: p.id, Name: p.name, Stage: stageOf(p, edits), Health: p.health, Manager: p.manager,
      Portfolio: dataset.portfolios.find((po) => po.id === dataset.programs.find((pr) => pr.id === p.programId)?.portfolioId)?.name ?? '',
    }));
  }, [dataset, edits]);

  const kanbanColumns = STAGES.map((s) => ({ headerText: s, keyField: s }));

  if (!load.ok || !dataset) {
    return <ErrorState title="We couldn't load the portfolio dataset." message={load.ok ? undefined : load.errors.join(' ')} />;
  }

  const tones = palette(theme);
  // Bars carry the project's health (with the health word in the row label as the second cue).
  const onTaskbar = (args: IQueryTaskbarInfoEventArgs) => {
    const health = (args.data as unknown as { taskData?: GanttTask }).taskData?.health;
    if (!health) return;
    const fill = health === 'At risk' ? tones.danger : health === 'Watch' ? tones.warning : tones.series[0];
    args.taskbarBgColor = fill;
    args.taskbarBorderColor = fill;
    args.progressBarBgColor = theme === 'dark' ? 'rgba(15, 23, 42, 0.45)' : 'rgba(255, 255, 255, 0.35)';
  };

  // dragStop: the dropped card's new stage is already on args.data; enforce BR-2 and tell the user why a move is denied.
  const onCardDragged = (args: { data: { ID: string; Stage: string }[] }) => {
    for (const card of args.data ?? []) {
      const to = card.Stage as Stage;
      const project = dataset.projects.find((p) => p.id === card.ID);
      if (!project) continue;
      const from = stageOf(project, edits);
      if (to === from) continue;
      const error = validateStageMove(project.stage, from, to);
      if (error) {
        notify('Move not allowed', `${card.ID}: ${error}`);
        setBoardKey((k) => k + 1);
        continue;
      }
      editStage(card.ID, to);
      notify('Stage updated', `${card.ID} moved to "${to}" (this session${profile === 'customer' ? ', kept in this browser' : ''}).`);
    }
  };

  const onTime = onTimeRatio(dataset, dataset.projects);
  const due60 = milestoneRows.filter((m) => m.status !== 'Completed' && m.dueDate >= DEMO_TODAY
    && date(m.dueDate).getTime() - date(DEMO_TODAY).getTime() < 60 * DAY).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Milestones &amp; Timeline</h1>
          <p data-testid="milestone-summary">
            {dataset.projects.length} projects · {dataset.milestones.length} phase gates · {percent(onTime.ratio, 0)} of completed gates on time ({onTime.onTime}/{onTime.completed}) · demo-today {isoDate(DEMO_TODAY)}
          </p>
        </div>
        <p className="page-note"><a className="text-link" href="#governance">Open governance board</a> — the stage board below the timeline.</p>
      </header>

      <section aria-label="Project timeline">
        <article className="e-card panel-card">
          <div className="e-card-header"><div className="e-card-header-title">Project timeline</div></div>
          <div className="panel-body gantt-scroll">
            <GanttComponent key={theme} id="project-gantt" width="100%" height="560px" dataSource={tasks}
              taskFields={{ id: 'TaskID', name: 'TaskName', startDate: 'StartDate', endDate: 'EndDate', progress: 'Progress', child: 'subtasks' }}
              splitterSettings={{ position: '384px' }}
              timelineSettings={{ topTier: { unit: 'Year', format: 'yyyy' }, bottomTier: { unit: 'Month', format: 'MMM' }, timelineUnitSize: 44 }}
              projectStartDate={range.start} projectEndDate={range.end}
              eventMarkers={[{ day: date(DEMO_TODAY), label: 'Today' }]}
              queryTaskbarInfo={onTaskbar}
              rowHeight={40} taskbarHeight={22}
              allowSorting allowSelection>
              <ColumnsDirective>
                <ColumnDirective field="TaskName" headerText="Portfolio / Project" width="180" clipMode="EllipsisWithTooltip" />
                <ColumnDirective field="StartDate" headerText="Start" format="MMM yy" width="80" />
                <ColumnDirective field="EndDate" headerText="Finish" format="MMM yy" width="80" />
              </ColumnsDirective>
              <Inject services={[Selection, Sort, DayMarkers]} />
            </GanttComponent>
            <ul className="timeline-legend" aria-label="Bar colours">
              <li><span className="swatch" style={{ background: tones.series[0] }} />On track</li>
              <li><span className="swatch" style={{ background: tones.warning }} />Watch</li>
              <li><span className="swatch" style={{ background: tones.danger }} />At risk</li>
              <li>The {theme === 'dark' ? 'darker' : 'lighter'} left part of a bar is work complete; the dashed line marks demo-today.</li>
            </ul>
          </div>
        </article>
      </section>

      <section aria-label="Phase gates">
        <article className="e-card panel-card">
          <PanelHeader title={`Phase gates${focusProject ? ` · ${focusProject}` : ''}`}
            sub={`Open gates first, soonest due; ${due60} are due in the next 60 days. A forecast after baseline shows how many days late.`} />
          <div className="panel-body">
            <GridComponent id="milestone-grid" dataSource={milestoneRows} allowPaging pageSettings={{ pageSize: 10 }} allowSorting height="auto"
              allowTextWrap textWrapSettings={{ wrapMode: 'Content' }}>
              <GridColumns>
                <GridColumn field="project" headerText="Project" />
                <GridColumn field="name" headerText="Gate" width={140} />
                <GridColumn field="baselineDate" headerText="Baseline" width={120} template={(r: MilestoneRow) => <span>{isoDate(r.baselineDate)}</span>} />
                <GridColumn field="dueDate" headerText="Actual / forecast" width={136} template={(r: MilestoneRow) => <span>{isoDate(r.dueDate)}</span>} />
                <GridColumn field="slip" headerText="Status" width={164} template={(r: MilestoneRow) => <MilestoneStatus row={r} />} />
              </GridColumns>
              <GridInject services={[Page, GridSort]} />
            </GridComponent>
          </div>
        </article>
      </section>

      <section id="governance" aria-label="Governance board">
        <article className="e-card panel-card">
          <PanelHeader title="Governance board"
            sub={`Drag a card one stage at a time (BR-2). Moves are ${profile === 'customer' ? 'kept in this browser' : 'session-only'}; Reset restores the shipped baseline.`} />
          <div className="panel-body">
            <div className="kanban-scroll">
              <KanbanComponent
                key={`${boardKey}-${theme}`}
                id="governance-kanban"
                keyField="Stage"
                dataSource={kanbanCards}
                cardSettings={{
                  headerField: 'ID',
                  template: ((card: { ID: string; Name: string; Health: Health; Portfolio: string; Manager: string }) => (
                    <div className="kanban-item">
                      <span className="kanban-item-id">{card.ID}</span>
                      <span className="kanban-item-name">{card.Name}</span>
                      <HealthBadge health={card.Health} />
                      <span className="kanban-item-meta">{card.Portfolio} · {card.Manager}</span>
                    </div>
                  )) as never,
                }}
                dialogSettings={{ fields: [
                  { text: 'ID', key: 'ID', type: 'TextBox' },
                  { text: 'Name', key: 'Name', type: 'TextArea' },
                  { text: 'Manager', key: 'Manager', type: 'TextBox' },
                ] }}
                dragStop={onCardDragged}
                allowDragAndDrop>
                <KanbanColumnsDirective>
                  {kanbanColumns.map((c) => (
                    <KanbanColumnDirective key={c.keyField} headerText={c.headerText} keyField={c.keyField} />
                  ))}
                </KanbanColumnsDirective>
              </KanbanComponent>
            </div>
          </div>
        </article>
      </section>

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
