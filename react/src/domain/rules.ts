// Pure portfolio rules and selectors (contracts/data-contract.md, "Queries and commands").
// Erasable TypeScript only; no React or Syncfusion imports.
import type { Allocation, Dependency, Health, Milestone, PortfolioDataset, Project, SessionState, Stage, TrendPoint } from './types';
import { DEMO_TODAY } from './types';

export const STAGES: readonly Stage[] = ['Planning', 'Prioritized', 'In flight', 'Gate review', 'Closed'];
export const STAGE_ORDER: Record<Stage, number> = { Planning: 0, Prioritized: 1, 'In flight': 2, 'Gate review': 3, Closed: 4 };

export const today = (): Date => new Date(`${DEMO_TODAY}T00:00:00`);

/** A project's effective stage: the session edit wins over the baseline (V-cases). */
export function stageOf(project: Project, session: SessionState): Stage {
  const edit = session[project.id];
  return edit && edit.field === 'stage' ? edit.value : project.stage;
}

export const projectById = (data: PortfolioDataset, id: string): Project | undefined =>
  data.projects.find((p) => p.id === id);

export function portfolioOf(data: PortfolioDataset, project: Project) {
  const program = data.programs.find((pr) => pr.id === project.programId);
  return program ? data.portfolios.find((po) => po.id === program.portfolioId) : undefined;
}

export function projectsOfPortfolio(data: PortfolioDataset, portfolioId: string): Project[] {
  const programs = new Set(data.programs.filter((pr) => pr.portfolioId === portfolioId).map((pr) => pr.id));
  return data.projects.filter((p) => programs.has(p.programId));
}

/** Count of projects by stage across a set of projects, session edits applied. */
export function stageCounts(projects: readonly Project[], session: SessionState): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const p of projects) counts[stageOf(p, session)] += 1;
  return counts;
}

/** Health distribution across a set of projects (baseline only; health is not session-editable). */
export function healthCounts(projects: readonly Project[]): Record<Health, number> {
  const counts = { 'On track': 0, Watch: 0, 'At risk': 0 } as Record<Health, number>;
  for (const p of projects) counts[p.health] += 1;
  return counts;
}

export function budgetTotals(projects: readonly Project[]) {
  let planned = 0, forecast = 0;
  for (const p of projects) { planned += p.plannedBudget; forecast += p.forecastBudget; }
  return { planned, forecast, variance: forecast - planned, varianceRatio: planned > 0 ? (forecast - planned) / planned : 0 };
}

/** Portfolio budget variance ratio, judged against the dataset's KPI bands. */
export function healthOfVariance(varianceRatio: number, data: PortfolioDataset): Health {
  const t = data.kpiTargets;
  const abs = Math.abs(varianceRatio);
  if (abs <= t.varianceGood) return 'On track';
  if (abs <= t.varianceBorderline) return 'Watch';
  return 'At risk';
}

/** Milestone on-time ratio for a set of projects: completed-on-time / completed, against demo-today. */
export function onTimeRatio(data: PortfolioDataset, projects: readonly Project[]): { ratio: number; onTime: number; completed: number } {
  const ids = new Set(projects.map((p) => p.id));
  let onTime = 0, completed = 0;
  for (const m of data.milestones) {
    if (!ids.has(m.projectId)) continue;
    if (m.status === 'Completed') {
      completed += 1;
      if (m.dueDate <= m.baselineDate) onTime += 1;
    }
  }
  return { ratio: completed > 0 ? onTime / completed : 1, onTime, completed };
}

export function milestonesOf(data: PortfolioDataset, projectId: string): Milestone[] {
  return data.milestones.filter((m) => m.projectId === projectId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Utilization: allocated person-months / capacity for one month. */
export function utilization(allocations: readonly Allocation[], resources: readonly { id: string; monthlyCapacity: number }[], month: string): { ratio: number; allocated: number; capacity: number } {
  const allocated = allocations.filter((a) => a.month === month).reduce((sum, a) => sum + a.personMonths, 0);
  const capacity = resources.reduce((sum, r) => sum + r.monthlyCapacity, 0);
  return { ratio: capacity > 0 ? allocated / capacity : 0, allocated, capacity };
}

/** Milestones due within the next N days of demo-today (inclusive window [today, today+N)). */
export function upcomingMilestones(data: PortfolioDataset, withinDays: number): Milestone[] {
  const start = new Date(`${DEMO_TODAY}T00:00:00`);
  const end = new Date(start); end.setDate(end.getDate() + withinDays);
  const endStr = end.toISOString().slice(0, 10);
  return data.milestones.filter((m) => m.dueDate >= DEMO_TODAY && m.dueDate < endStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Open risks for a scope, severity x probability score, highest first. */
export function riskScore(severity: number, probability: number): number {
  return severity * probability;
}

export function openRisks(data: PortfolioDataset, scopeIds: readonly string[]) {
  const ids = new Set(scopeIds);
  return data.risks
    .filter((r) => ids.has(r.scopeId) && r.state !== 'Closed')
    .sort((a, b) => riskScore(b.severity, b.probability) - riskScore(a.severity, a.probability));
}

/** Dependency pairs as Diagram nodes/edges need them (cycle-free is validated at load). */
export function dependencyEdges(data: PortfolioDataset): Dependency[] {
  return data.dependencies;
}

export function trendFor(data: PortfolioDataset, portfolioId: string): TrendPoint[] {
  return data.kpiSnapshots[portfolioId] ?? [];
}

/** Allowed stage moves (contracts/data-contract.md, "Allowed transitions"):
 *  Planning<->Prioritized<->In flight -> Gate review -> Closed, and a Closed project may reopen to
 *  Gate review. Every other jump (skipping a stage, or Gate review back to In flight) is denied. */
export function allowedMove(from: Stage, to: Stage): boolean {
  if (STAGE_ORDER[to] === STAGE_ORDER[from] + 1) return true;
  return STAGE_ORDER[to] === STAGE_ORDER[from] - 1 && from !== 'Gate review';
}

export const months = (from: string, count: number): string[] => {
  const out: string[] = [];
  const d = new Date(`${from}-01T00:00:00Z`);
  for (let i = 0; i < count; i += 1) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + i, 1));
    out.push(`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
};