// The factory Syncfusion KPI Card pattern (design-system.md): compact shared left inset for
// title, value and note; title-line-aligned square semantic icon at top-right; component-tokenized
// Card surface. Display-only: no internal CTA (a KPI card that acts gets link/button semantics itself).
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function KpiCard({ title, value, note, icon: Icon, testId, valueClass }: {
  title: string; value: string; note?: ReactNode; icon: LucideIcon; testId?: string;
  /** A tone class for a value that judges (for example over budget). */
  valueClass?: string;
}) {
  return (
    <article className="e-card kpi-card" data-testid={testId}>
      <span className="kpi-card-icon" aria-hidden="true"><Icon size={18} /></span>
      <div>
        <div className="kpi-card-title">{title}</div>
        <div className={valueClass ? `kpi-card-value ${valueClass}` : 'kpi-card-value'}>{value}</div>
        {note && <div className="kpi-card-note">{note}</div>}
      </div>
    </article>
  );
}