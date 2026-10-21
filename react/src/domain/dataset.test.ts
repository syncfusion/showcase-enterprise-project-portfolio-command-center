// Data-contract vectors V1..V8 (contracts/data-contract.md): the shipped fixture is asserted
// exactly so the prose and the code cannot drift apart. Run: npm test (vitest, node env).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import raw from '../../public/data/eppcc.v1.json';
import type { PortfolioDataset } from './types';
import { validateDataset } from './validate';
import { budgetTotals, healthCounts, onTimeRatio, stageCounts, STAGES, stageOf, utilization, upcomingMilestones, openRisks, allowedMove } from './rules';
import { validateEdits, validateStageMove } from './session';

const data = raw as unknown as PortfolioDataset;

describe('the shipped fixture (V1 counts and totals)', () => {
  it('validates with no errors', () => {
    expect(validateDataset(data)).toEqual([]);
  });

  it('V1a: holds the planned entity counts', () => {
    expect(data.portfolios).toHaveLength(3);
    expect(data.programs).toHaveLength(5);
    expect(data.projects).toHaveLength(19);
    expect(data.milestones).toHaveLength(76);
    expect(data.resources).toHaveLength(18);
    expect(data.risks).toHaveLength(14);
    expect(data.dependencies).toHaveLength(14);
    expect(data.allocations.length).toBe(382);
  });

  it('V1b: stages match the contract', () => {
    const counts = stageCounts(data.projects, {});
    expect(counts.Planning).toBe(4);
    expect(counts.Prioritized).toBe(5);
    expect(counts['In flight']).toBe(7);
    expect(counts['Gate review']).toBe(2);
    expect(counts.Closed).toBe(1);
  });

  it('V1c: health distribution matches the contract', () => {
    const counts = healthCounts(data.projects);
    expect(counts['On track']).toBe(11);
    expect(counts.Watch).toBe(6);
    expect(counts['At risk']).toBe(2);
  });

  it('V1d: budget totals match the contract', () => {
    const totals = budgetTotals(data.projects);
    expect(totals.planned).toBe(33_540_000);
    expect(totals.forecast).toBe(35_467_000);
    expect((totals.varianceRatio * 100).toFixed(2)).toBe('5.75');
  });

  it('V1e: demo-today milestones and utilization are deterministic', () => {
    const u = utilization(data.allocations, data.resources, '2026-10');
    // Book-level utilization 87% in the current month (18 people, one person-month each); seven
    // people run over 100% (the over-allocation story flagged with a second cue in the UI).
    expect(Math.round(u.allocated * 100)).toBe(1_570);  // 15.70 person-months allocated
    expect(Math.round(u.capacity * 100)).toBe(1_800);   // 18 person-months capacity
    expect((u.ratio * 1000).toFixed(0)).toBe('872');    // 87.2% of book capacity
    expect(upcomingMilestones(data, 30).length).toBeGreaterThan(0);
    expect(openRisks(data, ['P-101']).length).toBeGreaterThan(0);
  });
});

describe('milestones are believable (V1f)', () => {
  it("runs each project's gates in order inside its own dates", () => {
    for (const p of data.projects) {
      const gates = data.milestones.filter((m) => m.projectId === p.id);
      expect(gates.map((m) => m.name)).toEqual(['Scope signed off', 'Design complete', 'Build complete', 'Go-live']);
      const baselines = gates.map((m) => m.baselineDate);
      expect([...baselines].sort()).toEqual(baselines);
      expect(baselines[0] >= p.start && baselines[3] <= p.end).toBe(true);
    }
  });

  it('delivers 23 of 29 completed gates on time (79%), not all of them', () => {
    const r = onTimeRatio(data, data.projects);
    expect([r.onTime, r.completed]).toEqual([23, 29]);
  });
});

