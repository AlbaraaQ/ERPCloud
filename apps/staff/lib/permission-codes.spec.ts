/**
 * Regression net for the permission-code defect that hid the users and roles
 * screens from every user, including the owner.
 *
 * What happened: `navigation.ts` gated two sidebar entries on
 * `tenant.users.manage` and `tenant.roles.manage`. Neither string exists in
 * the `@erp/contracts` registry — the real codes are `tenant.membership.manage`
 * and `tenant.role.manage` (singular), and they are what the API controllers
 * actually enforce. Because no role can hold a code that does not exist,
 * `can()` returned false for everyone and the entries were filtered out of the
 * sidebar. The owner was affected too: their `'*'` grant is expanded into real
 * codes at seed time, so it never contains a wildcard to match a phantom.
 *
 * These tests fail if a gate names a code outside the registry, and if the
 * client alias table is re-copied instead of imported.
 */
import { describe, expect, it } from 'vitest';
import { isKnownPermissionCode, permissionAliases } from '@erp/contracts';

import { modules as navigation, type ModuleNode, type ScreenItem } from './navigation';

/** Every permission gate in the sidebar, at both the module and screen level. */
function collectGates(): string[] {
  const gates: string[] = [];
  for (const module of navigation as ModuleNode[]) {
    if (module.permission) gates.push(module.permission);
    for (const group of module.groups) {
      for (const item of group.items as ScreenItem[]) {
        if (item.permission) gates.push(item.permission);
      }
    }
  }
  return gates;
}

function findScreen(key: string): ScreenItem | undefined {
  for (const module of navigation as ModuleNode[]) {
    for (const group of module.groups) {
      const hit = (group.items as ScreenItem[]).find((item) => item.key === key);
      if (hit) return hit;
    }
  }
  return undefined;
}

describe('navigation permission gates', () => {
  it('finds the gates to test', () => {
    // A zero here would mean the traversal broke, not that the app is clean.
    expect(collectGates().length).toBeGreaterThan(100);
  });

  it('every gate names a code in the permission registry', () => {
    const unknown = [...new Set(collectGates().filter((code) => !isKnownPermissionCode(code)))];
    expect(unknown).toEqual([]);
  });

  it('every alias maps to a canonical code that exists', () => {
    const dangling = Object.entries(permissionAliases)
      .filter(([, canonical]) => !isKnownPermissionCode(canonical))
      .map(([legacy, canonical]) => `${legacy} -> ${canonical}`);
    expect(dangling).toEqual([]);
  });

  it('the users screen is gated on tenant.membership.manage', () => {
    expect(findScreen('user-card')?.permission).toBe('tenant.membership.manage');
  });

  it('the roles screen is gated on tenant.role.manage', () => {
    expect(findScreen('user-permissions')?.permission).toBe('tenant.role.manage');
  });

  it('the company screen is gated on tenant.view', () => {
    expect(findScreen('company-card')?.permission).toBe('tenant.view');
  });

  it('the roles screen resolves to /settings/roles', () => {
    // The user asked where the roles screen lives; pin the route so a future
    // rename cannot silently move it again.
    expect(findScreen('user-permissions')?.href).toBe('/settings/roles');
  });
});
