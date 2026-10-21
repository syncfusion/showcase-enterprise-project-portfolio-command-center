// Generates public/data/eppcc.v1.json deterministically (contracts/data-contract.md).
// Run: node scripts/generate-fixture.mjs   (writes the fixture; stable IDs, demo-today 2026-10-16)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'data', 'eppcc.v1.json');
const DEMO_TODAY = '2026-10-16';
// Every resource is one person: one person-month of capacity a month.
const CAPACITY = { PM: 1, Dev: 1, QA: 1, UX: 1, Data: 1, Cloud: 1 };

const portfolios = [
  { id: 'po-01', name: 'Digital Core', description: 'Modernize the systems the business runs on: ERP, finance platform, data foundations.' },
  { id: 'po-02', name: 'Growth Ventures', description: 'New revenue streams: partner portal, self-service onboarding, market experiments.' },
  { id: 'po-03', name: 'Operations Excellence', description: 'Run the business better: supply chain visibility, service desk, work automation.' },
];

const programs = [
  { id: 'pr-101', portfolioId: 'po-01', name: 'Finance & ERP Modernization', sponsor: 'Dana Whitfield (CFO)' },
  { id: 'pr-102', portfolioId: 'po-01', name: 'Data Foundations', sponsor: 'Dana Whitfield (CFO)' },
  { id: 'pr-201', portfolioId: 'po-02', name: 'Partner Platform', sponsor: 'Marcus Chen (CRO)' },
  { id: 'pr-202', portfolioId: 'po-02', name: 'Customer Onboarding', sponsor: 'Marcus Chen (CRO)' },
  { id: 'pr-301', portfolioId: 'po-03', name: 'Service & Support', sponsor: 'Priya Natarajan (COO)' },
];

// name, manager, stage, health, start, end, planned, forecast, priority, completion
const projectsRaw = [
  ['P-101', 'pr-101', 'ERP Core Replacement', 'Alma Reyes', 'In flight', 'At risk', '2026-04-01', '2027-03-31', 6_400_000, 7_480_000, 1, 46],
  ['P-102', 'pr-101', 'Finance Close Automation', 'Tom Baldwin', 'In flight', 'Watch', '2026-05-01', '2026-12-31', 1_450_000, 1_586_000, 2, 58],
  ['P-103', 'pr-101', 'Procurement Self-Service', 'Ivy Chen', 'Prioritized', 'On track', '2026-11-01', '2027-06-30', 1_800_000, 1_780_000, 3, 4],
  ['P-104', 'pr-101', 'Consolidated Ledger Migration', 'Nadia Osman', 'Planning', 'On track', '2027-01-04', '2027-09-30', 2_650_000, 2_650_000, 2, 0],
  ['P-105', 'pr-102', 'Enterprise Data Lake', 'Ravi Shankar', 'In flight', 'Watch', '2026-03-02', '2027-02-26', 4_200_000, 4_520_000, 1, 61],
  ['P-106', 'pr-102', 'Governance & Catalog Rollout', 'Hana Suzuki', 'Gate review', 'On track', '2026-02-02', '2026-11-27', 950_000, 918_000, 3, 88],
  ['P-107', 'pr-102', 'Real-Time Reporting Pipeline', 'Luis Ortega', 'Prioritized', 'On track', '2026-10-01', '2027-04-30', 1_600_000, 1_640_000, 2, 8],
  ['P-108', 'pr-102', 'ML Feature Store', 'Freya Lindqvist', 'Planning', 'Watch', '2027-01-04', '2027-08-31', 1_250_000, 1_310_000, 4, 0],
  ['P-201', 'pr-201', 'Partner Portal Launch', 'Omar Haddad', 'In flight', 'Watch', '2026-04-01', '2026-12-18', 2_300_000, 2_452_000, 1, 55],
  ['P-202', 'pr-201', 'Referral Engine', 'Grace Kim', 'Prioritized', 'On track', '2026-11-02', '2027-05-28', 780_000, 765_000, 4, 5],
  ['P-203', 'pr-201', 'Partner API Gateway', 'Derek Novak', 'Gate review', 'On track', '2026-02-02', '2026-10-30', 1_150_000, 1_138_000, 3, 82],
  ['P-204', 'pr-202', 'Onboarding Journey Redesign', 'Sofia Marchetti', 'In flight', 'On track', '2026-03-02', '2026-11-27', 1_400_000, 1_396_000, 2, 66],
  ['P-205', 'pr-202', ' KYC Document Automation', 'Ahmed Farouk', 'Planning', 'At risk', '2027-01-04', '2027-07-30', 900_000, 1_012_000, 3, 0],
  ['P-206', 'pr-202', 'Billing Self-Service', 'Chloe Dubois', 'Prioritized', 'On track', '2026-10-01', '2027-03-31', 1_050_000, 1_048_000, 4, 6],
  ['P-301', 'pr-301', 'Service Desk Consolidation', 'Ruth Abela', 'In flight', 'On track', '2026-04-01', '2026-11-13', 1_250_000, 1_238_000, 2, 72],
  ['P-302', 'pr-301', 'Field Service Mobile App', 'Jonas Weber', 'In flight', 'Watch', '2026-05-01', '2027-01-29', 1_650_000, 1_728_000, 2, 48],
  ['P-303', 'pr-301', 'Knowledge Base Revamp', 'Mei Tanaka', 'Closed', 'On track', '2026-01-05', '2026-08-28', 640_000, 622_000, 5, 100],
  ['P-304', 'pr-301', 'Work Automation Bot Kit', 'Sam Okafor', 'Planning', 'On track', '2027-01-04', '2027-06-30', 820_000, 820_000, 4, 0],
  ['P-305', 'pr-301', 'Assets & Depot Digitisation', 'Lena Petrova', 'Prioritized', 'Watch', '2026-12-01', '2027-07-30', 1_300_000, 1_364_000, 3, 2],
];

