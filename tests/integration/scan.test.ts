import { describe, it, expect } from 'vitest';
import * as path from 'node:path';
import { runAssessment } from '../../src/engine/runner.js';
import { registerDefaultAnalyzers } from '../../src/index.js';
import { DEFAULT_POLICY } from '../../src/config/defaults.js';

registerDefaultAnalyzers();

describe('Assessment Integration', () => {
  it('performs end-to-end quality check on current project', async () => {
    const output = await runAssessment({
      projectPath: process.cwd(),
      policy: DEFAULT_POLICY
    });

    expect(output.decision).toBeDefined();
    expect(output.decision.score).toBeGreaterThanOrEqual(0);
    expect(output.decision.score).toBeLessThanOrEqual(100);
    expect(output.results.length).toBeGreaterThan(0);
    expect(output.durationMs).toBeGreaterThan(0);
  });
});
