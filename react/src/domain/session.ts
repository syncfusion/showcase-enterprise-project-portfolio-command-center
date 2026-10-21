// Session overlay validation: only well-formed stage edits may enter the overlay
// (contracts/data-contract.md, "Queries and commands").
import type { SessionEdit, Stage } from './types';
import { allowedMove } from './rules';

const STAGES: readonly Stage[] = ['Planning', 'Prioritized', 'In flight', 'Gate review', 'Closed'];

export function validateEdits(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return ['The session is not an object.'];
  for (const [projectId, edit] of Object.entries(input as Record<string, unknown>)) {
    const e = edit as Partial<SessionEdit> | null;
    if (!e || e.field !== 'stage') { errors.push(`edit "${projectId}": only stage edits are supported.`); continue; }
    if (e.projectId !== projectId) errors.push(`edit "${projectId}}: projectId mismatch.`);
    if (!STAGES.includes(e.value as Stage)) errors.push(`edit "${projectId}": unknown stage.`);
  }
  return errors;
}

/** Business rule BR-2 (data-contract.md, "Allowed transitions"): one adjacent stage at a time, and
 *  a project in Gate review cannot move back to In flight. Returns the message the UI shows, or null. */
export function validateStageMove(_baseline: Stage | undefined, current: Stage, next: Stage): string | null {
  if (current === next) return `"${current}" is already the current stage.`;
  if (!allowedMove(current, next)) {
    return `A "${current}" project cannot move to "${next}": stages change one step at a time, and Gate review does not return to In flight.`;
  }
  return null;
}