import { describe, it, expect } from 'vitest';
import { computeFindingFingerprint } from '../../src/engine/fingerprint.js';

describe('Fingerprint Engine', () => {
  it('produces identical fingerprints for windows and unix path separators', () => {
    const fpUnix = computeFindingFingerprint({
      analyzerId: 'security',
      ruleId: 'SEC-001',
      file: 'src/config/keys.ts',
      line: 42,
      title: 'Secret key'
    });

    const fpWin = computeFindingFingerprint({
      analyzerId: 'security',
      ruleId: 'SEC-001',
      file: 'src\\config\\keys.ts',
      line: 42,
      title: 'Secret key'
    });

    expect(fpUnix).toBe(fpWin);
    expect(fpUnix).toHaveLength(16);
  });
});