// Trim leading space in P-205's name
const projects = projectsRaw.map(([id, programId, name, manager, stage, health, start, end, planned, forecast, priority, completion]) =>
  ({ id, programId, name: name.trim(), manager, stage, health, start, end, plannedBudget: planned, forecastBudget: forecast, priority, completion }));

// Milestones: four phase gates per project, placed through the project's own life (scope at 8%,
// design at 35%, build at 65%, go-live at 95% of its duration), so they run in order and only
// projects under way have completed ones. dueDate is the actual (completed) or forecast date;
// the slip from baseline follows project health, so on-time delivery is believable, not 100%.
// Status against demo-today: Completed (due date passed), Late (baseline passed, not done),
// On track (still ahead).
const PHASES = [['Scope signed off', 0.08], ['Design complete', 0.35], ['Build complete', 0.65], ['Go-live', 0.95]];
const DAY = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);
const utc = (s) => new Date(`${s}T00:00:00Z`);
let mid = 200;
const milestones = [];
for (const p of projects) {
  const start = utc(p.start), end = utc(p.end);
  const hash = [...p.id].reduce((s, c) => s + c.charCodeAt(0), 0);
  PHASES.forEach(([name, at], i) => {
    mid += 1;
    const baseline = new Date(start.getTime() + Math.round(((end - start) / DAY) * at) * DAY);
    // Days late (+) or early (-) against baseline: on-track projects land on or before it (one gate
    // slips a little), watch projects drift either side, at-risk projects run late.
    const slip = p.health === 'At risk' ? 4 + ((hash + 5 * i) % 12)
      : p.health === 'Watch' ? ((hash + 3 * i) % 6) - 4
      : (hash + i) % 7 === 0 ? 2 : -((hash + i) % 4);
    const due = new Date(baseline.getTime() + slip * DAY);
    const status = p.stage === 'Closed' || iso(due) < DEMO_TODAY ? 'Completed'
      : iso(baseline) < DEMO_TODAY ? 'Late' : 'On track';
    milestones.push({ id: `M-${mid}`, projectId: p.id, name, dueDate: iso(due), baselineDate: iso(baseline), status });
  });
}

