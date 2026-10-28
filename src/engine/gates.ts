import {
  AnalyzerCategory,
  AnalyzerResult,
  CategoryScore,
  Finding,
  FindingSeverity,
  GateResult,
  ProjectPolicy,
  ReleaseDecision,
  ReleaseState
} from '../types/index.js';
import { calculateCategoryScores, calculateOverallScore } from './scoring.js';

export function evaluateReleaseGates(params: {
  results: AnalyzerResult[];
  findings: Finding[];
  policy: ProjectPolicy;
}): ReleaseDecision {
  const { results, findings, policy } = params;

  const categoryScores = calculateCategoryScores(results, policy);
  const overallScore = calculateOverallScore(categoryScores);

  const countsBySeverity: Record<FindingSeverity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0
  };

  for (const f of findings) {
    if (f.status === 'OPEN') {
      countsBySeverity[f.severity] = (countsBySeverity[f.severity] || 0) + 1;
    }
  }

  const gates: GateResult[] = [];

  // Gate 1: No critical vulnerabilities
  const criticalPassed = countsBySeverity.CRITICAL === 0;
  gates.push({
    gateId: 'no_critical_vulnerabilities',
    title: 'Zero Critical Vulnerabilities',
    mandatory: policy.gates.failOnCritical,
    passed: criticalPassed,
    reason: criticalPassed
      ? 'No unresolved critical severity findings detected.'
      : `Found ${countsBySeverity.CRITICAL} unresolved critical finding(s).`
  });

  // Gate 2: No high vulnerabilities (if enabled)
  const highPassed = countsBySeverity.HIGH === 0;
  gates.push({
    gateId: 'no_high_vulnerabilities',
    title: 'Zero High-Severity Issues',
    mandatory: policy.gates.failOnHigh,
    passed: highPassed,
    reason: highPassed
      ? 'No unresolved high severity findings detected.'
      : `Found ${countsBySeverity.HIGH} unresolved high finding(s).`
  });

  // Gate 3: Required test suite pass
  const testResults = results.filter(r => r.category === 'testing');
  const hasTests = testResults.length > 0 && testResults.some(r => r.status === 'passed' || r.status === 'warning');
  const testsPassed = !policy.gates.requireTests || hasTests;
  gates.push({
    gateId: 'automated_tests_verified',
    title: 'Automated Tests Passed',
    mandatory: policy.gates.requireTests,
    passed: testsPassed,
    reason: testsPassed
      ? 'Test framework and passing test suite verified.'
      : 'Automated tests are missing, failed, or incomplete.'
  });

  // Gate 4: Required build verification
  const buildResults = results.filter(r => r.category === 'build');
  const hasBuild = buildResults.length > 0 && buildResults.some(r => r.status === 'passed' || r.status === 'warning');
  const buildPassed = !policy.gates.requireBuild || hasBuild;
  gates.push({
    gateId: 'build_verification',
    title: 'Build Verification',
    mandatory: policy.gates.requireBuild,
    passed: buildPassed,
    reason: buildPassed
      ? 'Build configuration or package build output verified.'
      : 'Build scripts or distribution artifacts failed or missing.'
  });

  // Gate 5: Security scan executed
  const secResults = results.filter(r => r.category === 'security');
  const secScanned = secResults.length > 0 && secResults.every(r => r.status !== 'skipped' && r.status !== 'error');
  const securityScanPassed = !policy.gates.requireSecurityScan || secScanned;
  gates.push({
    gateId: 'security_scan_completed',
    title: 'Security Scan Executed',
    mandatory: policy.gates.requireSecurityScan,
    passed: securityScanPassed,
    reason: securityScanPassed
      ? 'Security scanners executed without execution failure.'
      : 'Required security scan was skipped or encountered errors.'
  });

  // Gate 6: Minimum score
  const scorePassed = overallScore >= policy.gates.minimumScore;
  gates.push({
    gateId: 'minimum_score_threshold',
    title: `Minimum Quality Score (>= ${policy.gates.minimumScore})`,
    mandatory: true,
    passed: scorePassed,
    reason: scorePassed
      ? `Overall score (${overallScore}) satisfies minimum threshold (${policy.gates.minimumScore}).`
      : `Overall score (${overallScore}) is below minimum threshold (${policy.gates.minimumScore}).`
  });

  // Determine state
  const mandatoryGatesFailed = gates.filter(g => g.mandatory && !g.passed);
  const anyErrors = results.some(r => r.status === 'error');

  let state: ReleaseState = 'READY';
  let summary = 'Project meets all release readiness criteria and quality gates.';

  if (anyErrors && mandatoryGatesFailed.length > 0) {
    state = 'INCOMPLETE';
    summary = `Assessment could not finish reliably. Mandatory gates failed: ${mandatoryGatesFailed.map(g => g.title).join(', ')}.`;
  } else if (mandatoryGatesFailed.length > 0) {
    state = 'BLOCKED';
    summary = `Release blocked by ${mandatoryGatesFailed.length} mandatory gate failure(s): ${mandatoryGatesFailed.map(g => g.title).join(', ')}.`;
  } else if (countsBySeverity.MEDIUM > 0 || countsBySeverity.LOW > 0 || overallScore < 90) {
    state = 'READY_WITH_WARNINGS';
    summary = `Release ready with warnings. ${countsBySeverity.MEDIUM} medium and ${countsBySeverity.LOW} low severity finding(s) detected.`;
  }

  return {
    state,
    score: overallScore,
    summary,
    gates,
    categoryScores,
    totalFindings: findings.length,
    countsBySeverity
  };
}
