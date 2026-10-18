import { describe, expect, it } from 'vitest';

import { isTerminal, statusLabel, statusVariant } from './status';

describe('status presentation', () => {
  it('gives every status a word, not only a colour', () => {
    // Colour is never the only carrier — a colour-blind reader needs the label, and so does
    // anyone reading a screenshot.
    for (const s of ['pending', 'approved', 'paid', 'cancelled', 'expired']) {
      expect(statusLabel(s).length).toBeGreaterThan(0);
      expect(statusVariant(s).length).toBeGreaterThan(0);
    }
  });

  it('gives the four main statuses four distinct variants', () => {
    const variants = ['pending', 'approved', 'paid', 'cancelled'].map(statusVariant);
    expect(new Set(variants).size).toBe(4);
  });

  it('falls back rather than throwing on an unknown status', () => {
    expect(statusLabel('something_new')).toBe('something_new');
    expect(statusVariant('something_new')).toBe('muted');
  });

  it('knows which states are finished', () => {
    expect(isTerminal('paid')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('expired')).toBe(true);
    expect(isTerminal('pending')).toBe(false);
    expect(isTerminal('approved')).toBe(false);
  });
});
