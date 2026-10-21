// Status badges: colour plus a second cue (icon shape), never colour alone
// (design-system.md, "Colour semantics").
import { CheckCircle2, AlertCircle, AlertTriangle, Circle } from 'lucide-react';
import type { Health } from '../../domain/types';

const TONE: Record<Health, { tone: string; label: string; Icon: typeof Circle }> = {
  'On track': { tone: 'tone-success', label: 'On track', Icon: CheckCircle2 },
  Watch: { tone: 'tone-warning', label: 'Watch', Icon: AlertCircle },
  'At risk': { tone: 'tone-danger', label: 'At risk', Icon: AlertTriangle },
};

export function HealthBadge({ health }: { health: Health }) {
  const { tone, label, Icon } = TONE[health];
  return <span className={`status-badge ${tone}`}><Icon size={13} aria-hidden="true" />{label}</span>;
}