const resources = [
  { id: 'R-301', name: 'Alma Reyes', role: 'PM', monthlyCapacity: CAPACITY.PM },
  { id: 'R-302', name: 'Ravi Shankar', role: 'Data', monthlyCapacity: CAPACITY.Data },
  { id: 'R-303', name: 'Hana Suzuki', role: 'Data', monthlyCapacity: CAPACITY.Data },
  { id: 'R-304', name: 'Omar Haddad', role: 'Dev', monthlyCapacity: CAPACITY.Dev },
  { id: 'R-305', name: 'Sofia Marchetti', role: 'UX', monthlyCapacity: CAPACITY.UX },
  { id: 'R-306', name: 'Derek Novak', role: 'Cloud', monthlyCapacity: CAPACITY.Cloud },
  { id: 'R-307', name: 'Ruth Abela', role: 'PM', monthlyCapacity: CAPACITY.PM },
  { id: 'R-308', name: 'Jonas Weber', role: 'Dev', monthlyCapacity: CAPACITY.Dev },
  { id: 'R-309', name: 'Mei Tanaka', role: 'QA', monthlyCapacity: CAPACITY.QA },
  { id: 'R-310', name: 'Sam Okafor', role: 'Dev', monthlyCapacity: CAPACITY.Dev },
  { id: 'R-311', name: 'Lena Petrova', role: 'QA', monthlyCapacity: CAPACITY.QA },
  { id: 'R-312', name: 'Freya Lindqvist', role: 'Data', monthlyCapacity: CAPACITY.Data },
  { id: 'R-313', name: 'Ahmed Farouk', role: 'Cloud', monthlyCapacity: CAPACITY.Cloud },
  { id: 'R-314', name: 'Chloe Dubois', role: 'Dev', monthlyCapacity: CAPACITY.Dev },
  { id: 'R-315', name: 'Luis Ortega', role: 'Data', monthlyCapacity: CAPACITY.Data },
  { id: 'R-316', name: 'Nadia Osman', role: 'PM', monthlyCapacity: CAPACITY.PM },
  { id: 'R-317', name: 'Ivy Chen', role: 'UX', monthlyCapacity: CAPACITY.UX },
  { id: 'R-318', name: 'Tom Baldwin', role: 'Dev', monthlyCapacity: CAPACITY.Dev },
];

// Allocations: 7 months to 2026-10 (the current month). Each live project (from the month before
// it starts to its end month) is staffed by role: its manager when they are on the resource list,
// the program's lead specialist, a developer, QA from 35% of the way through, and UX for the first
// half. Shares ramp: light while mobilizing, heavier in the last two months. The deterministic
// round-robin leaves a few people over 100% in the busy autumn months: the over-allocation story.
const MONTHS = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
const allocations = [];
let aid = 400;
const byName = new Map(resources.map((r) => [r.name, r]));
const ofRole = (role) => resources.filter((r) => r.role === role);
const LEAD = { 'pr-101': 'Tom Baldwin', 'pr-102': 'Hana Suzuki', 'pr-201': 'Derek Novak', 'pr-202': 'Ahmed Farouk', 'pr-301': 'Chloe Dubois' };
const monthIndex = (month) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
projects.forEach((p, pi) => {
  if (p.stage === 'Planning') return; // planning projects are not staffed yet
  const first = monthIndex(p.start.slice(0, 7)), last = monthIndex(p.end.slice(0, 7));
  const pick = (role, offset = 0) => { const list = ofRole(role); return list[(pi + offset) % list.length]; };
  for (const month of MONTHS) {
    const at = monthIndex(month);
    if (at < first - 1 || at > last) continue;
    const progress = (at - first) / Math.max(1, last - first);
    const ramp = at < first ? 0.5 : last - at <= 1 ? 1.25 : 1;
    const portfolio = programs.find((pr) => pr.id === p.programId).portfolioId;
    const team = [
      [byName.get(p.manager)?.role === 'PM' ? byName.get(p.manager) : pick('PM'), 0.2],
      [byName.get(LEAD[p.programId]), 0.25],
      [pick('Dev', 1), 0.3],
      [pick(portfolio === 'po-01' ? 'Data' : portfolio === 'po-02' ? 'Cloud' : 'Dev', 2), 0.25],
      ...(progress >= 0.35 ? [[pick('QA'), 0.2]] : []),
      ...(progress < 0.5 ? [[pick('UX'), 0.2]] : []),
    ];
    for (const [r, share] of team) {
      if (!r) continue;
      const personMonths = Math.round(share * ramp * 20) / 20;
      if (personMonths <= 0) continue;
      aid += 1;
      allocations.push({ id: `A-${aid}`, resourceId: r.id, projectId: p.id, month, personMonths });
    }
  }
});

