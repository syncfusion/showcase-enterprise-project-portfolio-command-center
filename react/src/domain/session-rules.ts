// Session rule helpers shared by the UI: the effective stage and the one-step-forward move check
// (contracts/data-contract.md BR-2; domain/rules.ts).
import { STAGE_ORDER, stageOf } from './rules';
import type { Project, SessionState, Stage } from './types';

export { stageOf };
export { validateStageMove } from './session';

/** One step forward only: the next stage in the fixed order (BR-2). */
export function nextStageOf(stage: Stage): Stage | null {
  const order = STAGE_ORDER[stage];
  const match = (Object.keys(STAGE_ORDER) as Stage[]).find((s) => STAGE_ORDER[s] === order + 1);
  return match ?? null;
}

export function projectsWithEdits(projects: readonly Project[], session: SessionState): string[] {
  return projects.filter((p) => stageOf(p, session) !== p.stage).map((p) => p.id);
}