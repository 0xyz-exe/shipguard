import { describe, it, expect } from 'vitest';
import { evaluateReleaseGates } from '../../src/engine/gates.js';
import { DEFAULT_POLICY } from '../../src/config/defaults.js';
import { AnalyzerResult, Finding } from '../../src/types/index.js';

describe('Release Gates Engine', () => {
  it('blocks release if an unresolved critical finding is present', () => {
    const findings: Finding[] = [
      {
        id: 'f1',
        fingerprint: 'fp-crit',
        analyzerId: 'security',
        category: 'security',
        ruleId: 'SEC-001',
        severity: 'CRITICAL',
        title: 'Exposed Secret',
        message: 'Critical secret exposed',
        status: 'OPEN'
      }
    ];

    const results: AnalyzerResult[] = [
      {
        analyzerId: 'security',
        category: 'security',
        status: 'failed',
        summary: 'Failed',
        durationMs: 20,
        findings
      }
    ];

    const decision = evaluateReleaseGates({
      results,
      findings,
      policy: DEFAULT_POLICY
    });

    expect(decision.state).toBe('BLOCKED');
    const critGate = decision.gates.find(g => g.gateId === 'no_critical_vulnerabilities');
    expect(critGate?.passed).toBe(false);
  });

  it('marks state as READY when all checks and gates pass cleanly', () => {
    const results: AnalyzerResult[] = [
      {
        analyzerId: 'security',
        category: 'security',
        status: 'passed',
        summary: 'Passed',
        durationMs: 10,
        findings: []
      },
      {
        analyzerId: 'testing-coverage',
        category: 'testing',
        status: 'passed',
        summary: 'Passed',
        durationMs: 10,
        findings: []
      },
      {
        analyzerId: 'build-packaging',
        category: 'build',
        status: 'passed',
        summary: 'Passed',
        durationMs: 10,
        findings: []
      }
    ];

    const decision = evaluateReleaseGates({
      results,
      findings: [],
      policy: DEFAULT_POLICY
    });

    expect(decision.state).toBe('READY');
    expect(decision.gates.every(g => g.passed)).toBe(true);
  });
});
