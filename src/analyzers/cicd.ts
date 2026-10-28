import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { dirExists, safeReadFile, walkDirectory } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

export class CicdAnalyzer implements IAnalyzer {
  public readonly id = 'cicd-readiness';
  public readonly name = 'CI/CD Readiness';
  public readonly category = 'cicd';
  public readonly version = '1.0.0';
  public readonly description = 'Checks for GitHub Actions workflows, automated CI testing, build steps, and security permissions.';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    const workflowsDir = path.join(ctx.projectPath, '.github', 'workflows');
    const hasWorkflowsDir = await dirExists(workflowsDir);

    let workflowFiles: string[] = [];
    if (hasWorkflowsDir) {
      try {
        workflowFiles = await walkDirectory(workflowsDir, {
          maxDepth: 2,
          extensions: ['.yml', '.yaml']
        });
      } catch {
        // ignore
      }
    }

    if (!hasWorkflowsDir || workflowFiles.length === 0) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'CICD-001',
        title: 'Missing CI/CD workflows'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'CICD-001',
        severity: 'MEDIUM',
        title: 'Missing CI/CD workflows',
        message: 'No GitHub Actions workflows found under .github/workflows. Automated release verification is not active.',
        file: '.github/workflows',
        status: 'OPEN',
        remediation: 'Add a GitHub Actions workflow (.github/workflows/ci.yml) to automate tests and builds.'
      });
    } else {
      let hasTestStep = false;
      let hasBuildStep = false;

      for (const wf of workflowFiles) {
        const relPath = path.relative(ctx.projectPath, wf).replace(/\\/g, '/');
        const content = await safeReadFile(wf);
        if (!content) continue;

        if (/(test|vitest|jest|pytest|npm run test|pnpm test)/i.test(content)) {
          hasTestStep = true;
        }

        if (/(build|tsup|vite build|npm run build|pnpm run build)/i.test(content)) {
          hasBuildStep = true;
        }

        // Check for overly permissive permissions: write-all
        if (/permissions:\s*write-all/i.test(content)) {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'CICD-002',
            file: relPath,
            title: 'Excessive workflow permissions (write-all)'
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'CICD-002',
            severity: 'HIGH',
            title: 'Excessive workflow permissions (write-all)',
            message: `Workflow '${relPath}' specifies 'permissions: write-all', granting broad repository write tokens.`,
            file: relPath,
            status: 'OPEN',
            remediation: 'Follow the principle of least privilege and grant only needed scopes (e.g. contents: read).'
          });
        }
      }

      if (!hasTestStep) {
        const fingerprint = computeFindingFingerprint({
          analyzerId: this.id,
          ruleId: 'CICD-003',
          title: 'CI workflow does not execute tests'
        });
        findings.push({
          id: `finding-${findings.length + 1}`,
          fingerprint,
          analyzerId: this.id,
          category: this.category,
          ruleId: 'CICD-003',
          severity: 'MEDIUM',
          title: 'CI workflow does not execute tests',
          message: 'GitHub Actions workflows exist but do not appear to run automated test commands.',
          status: 'OPEN',
          remediation: 'Add a test job or step in your CI workflow to ensure tests run before release.'
        });
      }

      if (!hasBuildStep) {
        const fingerprint = computeFindingFingerprint({
          analyzerId: this.id,
          ruleId: 'CICD-004',
          title: 'CI workflow does not verify application build'
        });
        findings.push({
          id: `finding-${findings.length + 1}`,
          fingerprint,
          analyzerId: this.id,
          category: this.category,
          ruleId: 'CICD-004',
          severity: 'LOW',
          title: 'CI workflow does not verify application build',
          message: 'GitHub Actions workflows do not contain a build verification step.',
          status: 'OPEN',
          remediation: 'Add a build step in CI to verify that compilation succeeds prior to publishing.'
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const status = findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
      ? 'failed'
      : findings.length > 0
      ? 'warning'
      : 'passed';

    return {
      analyzerId: this.id,
      category: this.category,
      status,
      summary: findings.length === 0
        ? 'CI/CD readiness check passed with active automated workflows.'
        : `Found ${findings.length} CI/CD workflow issue(s).`,
      durationMs,
      findings,
      metadata: {
        workflowFilesCount: workflowFiles.length
      }
    };
  }
}
