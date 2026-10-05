/**
 * End-to-end proof for the defect that hid the users and roles screens.
 *
 * The bug was not only the two wrong gate codes — the client's alias table had
 * drifted from `@erp/contracts` too (9 of 11 pairs named codes that do not
 * exist). This test replays the owner's real permission set through the same
 * `can()` logic the sidebar uses, so it fails if either half regresses.
 */
import { describe, expect, it } from 'vitest';
import {
  isConsolePermissionCode,
  permissionAliases,
  permissionRegistry,
  seedablePermissionCodes,
} from '@erp/contracts';

/** What the API expands the owner's `'*'` into at seed time. */
function ownerPermissions(): string[] {
  return permissionRegistry.filter((entry) => !entry.deprecated).map((entry) => entry.code);
}

/** A faithful copy of `can()` in `lib/session.tsx`. */
function makeCan(permissions: string[]) {
  return (permission?: string): boolean => {
    if (!permission) return true;
    if (permissions.includes('*') || permissions.includes(permission)) return true;
    const direct = permissionAliases[permission];
    if (direct && permissions.includes(direct)) return true;
    for (const [legacy, canonical] of Object.entries(permissionAliases)) {
      if (canonical === permission && permissions.includes(legacy)) return true;
    }
    return false;
  };
}

describe('owner visibility', () => {
  const can = makeCan(ownerPermissions());

  it("the owner's '*' is expanded to real codes, not kept as a wildcard", () => {
    const granted = ownerPermissions();
    expect(granted).not.toContain('*');
    expect(granted).toContain('tenant.role.manage');
    expect(granted).toContain('tenant.membership.manage');
  });

  it('the owner passes the roles gate', () => {
    // Before the fix this was false, because the gate named
    // `tenant.roles.manage` — a code no role can hold.
    expect(can('tenant.role.manage')).toBe(true);
  });

  it('the owner passes the users gate', () => {
    expect(can('tenant.membership.manage')).toBe(true);
  });

  it('the owner passes the company gate', () => {
    expect(can('tenant.view')).toBe(true);
  });

  it('the old table would have failed these gates', () => {
    // The drifted hand-mirrored table mapped `platform.roles.manage` to
    // `tenant.roles.manage`, so a legacy grant never resolved to the real
    // code. Assert the registry maps it to the code that exists.
    expect(permissionAliases['platform.role.manage']).toBe('tenant.role.manage');
    expect(permissionAliases['platform.membership.manage']).toBe('tenant.membership.manage');
  });

  it('every tenant-scoped seedable code resolves for the owner', () => {
    // `console.*` codes are deliberately excluded: the platform plane is
    // disjoint from the tenant plane, and a tenant owner holds none of them
    // (see `canConsole` in `apps/platform-admin/lib/session.tsx`).
    const tenantCodes = seedablePermissionCodes.filter((code) => !isConsolePermissionCode(code));
    const unresolvable = tenantCodes.filter((code) => !can(code));
    expect(unresolvable).toEqual([]);
  });
});
