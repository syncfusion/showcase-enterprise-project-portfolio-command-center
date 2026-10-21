import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { DiagramComponent, Inject as DiagramInject, DataBinding, PortVisibility } from '@syncfusion/ej2-react-diagrams';
import type { NodeModel, ConnectorModel, IClickEventArgs } from '@syncfusion/ej2-react-diagrams';
import { GridComponent, ColumnsDirective, ColumnDirective, Inject as GridInject, Sort, Search } from '@syncfusion/ej2-react-grids';
import type { GridComponent as GridComponentType } from '@syncfusion/ej2-react-grids';
import { AlertTriangle, AlertCircle, Circle } from 'lucide-react';
import { usePortfolioStore } from '../../../app/PortfolioStore';
import { openRisks, riskScore } from '../../../domain/rules';
import type { Risk } from '../../../domain/types';
import { ErrorState } from '../../components/States';
import { HeaderSearch, PanelHeader } from '../../components/PanelHeader';
import { useTheme } from '../../theme';
import { palette, diagramTones as DIAGRAM } from '../../../styles/palette';

type RiskRow = Risk & { score: number; scopeLabel: string; projectId: string | null };

/** Exposure bands for a severity x probability score (1..25): second cue is the icon shape. */
function ScoreBadge({ row }: { row: RiskRow }) {
  const [tone, Icon, label] = row.score >= 16 ? ['tone-danger', AlertTriangle, 'High'] as const
    : row.score >= 10 ? ['tone-warning', AlertCircle, 'Medium'] as const : ['tone-info', Circle, 'Low'] as const;
  return (
    <span className="exposure">
      <span className={`status-badge ${tone}`}><Icon size={13} aria-hidden="true" />{row.score} · {label}</span>
      <span className="project-meta">severity {row.severity} × likelihood {row.probability}</span>
    </span>
  );
}


const NODE_W = 220, NODE_H = 56, ROW_GAP = 22, COL_GAP = 120, TOP = 56, LEFT = 72;

/** Risks & Dependencies (T-10): the risk register plus the cross-project dependency Diagram.
 *  Diagram nodes are native shapes (no React templates: they vanish on redraw), outlined by health
 *  with a second cue (shape), and connectors are typed; selecting a node opens the project. */
