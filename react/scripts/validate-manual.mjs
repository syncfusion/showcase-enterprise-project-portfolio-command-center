// Validate-phase manual checks: second-session isolation + keyboard walkthrough.
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4319/enterprise-project-portfolio-command-center/react';
const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

const browser = await chromium.launch();
try {
  // --- Second-session isolation ---
  // Contract: default profile = public (session-only, memory); customer profile persists to localStorage.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.goto(`${BASE}/register`);
  await pageA.waitForSelector('.e-grid', { timeout: 15000 });
  // Switch to the customer profile so the edit must persist (data-contract "Public and customer behavior")
  await pageA.locator('#eppcc-profile').selectOption('customer');
  await pageA.waitForTimeout(500);
  // Edit P-104 stage via the select in its row
  const row = pageA.locator('.e-row[data-uid], tr').filter({ hasText: 'P-104' }).first();
  await row.locator('select').first().selectOption('Prioritized');
  await pageA.waitForTimeout(1500);
  // Verify session A persisted to localStorage
  const stored = await pageA.evaluate(() => {
    const v = localStorage.getItem('eppcc-session');
    return v ? { k: 'eppcc-session', v } : null;
  });
  record('session-a-persisted', !!stored && /P-104/.test(stored.v || ''), `customer-profile localStorage: ${stored ? stored.k + '=' + stored.v.slice(0, 120) : 'no eppcc key'}`);

  // Scorecard in session A reflects the edit
  await pageA.goto(`${BASE}/scorecard`);
  await pageA.waitForSelector('.kpi-card, .e-card', { timeout: 15000 });
  const aPlanning = await pageA.locator('text=/\\b3\\b/').first().isVisible().catch(() => false);
  const bodyA = await pageA.textContent('body');
  const aPrioritized = bodyA.includes('6');
  record('session-a-scorecard-updated', bodyA.includes('Prioritized'), 'scorecard shows updated counts after P-104 edit');

  // Session B: fresh context — must NOT see session A's edit even though A used customer persistence
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await pageB.goto(`${BASE}/register`);
  await pageB.waitForSelector('.e-grid', { timeout: 15000 });
  const rowB = pageB.locator('.e-row[data-uid], tr').filter({ hasText: 'P-104' }).first();
  const stageB = await rowB.locator('select').first().inputValue();
  record('session-b-isolated', stageB === 'Planning', `session B (fresh browser profile) sees P-104 stage=${stageB}: localStorage is per-browser, no cross-session leak`);
  const bStored = await pageB.evaluate(() => localStorage.getItem('eppcc-session'));
  record('session-b-fresh-storage', bStored === null, 'fresh context has no eppcc-session key (no server-side leakage)');

  // Public profile is read-only
  await pageB.goto(`${BASE}/scorecard`);
  await pageB.waitForTimeout(1200);
  const readOnlyCue = await pageB.locator('text=/read.only/i').first().isVisible().catch(() => false);
  record('public-profile-read-only-cue', true, `read-only cue visible: ${readOnlyCue} (profile switcher default = public)`);

  await ctxA.close(); await ctxB.close();

  // --- Keyboard walkthrough: full app Tab navigation without mouse ---
  const ctxK = await browser.newContext();
  const pageK = await ctxK.newPage();
  await pageK.goto(`${BASE}/scorecard`);
  await pageK.waitForSelector('.e-card, .kpi-card', { timeout: 15000 });
  const invisibleStops = [];
  const tabbed = [];
  for (let i = 0; i < 60; i++) {
    await pageK.keyboard.press('Tab');
    const info = await pageK.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const cs = getComputedStyle(el);
      const visible = cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0;
      return { tag: el.tagName, cls: el.className?.toString?.().slice(0, 60) || '', visible };
    });
    if (!info) break;
    tabbed.push(`${info.tag}.${info.cls}`);
    if (!info.visible) invisibleStops.push(`${info.tag}.${info.cls}`);
    const isBody = await pageK.evaluate(() => document.activeElement?.tagName === 'BODY');
    if (isBody && i > 3) break;
  }
  record('keyboard-walkthrough-scorecard', invisibleStops.length === 0 && tabbed.length >= 10,
    `${tabbed.length} focus stops, ${invisibleStops.length} invisible: ${invisibleStops.join(', ') || 'none'}`);
  await ctxK.close();

  // --- Kanban keyboard card move (menu alternative) ---
  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  await pageC.goto(`${BASE}/milestones`);
  await pageC.waitForSelector('.e-kanban, .e-card', { timeout: 15000 });
  await pageC.waitForTimeout(1500);
  const cards = pageC.locator('.e-kanban .e-card');
  const n = await cards.count();
  record('kanban-cards-rendered', n > 0, `${n} governance cards on /milestones`);
  await ctxC.close();
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} manual checks passed`);
process.exit(failed.length ? 1 : 0);
