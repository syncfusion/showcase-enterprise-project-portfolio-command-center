// Domain types (contracts/data-contract.md). No React or Syncfusion imports in this folder.

export type Stage = 'Planning' | 'Prioritized' | 'In flight' | 'Gate review' | 'Closed';
export type Health = 'On track' | 'Watch' | 'At risk';
export type MilestoneStatus = 'Completed' | 'On track' | 'Late';
export type DependencyType = 'Blocks' | 'Blocked by' | 'Related';
export type RiskState = 'Open' | 'Mitigating' | 'Closed';
export type TrendPoint = { month: string; onTimeRatio: number; varianceRatio: number; utilizationRatio: number };

/** Fixed demo date (app-plan.md `demo-today`): every derived status runs against it. */
export const DEMO_TODAY = '2026-10-16';

export interface Portfolio {
  id: string;
  name: string;
  description: string;
}

export interface Program {
  id: string;
  portfolioId: string;
  name: string;
  sponsor: string;
}

export interface Project {
  id: string;
  programId: string;
  name: string;
  manager: string;
  stage: Stage;
  health: Health;
  start: string;          // ISO date
  end: string;            // ISO date
  plannedBudget: number;  // USD
  forecastBudget: number; // USD
  priority: number;       // 1 (highest) .. 5
  completion: number;     // percent 0..100
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  dueDate: string;       // ISO date
  baselineDate: string;  // ISO date
  status: MilestoneStatus;
}

export interface Resource {
  id: string;
  name: string;
  role: 'PM' | 'Dev' | 'QA' | 'UX' | 'Data' | 'Cloud';
  monthlyCapacity: number; // person-months per month
}

export interface Allocation {
  resourceId: string;
  projectId: string;
  month: string;  // YYYY-MM
  personMonths: number;
}

export interface Risk {
  id: string;
  scopeId: string;      // projectId or portfolioId
  scope: 'project' | 'portfolio';
  title: string;
  category: string;
  severity: number;   // 1..5
  probability: number; // 1..5
  state: RiskState;
  owner: string;
}

export interface Dependency {
  id: string;
  fromProjectId: string;
  toProjectId: string;
  type: DependencyType;
  description: string;
}

export interface KpiTargets {
  onTimeGood: number;        // ratio >= this is On track
  onTimeBorderline: number;  // ratio >= this is Watch
  varianceGood: number;      // |variance ratio| <= this is On track
  varianceBorderline: number;
  utilizationFull: number;   // ratio == 1 is fully allocated
}

export interface PortfolioDataset {
  schemaVersion: 1;
  fixtureVersion: number;
  group: string;
  portfolios: Portfolio[];
  programs: Program[];
  projects: Project[];
  milestones: Milestone[];
  resources: Resource[];
  allocations: Allocation[];
  risks: Risk[];
  dependencies: Dependency[];
  kpiTargets: KpiTargets;
  kpiSnapshots: Record<string, TrendPoint[]>; // portfolioId -> monthly points
}

/** Session overlay: edits made in this tab, applied over the immutable baseline. */
export interface SessionEdit {
  field: 'stage';
  projectId: string;
  value: Stage;
  at: string;
}

export type SessionState = Readonly<Record<string, SessionEdit>>;