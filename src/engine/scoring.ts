import {
  AnalyzerCategory,
  AnalyzerResult,
  CategoryScore,
  Finding,
  FindingSeverity,
  ProjectPolicy
} from '../types/index.js';

export function calculateCategoryScores(
  results: AnalyzerResult[],
  policy: ProjectPolicy
): Record<AnalyzerCategory, CategoryScore> {
  const categories: AnalyzerCategory[] = [
    'security',
    'testing',
    'code_quality',
    'build',
    'dependencies',
    'cicd',
    'documentation',
    'hygiene'
  ];

  const scores: Partial<Record<AnalyzerCategory, CategoryScore>> = {};

  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const weight = policy.weights[cat] ?? 0;

    const findingsCount: Record<FindingSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0
    };

    let totalChecks = 0;
    let passedChecks = 0;
    let hasFailure = false;
    let allSkipped = catResults.length > 0;

    for (const r of catResults) {
      totalChecks += 1;
      if (r.status === 'passed') {
        passedChecks += 1;
        allSkipped = false;
      } else if (r.status === 'warning') {
        passedChecks += 0.5;
        allSkipped = false;
      } else if (r.status === 'failed' || r.status === 'error') {
        hasFailure = true;
        allSkipped = false;
      }

      for (const f of r.findings) {
        if (f.status === 'OPEN') {
          findingsCount[f.severity] = (findingsCount[f.severity] || 0) + 1;
        }
      }
    }

    // Deduction calculation
    let rawScore = 100;
    rawScore -= findingsCount.CRITICAL * 35;
    rawScore -= findingsCount.HIGH * 20;
    rawScore -= findingsCount.MEDIUM * 10;
    rawScore -= findingsCount.LOW * 4;

    if (hasFailure && rawScore > 50) {
      rawScore = 50;
    }

    let finalScore = Math.max(0, Math.min(100, Math.round(rawScore)));
    let status: 'passed' | 'warning' | 'failed' | 'skipped' = 'passed';

    if (catResults.length === 0 || allSkipped) {
      status = 'skipped';
      finalScore = 0;
    } else if (findingsCount.CRITICAL > 0 || findingsCount.HIGH > 0 || hasFailure) {
      status = 'failed';
    } else if (findingsCount.MEDIUM > 0 || findingsCount.LOW > 0) {
      status = 'warning';
    }

    scores[cat] = {
      category: cat,
      score: finalScore,
      weight,
      findingsCount,
      checksTotal: totalChecks,
      checksPassed: Math.floor(passedChecks),
      status
    };
  }

  return scores as Record<AnalyzerCategory, CategoryScore>;
}

export function calculateOverallScore(
  categoryScores: Record<AnalyzerCategory, CategoryScore>
): number {
  let totalWeightedScore = 0;
  let totalApplicableWeight = 0;

  for (const score of Object.values(categoryScores)) {
    if (score.weight > 0 && score.status !== 'skipped') {
      totalWeightedScore += score.score * score.weight;
      totalApplicableWeight += score.weight;
    }
  }

  if (totalApplicableWeight === 0) return 0;
  return Math.round((totalWeightedScore / totalApplicableWeight) * 10) / 10;
}