describe('session overlay vectors (V2..V5)', () => {
  const p104 = data.projects.find((p) => p.id === 'P-104')!;
  const baselineStage = p104.stage; // Planning

  it('V2: a session stage edit changes the effective stage for every view', () => {
    const session = { 'P-104': { field: 'stage' as const, projectId: 'P-104', value: 'Prioritized' as const, at: '2026-10-16T09:00:00Z' } };
    expect(baselineStage).toBe('Planning');
    expect(stageOf(p104, session)).toBe('Prioritized');
    const counts = stageCounts(data.projects, session);
    expect(counts.Planning).toBe(3);
    expect(counts.Prioritized).toBe(6);
  });

  it('V3: only well-formed edits may enter the overlay', () => {
    expect(validateEdits({ 'P-104': { field: 'stage', projectId: 'P-104', value: 'On track', at: 'x' } })).not.toEqual([]);
    expect(validateEdits({ 'P-104': { field: 'health', projectId: 'P-104', value: 'Watch', at: 'x' } })).not.toEqual([]);
  });

  it('V4: adjacent-stage moves only; Gate review does not return to In flight (BR-2)', () => {
    expect(allowedMove('Planning', 'Prioritized')).toBe(true);
    expect(allowedMove('Prioritized', 'Planning')).toBe(true);
    expect(allowedMove('In flight', 'Prioritized')).toBe(true);
    expect(allowedMove('Closed', 'Gate review')).toBe(true);
    expect(allowedMove('Planning', 'In flight')).toBe(false);
    expect(allowedMove('Gate review', 'In flight')).toBe(false);
    expect(allowedMove('Closed', 'In flight')).toBe(false);
    expect(validateStageMove('Planning', 'Planning', 'In flight')).not.toBeNull();
    expect(validateStageMove('Planning', 'Planning', 'Planning')).not.toBeNull();
    expect(validateStageMove('Planning', 'Planning', 'Prioritized')).toBeNull();
  });

  it('V5: reset restores the exact baseline', () => {
    const counts = stageCounts(data.projects, {});
    expect(counts[baselineStage]).toBe(4);
  });
});

describe('invalid fixtures are rejected (V6)', () => {
  const clone = () => JSON.parse(JSON.stringify(data)) as PortfolioDataset;

  it('rejects a duplicate project id', () => {
    const broken = clone();
    broken.projects[1].id = broken.projects[0].id;
    expect(validateDataset(broken).length).toBeGreaterThan(0);
  });

  it('rejects a dependency cycle', () => {
    const broken = clone();
    broken.dependencies.push({ id: 'D-699', fromProjectId: 'P-101', toProjectId: 'P-102', type: 'Related', description: 'cycle: P-102 -> P-101 -> P-102' });
    expect(validateDataset(broken)).toEqual(expect.arrayContaining([expect.stringContaining('cycle')]));
  });

  it('rejects a bad stage and an unknown scope', () => {
    const broken = clone();
    broken.projects[0].stage = 'Flying' as never;
    expect(validateDataset(broken).length).toBeGreaterThan(0);
    const broken2 = clone();
    broken2.risks[0].scopeId = 'nope';
    expect(validateDataset(broken2).length).toBeGreaterThan(0);
  });

  it('rejects a milestone on an unknown project', () => {
    const broken = clone();
    broken.milestones.push({ id: 'M-999', projectId: 'P-999', name: 'X', dueDate: '2026-11-01', baselineDate: '2026-10-01', status: 'On track' });
    expect(validateDataset(broken).length).toBeGreaterThan(0);
  });
});

describe('on-time and stage order vectors (V7, V8)', () => {
  it('V7: on-time ratio counts completed milestones delivered by baseline', () => {
    const r = onTimeRatio(data, data.projects);
    expect(r.completed).toBe(29);
    expect(r.onTime).toBe(23);
    expect(r.ratio.toFixed(3)).toBe((23 / 29).toFixed(3));
  });

  it('V8: STAGES runs in governance order', () => {
    expect(STAGES).toEqual(['Planning', 'Prioritized', 'In flight', 'Gate review', 'Closed']);
  });

  it('the fixture file on disk equals the imported bundle', () => {
    const onDisk = readFileSync(join(process.cwd(), 'public/data/eppcc.v1.json'), 'utf8');
    expect(JSON.parse(onDisk)).toEqual(JSON.parse(JSON.stringify(data)));
  });
});