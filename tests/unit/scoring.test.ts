import { describe, it, expect } from 'vitest';
import { calculateCategoryScores, calculateOverallScore } from '../../src/engine/scoring.js';
import { DEFAULT_POLICY } from '../../src/config/defaults.js';
import { AnalyzerResult, Finding } from '../../src/types/index.js';

describe('Scoring Engine', () => {
  it('awards 100 points for a category with zero findings and passed status', () => {
    const results: AnalyzerResult[] = [
      {
        analyzerId: 'security',
        category: 'security',
        status: 'passed',
        summary: 'Clean',
        durationMs: 50,
        findings: []
      }
    ];

    const categoryScores = calculateCategoryScores(results, DEFAULT_POLICY);
    expect(categoryScores.security.score).toBe(100);
    expect(categoryScores.security.status).toBe('passed');
  });

  it('deducts 35 points per critical finding', () => {
    const criticalFinding: Finding = {
      id: 'f1',
      fingerprint: 'fp-1',
      analyzerId: 'security',
      category: 'security',
      ruleId: 'SEC-001',
      severity: 'CRITICAL',
      title: 'Exposed AWS Key',
      message: 'Found AWS key',
      status: 'OPEN'
    };

    const results: AnalyzerResult[] = [
      {
        analyzerId: 'security',
        category: 'security',
        status: 'failed',
        summary: 'Found critical issue',
        durationMs: 50,
        findings: [criticalFinding]
      }
    ];

    const categoryScores = calculateCategoryScores(results, DEFAULT_POLICY);
    // 100 - 35 = 65, but failed status clamps to max 50
    expect(categoryScores.security.score).toBe(50);
    expect(categoryScores.security.status).toBe('failed');
  });

  it('calculates deterministic weighted overall score correctly', () => {
    const results: AnalyzerResult[] = [
      {
        analyzerId: 'security',
        category: 'security',
        status: 'passed',
        summary: 'Clean',
        durationMs: 10,
        findings: []
      },
      {
        analyzerId: 'testing-coverage',
        category: 'testing',
        status: 'passed',
        summary: 'Clean',
        durationMs: 10,
        findings: []
      }
    ];

    const categoryScores = calculateCategoryScores(results, DEFAULT_POLICY);
    const overall = calculateOverallScore(categoryScores);
    expect(overall).toBe(100);
  });
});