const risks = [
  { id: 'K-501', scopeId: 'P-101', scope: 'project', title: 'ERP data migration scope creep', category: 'Scope', severity: 5, probability: 4, state: 'Open', owner: 'Alma Reyes' },
  { id: 'K-502', scopeId: 'P-101', scope: 'project', title: 'Cutover window conflicts with fiscal close', category: 'Schedule', severity: 4, probability: 4, state: 'Mitigating', owner: 'Alma Reyes' },
  { id: 'K-503', scopeId: 'P-105', scope: 'project', title: 'Data lake vendor lock-in', category: 'Vendor', severity: 3, probability: 3, state: 'Open', owner: 'Ravi Shankar' },
  { id: 'K-504', scopeId: 'P-108', scope: 'project', title: 'ML platform skills gap', category: 'Resource', severity: 4, probability: 4, state: 'Open', owner: 'Freya Lindqvist' },
  { id: 'K-505', scopeId: 'P-201', scope: 'project', title: 'Partner API rate limits', category: 'Technical', severity: 3, probability: 4, state: 'Mitigating', owner: 'Omar Haddad' },
  { id: 'K-506', scopeId: 'P-205', scope: 'project', title: 'KYC regulatory change late in plan', category: 'Compliance', severity: 5, probability: 3, state: 'Open', owner: 'Ahmed Farouk' },
  { id: 'K-507', scopeId: 'P-302', scope: 'project', title: 'Field device fragmentation', category: 'Technical', severity: 3, probability: 3, state: 'Open', owner: 'Jonas Weber' },
  { id: 'K-508', scopeId: 'po-02', scope: 'portfolio', title: 'Partner revenue targets unvalidated', category: 'Financial', severity: 4, probability: 4, state: 'Open', owner: 'Marcus Chen' },
  { id: 'K-509', scopeId: 'po-01', scope: 'portfolio', title: 'ERP vendor price escalation', category: 'Financial', severity: 4, probability: 3, state: 'Mitigating', owner: 'Dana Whitfield' },
  { id: 'K-510', scopeId: 'P-102', scope: 'project', title: 'Close calendar dependency on ERP', category: 'Dependency', severity: 3, probability: 4, state: 'Open', owner: 'Tom Baldwin' },
  { id: 'K-511', scopeId: 'P-204', scope: 'project', title: 'Onboarding funnel drop-off persists', category: 'Adoption', severity: 3, probability: 2, state: 'Mitigating', owner: 'Sofia Marchetti' },
  { id: 'K-512', scopeId: 'P-301', scope: 'project', title: 'Service desk agent resistance', category: 'Change', severity: 2, probability: 3, state: 'Open', owner: 'Ruth Abela' },
  { id: 'K-513', scopeId: 'P-107', scope: 'project', title: 'Streaming latency SLO risk', category: 'Technical', severity: 4, probability: 3, state: 'Open', owner: 'Luis Ortega' },
  { id: 'K-514', scopeId: 'po-03', scope: 'portfolio', title: 'Field rollout seasonal peak', category: 'Schedule', severity: 2, probability: 4, state: 'Mitigating', owner: 'Priya Natarajan' },
];

const dependencies = [
  { id: 'D-601', fromProjectId: 'P-102', toProjectId: 'P-101', type: 'Blocked by', description: 'Finance close automation waits on ERP core general ledger.' },
  { id: 'D-602', fromProjectId: 'P-104', toProjectId: 'P-101', type: 'Blocked by', description: 'Ledger migration follows ERP core completion.' },
  { id: 'D-603', fromProjectId: 'P-101', toProjectId: 'P-302', type: 'Related', description: 'ERP asset data feeds the field service catalogue.' },
  { id: 'D-604', fromProjectId: 'P-107', toProjectId: 'P-105', type: 'Related', description: 'Real-time reporting rides the data lake streams.' },
  { id: 'D-605', fromProjectId: 'P-201', toProjectId: 'P-106', type: 'Related', description: 'Partner portal metrics use governed catalog definitions.' },
  { id: 'D-606', fromProjectId: 'P-202', toProjectId: 'P-201', type: 'Related', description: 'Onboarding redirects partners to the portal.' },
  { id: 'D-607', fromProjectId: 'P-204', toProjectId: 'P-205', type: 'Related', description: 'KYC automation picks up the redesigned journey inputs.' },
  { id: 'D-608', fromProjectId: 'P-206', toProjectId: 'P-305', type: 'Related', description: 'Billing self-service shares depot asset codes.' },
  { id: 'D-609', fromProjectId: 'P-303', toProjectId: 'P-301', type: 'Related', description: 'Service desk consumes the knowledge base.' },
  { id: 'D-610', fromProjectId: 'P-302', toProjectId: 'P-303', type: 'Related', description: 'Field app links knowledge articles.' },
  { id: 'D-611', fromProjectId: 'P-304', toProjectId: 'P-301', type: 'Related', description: 'Bot kit escalates through the consolidated desk.' },
  { id: 'D-612', fromProjectId: 'P-305', toProjectId: 'P-304', type: 'Related', description: 'Depot digitisation uses the bot kit.' },
  { id: 'D-613', fromProjectId: 'P-103', toProjectId: 'P-104', type: 'Related', description: 'Procurement self-service maps supplier ledgers after migration.' },
  { id: 'D-614', fromProjectId: 'P-105', toProjectId: 'P-108', type: 'Blocks', description: 'Feature store builds on lake governance outcomes.' },
];

