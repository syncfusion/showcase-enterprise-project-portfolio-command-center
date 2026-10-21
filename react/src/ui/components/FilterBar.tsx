// A page's shared filters (syncfusion-component-patterns.md, "Filter bar"; factory template).
// The register/scorecard/capacity/risk pages share one period preset DropDownList (period-list
// pattern from the plan's `period-selection:` line) and a portfolio chip.
import type { ReactNode } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { RotateCcw, X } from 'lucide-react';
import './filter-bar.css';

export type FilterChip = { label: string; value: string; onRemove: () => void };

export function FilterField({ label, size = 'select', htmlFor, children }: {
  label: string; size?: 'period' | 'select' | 'wide'; htmlFor?: string; children: ReactNode;
}) {
  return (
    <div className={`filter-field filter-field--${size}`}>
      <label className="filter-field__label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

export function FilterBar({ title, note, chips = [], canReset, onReset, children }: {
  title: string; note?: string; chips?: FilterChip[]; canReset: boolean; onReset: () => void; children: ReactNode;
}) {
  return (
    <section className="e-card filter-bar" aria-label={title}>
      <div className="filter-bar__intro">
        <span className="filter-bar__title">{title}</span>
        {note && <small className="filter-bar__note">{note}</small>}
      </div>
      {children}
      {chips.map(chip => (
        <ButtonComponent key={chip.label} cssClass="filter-chip" aria-label={`Remove ${chip.label} filter: ${chip.value}`} onClick={chip.onRemove}>
          {chip.label}: {chip.value}
          <X size={14} aria-hidden="true" />
        </ButtonComponent>
      ))}
      <ButtonComponent cssClass="e-outline filter-reset" disabled={!canReset} onClick={onReset}>
        <RotateCcw size={14} aria-hidden="true" />
        Reset
      </ButtonComponent>
    </section>
  );
}