export function RiskDependenciesPage() {
  const { load, dataset, edits } = usePortfolioStore();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const gridRef = useRef<GridComponentType>(null);
  useEffect(() => { document.title = 'Risks & Dependencies · Portfolio Command Center'; }, []);

  const riskRows = useMemo<RiskRow[]>(() => {
    if (!dataset) return [];
    const scopeIds = [...dataset.projects.map((p) => p.id), ...dataset.portfolios.map((po) => po.id)];
    return openRisks(dataset, scopeIds).map((r) => {
      const project = dataset.projects.find((p) => p.id === r.scopeId);
      const portfolio = dataset.portfolios.find((po) => po.id === r.scopeId);
      return {
        ...r,
        score: riskScore(r.severity, r.probability),
        scopeLabel: project ? `${project.id} · ${project.name}` : `Portfolio · ${portfolio?.name ?? r.scopeId}`,
        projectId: project?.id ?? null,
      };
    });
  }, [dataset]);

  const counts = useMemo(() => ({
    open: riskRows.filter((r) => r.state === 'Open').length,
    mitigating: riskRows.filter((r) => r.state === 'Mitigating').length,
  }), [riskRows]);

  const { nodes, connectors, height, width } = useMemo(() => {
    const c = DIAGRAM[theme];
    const tones = palette(theme);
    if (!dataset) return { nodes: [] as NodeModel[], connectors: [] as ConnectorModel[], height: 400, width: 800 };
    const columns = dataset.portfolios.map((po) => ({
      portfolio: po,
      projects: dataset.projects.filter((p) => dataset.programs.find((pr) => pr.id === p.programId)?.portfolioId === po.id),
    }));
    const nodeModels: NodeModel[] = [];
    columns.forEach((col, ci) => {
      const x = LEFT + ci * (NODE_W + COL_GAP) + NODE_W / 2;
      // Column heading as a text node (not selectable).
      nodeModels.push({
        id: `head-${col.portfolio.id}`, offsetX: x, offsetY: 22, width: NODE_W, height: 28,
        shape: { type: 'Text', content: col.portfolio.name },
        style: { color: c.muted, fontSize: 13, bold: true, fill: 'transparent', strokeColor: 'transparent' },
        constraints: 0,
      } as NodeModel);
      col.projects.forEach((p, ri) => {
        const stroke = p.health === 'At risk' ? tones.danger : p.health === 'Watch' ? tones.warning : c.border;
        const stage = edits[p.id]?.field === 'stage' ? ` · ${edits[p.id]!.value}` : '';
        nodeModels.push({
          id: `dep-${p.id}`,
          offsetX: x, offsetY: TOP + ri * (NODE_H + ROW_GAP) + NODE_H / 2, width: NODE_W, height: NODE_H,
          shape: p.health === 'At risk' ? { type: 'Flow', shape: 'Terminator' } : { type: 'Basic', shape: 'Rectangle', cornerRadius: 6 },
          style: { fill: c.surface, strokeColor: stroke, strokeWidth: p.health === 'On track' ? 1 : 2 },
          annotations: [{ content: `${p.id} · ${p.name}\n${p.health}${stage}`, style: { fontSize: 11, color: c.text, textWrapping: 'Wrap' } }],
          tooltip: { content: `Open ${p.id} in the register` },
          ports: [
            { id: 'l', offset: { x: 0, y: 0.5 }, visibility: PortVisibility.Hidden },
            { id: 'r', offset: { x: 1, y: 0.5 }, visibility: PortVisibility.Hidden },
          ],
        } as NodeModel);
      });
    });
    const rows = Math.max(...columns.map((col) => col.projects.length));
    const columnOf = new Map(columns.flatMap((col, ci) => col.projects.map((p) => [p.id, ci] as const)));
    const connectorModels: ConnectorModel[] = dataset.dependencies.map((d) => {
      const strong = d.type !== 'Related';
      const from = columnOf.get(d.fromProjectId) ?? 0, to = columnOf.get(d.toProjectId) ?? 0;
      // Same column: both ends on the left, so the line runs in the gutter, not through the nodes between.
      const [sourcePortID, targetPortID] = from === to ? ['l', 'l'] : from < to ? ['r', 'l'] : ['l', 'r'];
      return {
        id: `con-${d.id}`,
        type: 'Orthogonal',
        cornerRadius: 6,
        sourceID: `dep-${d.fromProjectId}`,
        targetID: `dep-${d.toProjectId}`,
        sourcePortID, targetPortID,
        style: { strokeColor: strong ? c.text : c.line, strokeWidth: strong ? 1.5 : 1, strokeDashArray: d.type === 'Blocks' ? '5,4' : '' },
        targetDecorator: { shape: 'Arrow', width: 8, height: 8, style: { fill: strong ? c.text : c.line, strokeColor: strong ? c.text : c.line } },
        // Only the blocking links carry a label; "Related" lines stay quiet so labels never pile up.
        annotations: strong ? [{ content: d.type, offset: 0.5, width: 64, style: { fontSize: 10, color: c.text, fill: c.labelBg, textWrapping: 'NoWrap' } }] : [],
      } as ConnectorModel;
    });
    return {
      nodes: nodeModels,
      connectors: connectorModels,
      height: TOP + rows * (NODE_H + ROW_GAP) + 24,
      width: LEFT * 2 + columns.length * NODE_W + (columns.length - 1) * COL_GAP,
    };
  }, [dataset, edits, theme]);

  if (!load.ok || !dataset) {
    return <ErrorState title="We couldn't load the portfolio dataset." message={load.ok ? undefined : load.errors.join(' ')} />;
  }


  const onDiagramClick = (args: IClickEventArgs) => {
    const id = (args.actualObject as { id?: string } | undefined)?.id ?? '';
    if (id.startsWith('dep-')) navigate(`/register?project=${id.slice(4)}`);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Risks &amp; Dependencies</h1>
          <p data-testid="risk-summary">
            {riskRows.length} active risks ({counts.open} open, {counts.mitigating} mitigating) · {dataset.dependencies.length} cross-project dependencies
          </p>
        </div>
      </header>

      <section aria-label="Risk register">
        <article className="e-card panel-card">
          <PanelHeader title="Risk register"
            sub={riskRows[0]?.projectId
              ? <>Highest exposure first. Top: {riskRows[0].scopeLabel} · <Link to={`/register?project=${riskRows[0].projectId}`} className="text-link">Open project in register</Link></>
              : 'Highest exposure first'}
            actions={<HeaderSearch label="Search risks" onSearch={(value) => gridRef.current?.search(value)} />} />
          <div className="panel-body">
            {/* Reserve the rows height so the diagram card below does not jump when the grid draws. */}
            <div style={{ minHeight: 52 + riskRows.length * 62 }}>
            <GridComponent ref={gridRef} dataSource={riskRows} allowSorting height="auto" allowTextWrap
              textWrapSettings={{ wrapMode: 'Content' }} id="risk-grid">
              <ColumnsDirective>
                <ColumnDirective field="id" headerText="ID" isPrimaryKey width={72} />
                <ColumnDirective field="title" headerText="Risk" />
                <ColumnDirective field="scopeLabel" headerText="Scope"
                  template={(props: RiskRow) => props.projectId
                    ? <Link to={`/register?project=${props.projectId}`} className="mini-name" aria-label={`Open ${props.projectId} in the register`}>{props.scopeLabel}</Link>
                    : <span>{props.scopeLabel}</span>} />
                <ColumnDirective field="category" headerText="Category" width={110} />
                <ColumnDirective field="score" headerText="Exposure" width={180} template={(props: RiskRow) => <ScoreBadge row={props} />} />
                <ColumnDirective field="state" headerText="State" width={104} />
                <ColumnDirective field="owner" headerText="Owner" width={130} />
              </ColumnsDirective>
              <GridInject services={[Sort, Search]} />
            </GridComponent>
            </div>
            <p className="page-note">Exposure is severity × likelihood (each 1–5): 16 and above is high, 10–15 medium. Select a scope to open that project.</p>
          </div>
        </article>
      </section>

      <section aria-label="Cross-project dependencies">
        <article className="e-card panel-card">
          <div className="e-card-header">
            <div className="e-card-header-title">Cross-project dependencies</div>
          </div>
          <div className="panel-body">
            <div className="diagram-scroll" style={{ minHeight: height }}>
              <DiagramComponent key={theme} id="dependency-diagram" width={`${width}px`} height={`${height}px`}
                nodes={nodes} connectors={connectors} click={onDiagramClick}
                backgroundColor={DIAGRAM[theme].canvas}
                snapSettings={{ constraints: 0 } as never}>
                <DiagramInject services={[DataBinding]} />
              </DiagramComponent>
            </div>
            <p className="page-note">
              Columns are portfolios. Rounded ends and a red outline mark at-risk projects; amber outlines mark watch.
              Solid labelled arrows read "Blocked by", dashed ones "Blocks"; thin grey lines are related work. Select a project to open it in the register.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
