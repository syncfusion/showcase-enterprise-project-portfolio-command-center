# Enterprise Project Portfolio Command Center

A Syncfusion React showcase: one command center where executives, PMO analysts and portfolio managers see project health, budget, capacity, risk, dependencies and milestones across a portfolio, and move projects through governance stages.

It runs entirely in the browser on synthetic JSON data. There is no backend, no database and no sign-in, so it builds and runs anywhere with Node.

## What it shows

Northwind Enterprises runs 19 projects in 3 portfolios: Digital Core, Growth Ventures and Operations Excellence. The demo clock is fixed at **October 16, 2026**, so every figure is the same on every machine.

| Page | What you can do | Syncfusion controls |
| --- | --- | --- |
| **Executive Scorecard** | Read the KPIs: projects in play, health, budget variance, milestones on time. See the health mix, stage summary, on-time trend, upcoming milestones, top risks and portfolio rollups. Each KPI card opens the page behind it. | Card, Accumulation Chart, Chart |
| **Portfolio Register** | Search, sort and export the project list to CSV. Change a project's stage one step at a time. Below 1280px wide each project shows as a card. | Grid, DropDownList, Toast |
| **Resource Capacity** | Compare allocation with capacity by role and by month, and find the people booked over 100%. | Chart, Grid |
| **Risks & Dependencies** | Rank risks by exposure (severity × likelihood) and follow the cross-project dependency map. Select a project to open it in the register. | Grid, Diagram |
| **Milestones & Timeline** | Read the portfolio timeline coloured by health, check each project's phase gates against baseline, and drag projects across the governance board. | Gantt, Grid, Kanban, Toast |

Across the app:

- **One reporting period:** a period filter (Full data, quarters, months) scopes the Scorecard charts, the Register rows and every Capacity figure.
- **Every view agrees:** a stage change in the Register or on the board updates the Scorecard, Register and Kanban at once. The allowed moves are one stage forward or back; Gate review can't go back to In flight. A move that isn't allowed is refused with a message.
- **"Remember my edits":** a header switch. Off, changes last until you reload. On, they are saved in this browser and survive a reload until you press Reset. The shipped data never changes.
- **Light and dark themes,** keyboard access throughout, colour plus an icon for every status, and a layout that works from 390px phones to wide desktops.

## Getting started

Requires **Node 24** or later.

```sh
npm ci
cp .env.example .env    # then set VITE_SYNCFUSION_LICENSE_KEY (see below)
npm run dev
```

Open **http://localhost:5173/enterprise-project-portfolio-command-center/react/**. The app is served under that path, not at the bare port.

### Syncfusion license

The app uses Syncfusion Essential Studio **34.2.8** (v34). Put a key for that version in `.env`:

```
VITE_SYNCFUSION_LICENSE_KEY=your-key
```

`.env` is git-ignored, so never commit the key. Without a key, or with a key for another major version (a v35 key, for example), Syncfusion shows a license banner at the top of the page. A free community license is available from Syncfusion.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (copies the Syncfusion theme first) |
| `npm run build` | Type-check, production build into `dist/`, and Brotli/gzip copies of each asset |
| `npm start` | Serves `dist/` with `server.mjs` (port `PORT`, default 8080) |
| `npm test` | Unit tests: data vectors, totals, session edits and stage rules (Vitest) |
| `npm run typecheck` | TypeScript only |
| `npm run test:browser` | Browser check of every page in both themes at four sizes (Playwright; needs a served build) |

To regenerate the sample data after changing the generator, run `node scripts/generate-fixture.mjs`. The tests assert its exact totals, so update them in the same change.

## Hosting

The production build expects to live at **`/enterprise-project-portfolio-command-center/react/`** (`base` in `vite.config.ts`, the router `basename`, and the host files below).

- **Linux App Service or any Node host:** `npm ci && npm run build`, then `npm start`. `server.mjs` has no dependencies. It strips the base path, serves the precompressed files, falls back to `index.html` for app routes, and answers the host health probe `GET /healthz` (at the host root, not under the base path) with JSON.
- **Windows App Service (IIS):** deploy `dist/`; `public/web.config` (copied into `dist/`) does the same path stripping and fallback.

The `/healthz` page inside the app shows its version, base path and data version.

## Project structure

```
src/
  domain/        pure rules and selectors (no React, no Syncfusion), types, data validation, tests
  app/           session store: shipped data + this session's edits, Reset, "Remember my edits"
  adapters/      data loading and the base path
  ui/
    shell/       app shell: sidebar, header, theme toggle
    pages/       Scorecard, Register, Capacity, RiskDependencies, Milestones, Health
    components/  KPI card, panel header, health badge, filter bar, loading/empty/error states
  styles/        design tokens, chart palette, app styles
public/data/eppcc.v1.json   synthetic dataset (schema 1)
scripts/                    fixture generator, theme copy, precompression
server.mjs                  production host
browser-check.*             browser check and its per-phase configs
```

## Data

All data is synthetic and generated deterministically by `scripts/generate-fixture.mjs`. It contains 19 projects, 76 phase gates (4 per project, in order, slipping by health), 18 people with one person-month of capacity each, 382 monthly allocations (Apr–Oct 2026), 14 risks and 14 dependencies. Any resemblance to real organisations or people is coincidental.

The shipped file is never modified. Edits live in the browser session, plus `localStorage` (`eppcc-session`) when "Remember my edits" is on.

## Built with

React 19.3, React Router 8.4, TypeScript 7.0, Vite 8.3, Tailwind CSS 4.3, Lucide icons, and the Syncfusion EJ2 React Grid, Charts, Gantt, Kanban, Diagrams, Dropdowns, Buttons, Navigations, Notifications and Popups packages (all 34.2.8) with the Tailwind 3 theme.

## License

Syncfusion components need a valid Syncfusion license (commercial or community). The sample data is fictional.
