import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Wave 5 — the shell contract, checked without a browser.
 *
 * The visual round's own gate is "axe clean on six screens, Light/Dark
 * screenshots, prefers-reduced-motion, mode switch mid-session". Every one of
 * those needs a real browser, and this environment has none — proven, not
 * assumed (no browser binary, and every shared Chromium library absent).
 *
 * So this file checks the half of that gate that *can* break silently and can
 * be checked statically: the shell's measured contract and the stylesheet's
 * token discipline. Both were genuinely broken before this wave:
 *
 *   - `.topbar` was content-height with `flex-wrap: wrap`, so the bar grew to
 *     two rows the moment a tenant name or a notification count stretched.
 *   - `.main` had no width cap at all, so the 1400px content scale in the
 *     contract was a number in a document, not a rule in CSS.
 *   - the sidebar's status colours were `--color-success` / `--color-warning`
 *     / `--ink-2`, none of which any stylesheet declares. CSS drops such a
 *     declaration at computed-value time, so `.dot.ready` and the `ok` badges
 *     had been painting *nothing* — inherited colour — since the v3 rename.
 *
 * The tests read the stylesheet as text and parse it, which is the only
 * available witness. They are mutation-checked: reverting the topbar to
 * content height, dropping the 1400px cap, or restoring an undeclared token
 * each fails the specific test that should catch it.
 */

/** Walk up to the workspace root — the directory holding pnpm-workspace.yaml. */
function repoRoot(from: string): string {
  let dir = from;
  for (let i = 0; i < 8; i += 1) {
    try {
      readFileSync(join(dir, 'pnpm-workspace.yaml'));
      return dir;
    } catch {
      dir = dirname(dir);
    }
  }
  throw new Error('workspace root not found');
}

const ROOT = repoRoot(process.cwd());

const CSS = join(ROOT, 'apps/staff/app/globals.css');
const TOKENS = join(ROOT, 'packages/ui/src/tokens/tokens.css');
const SHELL = join(ROOT, 'apps/staff/components/app-shell.tsx');

const css = readFileSync(CSS, 'utf8');
const tokens = readFileSync(TOKENS, 'utf8');
const shell = readFileSync(SHELL, 'utf8');

/** The declarations of one rule, as `prop: value` pairs. */
function rule(selector: string): Record<string, string> {
  const at = css.indexOf(`\n${selector} {`);
  if (at === -1) return {};
  const open = css.indexOf('{', at);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const m = /^\s*([a-z-]+)\s*:\s*(.+?);/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** Every custom property the stylesheet reads. */
function usedTokens(): Set<string> {
  return new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
}

/** Every custom property any stylesheet declares. */
function declaredTokens(): Set<string> {
  return new Set([...tokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

describe('the shell contract (Design v3 §6.1)', () => {
  it('gives the sidebar the 288px the contract names', () => {
    const shellRule = rule('.shell');
    expect(shellRule['grid-template-columns']).toMatch(/^288px\s/);
  });

  it('pins the topbar to 56px instead of letting content height decide', () => {
    const topbar = rule('.topbar');
    expect(topbar.height).toBe('56px');
    expect(topbar['flex-wrap']).toBe('nowrap');
    // the two halves must be allowed to shrink rather than push each other out
    expect(css).toContain('.topbar > *');
  });

  it('caps the content column at the 1400px scale', () => {
    const main = rule('.main');
    expect(main['max-width']).toBe('1400px');
    // centred with a logical property, so RTL does not need a second rule
    expect(main['margin-inline']).toBe('auto');
  });
});

describe('the sidebar speaks the v3 status vocabulary', () => {
  it('no longer declares a private colour for a status dot', () => {
    // `.dot.ready` / `.dot.api` / `.dot.planned` were the fork: a status map
    // only the sidebar could answer, and one `statusTone()` did not know.
    for (const gone of ['.dot.ready', '.dot.api', '.dot.planned']) {
      expect(css).not.toContain(gone);
    }
    expect(css).not.toMatch(/\.nav-legend span/);
  });

  it('draws its markers with the shared StatusDot, not a hand-rolled span', () => {
    expect(shell).toContain('StatusDot');
    expect(shell).not.toMatch(/className=\{`dot \$\{status\}`\}/);
    // the legend is v3 Badges now, so the three states carry contract tones
    expect(shell).toContain('<Badge tone="ok" dot>');
    expect(shell).toContain('<Badge tone="warn" dot>');
    expect(shell).toContain('<Badge tone="neutral" dot>');
  });

  it('maps the nav states onto tones the contract actually defines', () => {
    // ready/api/planned -> ok/warn/neutral. `ready` is the only code the v3
    // map already spells; the other two are tone-named because the API never
    // sends them as a status at all.
    expect(shell).toContain("if (status === 'ready') return 'ok';");
    expect(shell).toContain("if (status === 'api') return 'warn';");
    expect(shell).toContain("return 'neutral';");
  });
});

describe('every colour the stylesheet reads is one the contract declares', () => {
  it('reads no undeclared custom property', () => {
    // The defect this replaces: `--color-success`, `--color-warning`,
    // `--color-success-soft`, `--color-warning-soft` and `--ink-2` were all in
    // use and declared nowhere, so those rules painted inherited colour.
    const declared = declaredTokens();
    const themed = new Set([...declared].filter((d) => d.startsWith('--color-')));
    const missing = [...usedTokens()].filter((t) => !declared.has(t) && !themed.has(t));
    expect(missing).toEqual([]);
  });

  it('declares the status tokens the audit relies on', () => {
    // Guards the mapping itself: if the contract ever renames `--ok-soft`,
    // this fails here rather than as an invisible transparent badge.
    for (const t of ['--ok', '--ok-soft', '--warn', '--warn-soft', '--on-accent', '--ring-danger']) {
      expect(declaredTokens().has(t)).toBe(true);
    }
  });
});

describe('no physical direction, no literal colour', () => {
  it('aligns the accounting tree with logical properties', () => {
    // `text-align: right/left` do not flip with `dir`, so in an English
    // session the Arabic label sat on the wrong side of its own number.
    expect(css).not.toMatch(/text-align:\s*(?:left|right)\s*;/);
    expect(rule('.tree-label')['text-align']).toBe('start');
    expect(rule('.tree-balance')['text-align']).toBe('end');
  });

  it('carries no literal colour outside a print rule', () => {
    // Print is the documented exception: the contract itself forces
    // `--text` to black inside `@media print`, and a thermal receipt has no
    // theme to respect. Everything else must read a token.
    const printAt = css.indexOf('@media print');
    const screen = printAt === -1 ? css : css.slice(0, printAt);
    const literals = screen.match(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(|\bwhite\b(?!-)/g) ?? [];
    expect(literals).toEqual([]);
  });

  it('takes its focus ring and scrim from the contract, not from memory', () => {
    expect(rule('.input[aria-invalid=\'true\']')['box-shadow']).toBe('var(--ring-danger)');
    expect(css).not.toContain('rgb(239 68 68');
    expect(css).not.toContain('rgb(15 23 42 / 0.45)');
  });
});
