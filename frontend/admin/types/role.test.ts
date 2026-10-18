import { describe, expect, it } from 'vitest';

import { grantsOf, isRole } from './role';

describe('roles collapse to grants', () => {
  it('lets a viewer read and nothing else', () => {
    const g = grantsOf(['viewer']);
    expect(g).toEqual({ read: true, write: false, manageAccounts: false });
  });

  it('lets an operator write but not manage accounts', () => {
    const g = grantsOf(['operator']);
    expect(g.write).toBe(true);
    expect(g.manageAccounts).toBe(false);
  });

  it('reserves account management for superadmin', () => {
    expect(grantsOf(['admin']).manageAccounts).toBe(false);
    expect(grantsOf(['superadmin']).manageAccounts).toBe(true);
  });

  it('grants nothing for no roles, or an unknown one', () => {
    expect(grantsOf([])).toEqual({ read: false, write: false, manageAccounts: false });
    expect(grantsOf(['wizard'])).toEqual({ read: false, write: false, manageAccounts: false });
  });

  it('takes the union when somebody holds several', () => {
    const g = grantsOf(['viewer', 'superadmin']);
    expect(g.manageAccounts).toBe(true);
  });

  it('knows which strings are roles', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('wizard')).toBe(false);
  });
});
