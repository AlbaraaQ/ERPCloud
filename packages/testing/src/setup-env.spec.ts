import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

/**
 * Regression guard for the `.env` generator.
 *
 * The generator used to pass its replacement to `String.prototype.replace` as a
 * **string**. `replace` expands `$&`, `$'`, `` $` `` and `$$` in a string
 * replacement into parts of the matched text, and the generator's symbol alphabet
 * (`!@#$%^&*?-_+=`) contains `$`. A password such as `KwK$&WGXvFyN#w=ZwH6*`
 * therefore had its `$&` expanded to the matched text itself, writing:
 *
 * ```
 * DEMO_CASHIER_PASSWORD=KwKDEMO_CASHIER_PASSWORD=WGXvFyN#w=ZwH6*
 * ```
 *
 * That value contains "password", so the tenant password policy rejected it and
 * `pnpm db:seed` died before writing any demo data — reporting a failure at the
 * platform admin, which was innocent. The defect is probabilistic (about 1% of
 * generations corrupt one of the four passwords), which is why it survived: it
 * looks like a policy bug, not a generator bug.
 *
 * `writeEnvLines` is exported purely so this invariant can be asserted
 * deterministically instead of being trusted to a lucky sample. This test lives
 * in `@erp/testing` because the root `package.json` scripts are frozen and the
 * generator is repository tooling with no workspace package of its own.
 */

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

/** Every `$`-bearing pattern `String.replace` expands in a string replacement. */
const EXPANSION_TRIGGERS = ['$$', '$&', "$'", '$`', '$1', '$<name>'] as const;

/** A template shaped like `.env.example`: a placeholder line waiting to be filled. */
const TEMPLATE = ['# comment', 'DEMO_CASHIER_PASSWORD=', 'OTHER_KEY=keep-me', ''].join('\n');

/**
 * Imports the real generator and returns its `writeEnvLines`.
 *
 * The script is copied into a throwaway `<root>/scripts/` layout where `.env` does
 * not exist yet: the generator refuses to overwrite an existing `.env` and calls
 * `process.exit(0)` in that case, which would abort the import. With no `.env`
 * present it runs to completion and its export binds normally. Its console noise
 * is silenced for the duration.
 */
async function loadWriteEnvLines(workspace: string): Promise<
  (template: string, pairs: Record<string, string>) => string
> {
  const scriptsDir = join(workspace, 'scripts');
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(
    join(scriptsDir, 'setup-env.mjs'),
    readFileSync(join(repoRoot, 'scripts', 'setup-env.mjs')),
  );
  writeFileSync(join(workspace, '.env.example'), readFileSync(join(repoRoot, '.env.example')));

  const log = console.log;
  console.log = () => {};
  try {
    return (await import(pathToFileURL(join(scriptsDir, 'setup-env.mjs')).href)).writeEnvLines;
  } finally {
    console.log = log;
  }
}

describe('writeEnvLines', () => {
  let writeEnvLines!: (template: string, pairs: Record<string, string>) => string;
  let workspace = '';

  afterAll(() => {
    if (workspace) rmSync(workspace, { recursive: true, force: true });
  });

  it('loads the real generator and replaces the placeholder line', async () => {
    workspace = mkdtempSync(join(tmpdir(), 'erp-envgen-'));
    writeEnvLines = await loadWriteEnvLines(workspace);

    const out = writeEnvLines(TEMPLATE, { DEMO_CASHIER_PASSWORD: 'plain-secret' });

    expect(out).toContain('DEMO_CASHIER_PASSWORD=plain-secret');
    // A stray regex must not eat the neighbouring lines.
    expect(out).toContain('# comment');
    expect(out).toContain('OTHER_KEY=keep-me');
  });

  it('appends a key the template does not mention', () => {
    const out = writeEnvLines('A=1\n', { BRAND_NEW_KEY: 'value' });

    expect(out).toContain('BRAND_NEW_KEY=value');
    expect(out).toContain('A=1');
  });

  it.each(EXPANSION_TRIGGERS)('writes %s literally instead of expanding it', (trigger) => {
    // The exact shape that used to corrupt the file: a secret whose `$` sequence
    // `replace` would have interpreted.
    const secret = `KwK${trigger}WGXvFyN#w=ZwH6*`;
    const out = writeEnvLines(TEMPLATE, { DEMO_CASHIER_PASSWORD: secret });

    expect(out).toContain(`DEMO_CASHIER_PASSWORD=${secret}`);
    // The corruption signature: the value must not start a nested assignment.
    expect(out).not.toMatch(/DEMO_CASHIER_PASSWORD=[^\n]*[A-Z0-9_]+=/);
  });

  it('keeps a secret made only of `$` characters intact', () => {
    const secret = '$$$$$$$$$$$$';
    const out = writeEnvLines(TEMPLATE, { DEMO_CASHIER_PASSWORD: secret });

    expect(out).toContain(`DEMO_CASHIER_PASSWORD=${secret}`);
  });

  it('preserves base64 padding without duplicating the key', () => {
    const secret = 'IDk3sQxnCzviPM8ihj1QPfULsSE5E2qwcp3NhOceHzs=';
    const out = writeEnvLines(TEMPLATE, { DATA_ENC_KEY: secret });

    expect(out).toContain(`DATA_ENC_KEY=${secret}`);
    expect(out.match(/DATA_ENC_KEY=/g)).toHaveLength(1);
  });
});

describe('setup-env generator (end to end)', () => {
  let workspace = '';

  afterAll(() => {
    if (workspace) rmSync(workspace, { recursive: true, force: true });
  });

  /**
   * Runs the real script, not the extracted helper, so a regression that breaks
   * the script's wiring still fails. Corruption is probabilistic, so this is a
   * smoke test — the deterministic guard above is what actually catches it.
   */
  it('produces a parsable .env with every documented password', () => {
    workspace = mkdtempSync(join(tmpdir(), 'erp-envgen-e2e-'));
    const scriptsDir = join(workspace, 'scripts');
    mkdirSync(scriptsDir, { recursive: true });

    writeFileSync(
      join(scriptsDir, 'setup-env.mjs'),
      readFileSync(join(repoRoot, 'scripts', 'setup-env.mjs')),
    );
    writeFileSync(join(workspace, '.env.example'), readFileSync(join(repoRoot, '.env.example')));

    // No `--force`: the script refuses to overwrite, so removing `.env` first is
    // what makes this a fresh generation.
    rmSync(join(workspace, '.env'), { force: true });
    execFileSync(process.execPath, [join(scriptsDir, 'setup-env.mjs')], { stdio: 'ignore' });

    const values: Record<string, string> = {};
    for (const line of readFileSync(join(workspace, '.env'), 'utf8').split('\n')) {
      const match = /^([A-Za-z0-9_]+)=(.*)$/.exec(line);
      if (match) values[match[1]!] = match[2]!;
    }

    for (const key of [
      'PLATFORM_ADMIN_PASSWORD',
      'DEMO_OWNER_PASSWORD',
      'DEMO_ACCOUNTANT_PASSWORD',
      'DEMO_CASHIER_PASSWORD',
    ]) {
      expect(values[key], `${key} was not written`).toBeTruthy();
      expect(values[key]!.length, `${key} is too short for the policy`).toBeGreaterThanOrEqual(12);
    }
  });
});
