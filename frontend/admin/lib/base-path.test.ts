import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BASE_PATH, publicPath } from './base-path';

describe('publicPath', () => {
  it('collapses the app root onto the prefix itself, with no trailing slash', () => {
    expect(publicPath('/')).toBe('/admin');
  });

  it('prefixes an app-internal path', () => {
    expect(publicPath('/auth/login')).toBe('/admin/auth/login');
  });
});

describe('BASE_PATH', () => {
  /**
   * next.config.mjs is read by the build and cannot import this module, so the value is written
   * twice. A disagreement is not a type error and not a failing page — it is assets requested from
   * a prefix nothing serves, which looks like an unstyled app and reads like a CSS bug.
   */
  it('is the basePath the build is configured with', () => {
    const config = readFileSync(join(__dirname, '..', 'next.config.mjs'), 'utf8');
    expect(config).toContain(`basePath: '${BASE_PATH}'`);
  });
});
