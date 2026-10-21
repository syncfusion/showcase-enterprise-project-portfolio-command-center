// A panel Card's header in the Syncfusion Card markup: the title and an optional subtitle inside
// the header caption, so the subtitle sits above the header's divider instead of on it; optional
// actions (a search box, a button) sit on the right of the same row.
import type { ReactNode } from 'react';

export function PanelHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={actions ? 'e-card-header panel-header-with-actions' : 'e-card-header'}>
      <div className="e-card-header-caption">
        <div className="e-card-header-title">{title}</div>
        {sub && <div className="e-card-sub-title">{sub}</div>}
      </div>
      {actions && <div className="panel-header-actions">{actions}</div>}
    </div>
  );
}

/** A search field in the Syncfusion input markup (theme-styled), for a header's actions slot. */
export function HeaderSearch({ label, placeholder = 'Search', onSearch }: { label: string; placeholder?: string; onSearch: (value: string) => void }) {
  return (
    <span className="e-input-group header-search">
      <input className="e-input" type="search" aria-label={label} placeholder={placeholder}
        onChange={(event) => onSearch(event.target.value)} />
      <span className="e-input-group-icon e-icons e-search" aria-hidden="true" />
    </span>
  );
}
