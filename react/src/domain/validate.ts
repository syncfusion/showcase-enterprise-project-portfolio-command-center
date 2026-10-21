// Validates the dataset at load (contracts/data-contract.md). Returns every problem found.
import type { PortfolioDataset, Project, Milestone, Risk, Dependency } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const int = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const STAGES = ['Planning', 'Prioritized', 'In flight', 'Gate review', 'Closed'] as const;
const HEALTHS = ['On track', 'Watch', 'At risk'] as const;
const MSTATUSES = ['Completed', 'On track', 'Late'] as const;
const DEPTYPES = ['Blocks', 'Blocked by', 'Related'] as const;
const RISKSTATES = ['Open', 'Mitigating', 'Closed'] as const;
const ROLES = ['PM', 'Dev', 'QA', 'UX', 'Data', 'Cloud'] as const;

const date = (v: unknown): v is string => text(v) && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v));
const month = (v: unknown): v is string => text(v) && MONTH.test(v) && !Number.isNaN(Date.parse(`${v}-01`));

export function validateDataset(input: unknown): string[] {
  const errors: string[] = [];
  const d = input as Partial<PortfolioDataset> | null;
  if (!d || typeof d !== 'object') return ['The dataset is not an object.'];
  if (d.schemaVersion !== 1) errors.push(`schemaVersion must be 1 (found ${String(d.schemaVersion)}).`);
  if (!int(d.fixtureVersion) || d.fixtureVersion < 1) errors.push('fixtureVersion must be an integer of 1 or more.');
  if (!text(d.group)) errors.push('group is required.');

  const where = (n: string, id: unknown) => `${n} "${String(id ?? '?')}"`;

  // Portfolios
  const portfolios = d.portfolios;
  if (!Array.isArray(portfolios) || portfolios.length < 2) errors.push('portfolios must hold 2 or more entries.');
  const portfolioIds = new Set<string>();
  for (const p of portfolios ?? []) {
    if (!text(p?.id)) { errors.push('portfolio id is required.'); continue; }
    if (portfolioIds.has(p.id)) errors.push(`${where('Portfolio', p.id)}: duplicate id.`);
    portfolioIds.add(p.id);
    if (!text(p.name)) errors.push(`${where('Portfolio', p.id)}: name is required.`);
  }

  // Programs
  const programs = d.programs;
  if (!Array.isArray(programs) || programs.length < 2) errors.push('programs must hold 2 or more entries.');
  const programIds = new Set<string>();
  for (const pr of programs ?? []) {
    if (!text(pr?.id)) { errors.push('program id is required.'); continue; }
    if (programIds.has(pr.id)) errors.push(`${where('Program', pr.id)}: duplicate id.`);
    programIds.add(pr.id);
    if (!portfolioIds.has(pr.portfolioId)) errors.push(`${where('Program', pr.id)}: portfolioId "${pr.portfolioId}" does not exist.`);
    if (!text(pr.name) || !text(pr.sponsor)) errors.push(`${where('Program', pr.id)}: name and sponsor are required.`);
  }

  // Projects
  const projects = d.projects;
  if (!Array.isArray(projects) || projects.length < 8) errors.push('projects must hold 8 or more entries.');
  const projectIds = new Set<string>();
  for (const p of (projects ?? []) as Project[]) {
    if (!text(p?.id)) { errors.push('project id is required.'); continue; }
    if (projectIds.has(p.id)) errors.push(`${where('Project', p.id)}: duplicate id.`);
    projectIds.add(p.id);
    if (!programIds.has(p.programId)) errors.push(`${where('Project', p.id)}: programId "${p.programId}" does not exist.`);
    if (!text(p.name) || !text(p.manager)) errors.push(`${where('Project', p.id)}: name and manager are required.`);
    if (!STAGES.includes(p.stage)) errors.push(`${where('Project', p.id)}: stage must be one of ${STAGES.join(', ')}.`);
    if (!HEALTHS.includes(p.health)) errors.push(`${where('Project', p.id)}: health must be one of ${HEALTHS.join(', ')}.`);
    if (!date(p.start) || !date(p.end)) errors.push(`${where('Project', p.id)}: start and end must be ISO dates.`);
    else if (p.end <= p.start) errors.push(`${where('Project', p.id)}: end must be after start.`);
    if (!int(p.plannedBudget) || p.plannedBudget < 0) errors.push(`${where('Project', p.id)}: plannedBudget must be 0 or more.`);
    if (!int(p.forecastBudget) || p.forecastBudget < 0) errors.push(`${where('Project', p.id)}: forecastBudget must be 0 or more.`);
    if (!int(p.priority) || p.priority < 1 || p.priority > 5) errors.push(`${where('Project', p.id)}: priority must be 1 to 5.`);
    if (!int(p.completion) || p.completion < 0 || p.completion > 100) errors.push(`${where('Project', p.id)}: completion must be 0 to 100.`);
  }
  if (projectIds.size > 0 && projectIds.size < 16) errors.push(`projects must hold at least 16 entries (found ${projectIds.size}).`);

  // Milestones
  const milestoneIds = new Set<string>();
  for (const m of (d.milestones ?? []) as Milestone[]) {
    if (!text(m?.id)) { errors.push('milestone id is required.'); continue; }
    if (milestoneIds.has(m.id)) errors.push(`${where('Milestone', m.id)}: duplicate id.`);
    milestoneIds.add(m.id);
    if (!projectIds.has(m.projectId)) errors.push(`${where('Milestone', m.id)}: projectId "${m.projectId}" does not exist.`);
    if (!text(m.name)) errors.push(`${where('Milestone', m.id)}: name is required.`);
    if (!date(m.dueDate) || !date(m.baselineDate)) errors.push(`${where('Milestone', m.id)}: dueDate and baselineDate must be ISO dates.`);
    if (!MSTATUSES.includes(m.status)) errors.push(`${where('Milestone', m.id)}: status must be one of ${MSTATUSES.join(', ')}.`);
  }

  // Resources & allocations
  const resourceIds = new Set<string>();
  for (const r of d.resources ?? []) {
    if (!text(r?.id)) { errors.push('resource id is required.'); continue; }
    if (resourceIds.has(r.id)) errors.push(`${where('Resource', r.id)}: duplicate id.`);
    resourceIds.add(r.id);
    if (!text(r.name) || !ROLES.includes(r.role)) errors.push(`${where('Resource', r.id)}: name and a valid role are required.`);
    if (!int(r.monthlyCapacity) || r.monthlyCapacity <= 0) errors.push(`${where('Resource', r.id)}: monthlyCapacity must be above 0.`);
  }
  if (resourceIds.size < 8) errors.push(`resources must hold at least 8 entries (found ${resourceIds.size}).`);
  for (const a of d.allocations ?? []) {
    if (!resourceIds.has(a?.resourceId)) errors.push(`allocation: resourceId "${String(a?.resourceId)}" does not exist.`);
    if (!projectIds.has(a?.projectId)) errors.push(`allocation: projectId "${String(a?.projectId)}" does not exist.`);
    if (!month(a?.month)) errors.push(`allocation: month "${String(a?.month)}" must be YYYY-MM.`);
    if (!int(a?.personMonths) || a.personMonths < 0) errors.push('allocation: personMonths must be 0 or more.');
  }

  // Risks
  const riskIds = new Set<string>();
  for (const r of (d.risks ?? []) as Risk[]) {
    if (!text(r?.id)) { errors.push('risk id is required.'); continue; }
    if (riskIds.has(r.id)) errors.push(`${where('Risk', r.id)}: duplicate id.`);
    riskIds.add(r.id);
    const known = r.scope === 'project' ? projectIds.has(r.scopeId) : portfolioIds.has(r.scopeId);
    if (!known) errors.push(`${where('Risk', r.id)}: scopeId "${r.scopeId}" does not exist as ${r.scope}.`);
    if (!text(r.title) || !text(r.category) || !text(r.owner)) errors.push(`${where('Risk', r.id)}: title, category and owner are required.`);
    if (!int(r.severity) || r.severity < 1 || r.severity > 5) errors.push(`${where('Risk', r.id)}: severity must be 1 to 5.`);
    if (!int(r.probability) || r.probability < 1 || r.probability > 5) errors.push(`${where('Risk', r.id)}: probability must be 1 to 5.`);
    if (!RISKSTATES.includes(r.state)) errors.push(`${where('Risk', r.id)}: state must be one of ${RISKSTATES.join(', ')}.`);
  }
  if (riskIds.size < 10) errors.push(`risks must hold at least 10 entries (found ${riskIds.size}).`);

  // Dependencies: cycle-free, endpoints exist
  const depIds = new Set<string>();
  const edges = new Map<string, string>();
  for (const dep of (d.dependencies ?? []) as Dependency[]) {
    if (!text(dep?.id)) { errors.push('dependency id is required.'); continue; }
    if (depIds.has(dep.id)) errors.push(`${where('Dependency', dep.id)}: duplicate id.`);
    depIds.add(dep.id);
    if (!projectIds.has(dep.fromProjectId) || !projectIds.has(dep.toProjectId)) {
      errors.push(`${where('Dependency', dep.id)}: both endpoints must be known projects.`);
    } else if (dep.fromProjectId === dep.toProjectId) {
      errors.push(`${where('Dependency', dep.id)}: a project cannot depend on itself.`);
    } else {
      edges.set(dep.fromProjectId, dep.toProjectId);
    }
    if (!DEPTYPES.includes(dep.type)) errors.push(`${where('Dependency', dep.id)}: type must be one of ${DEPTYPES.join(', ')}.`);
    if (!text(dep.description)) errors.push(`${where('Dependency', dep.id)}: description is required.`);
  }
  if (edges.size > 0) {
    const follows = (from: string, seen: Set<string>): boolean => {
      if (seen.has(from)) return false;
      seen.add(from);
      const next = edges.get(from);
      return next === undefined ? true : follows(next, seen);
    };
    for (const from of edges.keys()) if (!follows(from, new Set())) { errors.push('dependencies must be cycle-free.'); break; }
  }

  // KPI targets & snapshots
  const t = d.kpiTargets;
  if (!t || !int(t.onTimeGood) || !int(t.onTimeBorderline) || !int(t.varianceGood) || !int(t.varianceBorderline) || !int(t.utilizationFull)) {
    errors.push('kpiTargets is incomplete.');
  }
  const snapshots = d.kpiSnapshots ?? {};
  for (const key of Object.keys(snapshots)) {
    if (!portfolioIds.has(key)) errors.push(`kpiSnapshots: portfolio "${key}" does not exist.`);
    const points = snapshots[key] ?? [];
    if (!Array.isArray(points) || points.length < 6) errors.push(`kpiSnapshots["${key}"] must hold 6 or more monthly points.`);
    for (const p of points) {
      if (!month(p?.month)) errors.push(`kpiSnapshots["${key}"]: bad month "${String(p?.month)}".`);
      for (const k of ['onTimeRatio', 'varianceRatio', 'utilizationRatio'] as const) {
        const v = p?.[k];
        if (!int(v) || v < -1 || v > 2) errors.push(`kpiSnapshots["${key}"] ${p?.month}: ${k} must be a ratio.`);
      }
    }
  }
  return errors;
}