// Monthly KPI snapshots 2026-04 .. 2026-10 (7 points), per portfolio, deterministic.
const snapMonths = MONTHS;
const kpiSnapshots = {};
const portfolioTrends = {
  'po-01': { onTime: [0.82, 0.84, 0.83, 0.86, 0.85, 0.83, 0.81], var: [0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12], util: [0.88, 0.92, 0.94, 0.95, 0.96, 0.97, 0.98] },
  'po-02': { onTime: [0.90, 0.92, 0.91, 0.93, 0.92, 0.91, 0.90], var: [0.02, 0.03, 0.03, 0.04, 0.04, 0.05, 0.05], util: [0.78, 0.80, 0.83, 0.85, 0.86, 0.87, 0.88] },
  'po-03': { onTime: [0.88, 0.89, 0.90, 0.91, 0.90, 0.92, 0.93], var: [0.03, 0.02, 0.04, 0.03, 0.05, 0.04, 0.04], util: [0.72, 0.75, 0.78, 0.80, 0.82, 0.84, 0.85] },
};
// On-time share per month is computed from the milestones themselves: gates completed by the end of
// that month, delivered on or before baseline (so the trend ends where the scorecard KPI sits).
const portfolioOfProject = (p) => programs.find((pr) => pr.id === p.programId).portfolioId;
const onTimeBy = (po, month) => {
  const ids = new Set(projects.filter((p) => portfolioOfProject(p) === po).map((p) => p.id));
  const done = milestones.filter((m) => ids.has(m.projectId) && m.status === 'Completed' && m.dueDate.slice(0, 7) <= month);
  return done.length ? Math.round((done.filter((m) => m.dueDate <= m.baselineDate).length / done.length) * 100) / 100 : 1;
};
for (const [po, t] of Object.entries(portfolioTrends)) {
  kpiSnapshots[po] = snapMonths.map((month, i) => ({
    month,
    onTimeRatio: onTimeBy(po, month),
    varianceRatio: t.var[i],
    utilizationRatio: t.util[i],
  }));
}

const dataset = {
  schemaVersion: 1,
  fixtureVersion: 1,
  group: 'Northwind Enterprises',
  portfolios, programs, projects, milestones, resources, allocations, risks, dependencies,
  kpiTargets: {
    onTimeGood: 0.90,
    onTimeBorderline: 0.80,
    varianceGood: 0.05,
    varianceBorderline: 0.10,
    utilizationFull: 1,
  },
  kpiSnapshots,
  demoToday: DEMO_TODAY,
};

// Self-checks (unit-tested too): counts, unique ids, cycle-free, budget totals.
const ids = new Set();
for (const list of [portfolios, programs, projects, milestones, resources, risks, dependencies]) {
  for (const item of list) {
    if (ids.has(item.id)) throw new Error(`duplicate id ${item.id}`);
    ids.add(item.id);
  }
}
const edgeList = dependencies.map((d) => [d.fromProjectId, d.toProjectId]);
const follows = (from, to, depth = 0) => {
  if (depth > dependencies.length) return false;
  if (from === to) return true;
  return edgeList.filter((e) => e[0] === from).some(([next]) => follows(next, to, depth + 1));
};
for (const [from, to] of edgeList) if (follows(from, to)) throw new Error(`dependency cycle: ${from} -> ${to}`);
const plannedTotal = projects.reduce((s, p) => s + p.plannedBudget, 0);
console.log(`projects=${projects.length} milestones=${milestones.length} resources=${resources.length} risks=${risks.length} dependencies=${dependencies.length} allocations=${allocations.length}`);
console.log(`planned total=$${(plannedTotal / 1_000_000).toFixed(2)}M`);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(dataset, null, 2)}\n`);
console.log(`wrote ${out}`);