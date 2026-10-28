import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { fileExists, walkDirectory } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

export class HygieneAnalyzer implements IAnalyzer {
  public readonly id = 'repo-hygiene';
  public readonly name = 'Repository Hygiene';
  public readonly category = 'hygiene';
  public readonly version = '1.0.0';
  public readonly description = 'Scans for committed .env files, large artifacts, and temporary junk files.';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    // Check 1: Missing .gitignore
    const hasGitignore = await fileExists(path.join(ctx.projectPath, '.gitignore'));
    if (!hasGitignore) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'HYG-001',
        file: '.gitignore',
        title: 'Missing .gitignore file'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'HYG-001',
        severity: 'MEDIUM',
        title: 'Missing .gitignore file',
        message: 'No .gitignore file detected. Unwanted build artifacts or secrets may be committed.',
        file: '.gitignore',
        status: 'OPEN',
        remediation: 'Create a .gitignore file ignoring node_modules, dist, coverage, and .env files.'
      });
    }

    // Check 2: Committed .env files (excluding example/template files)
    const dangerousEnvFiles = ['.env', '.env.local', '.env.production', '.env.staging'];
    for (const envFile of dangerousEnvFiles) {
      if (await fileExists(path.join(ctx.projectPath, envFile))) {
        const fingerprint = computeFindingFingerprint({
          analyzerId: this.id,
          ruleId: 'HYG-002',
          file: envFile,
          title: `Committed environment configuration: ${envFile}`
        });
        findings.push({
          id: `finding-${findings.length + 1}`,
          fingerprint,
          analyzerId: this.id,
          category: this.category,
          ruleId: 'HYG-002',
          severity: 'HIGH',
          title: `Committed environment configuration: ${envFile}`,
          message: `The file '${envFile}' is present in the repository root. Ensure credentials and secrets are not committed.`,
          file: envFile,
          status: 'OPEN',
          remediation: `Add '${envFile}' to .gitignore and use .env.example instead.`
        });
      }
    }

    // Check 3: Walk repository for large files (> 10MB) and temp files
    try {
      const files = await walkDirectory(ctx.projectPath, { maxDepth: 4 });
      for (const file of files) {
        const relPath = path.relative(ctx.projectPath, file).replace(/\\/g, '/');
        const fileName = path.basename(file);

        // Junk files
        if (fileName === '.DS_Store' || fileName === 'Thumbs.db' || fileName.endsWith('.tmp') || fileName === 'npm-debug.log') {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'HYG-003',
            file: relPath,
            title: `Temporary OS/build file committed: ${fileName}`
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'HYG-003',
            severity: 'LOW',
            title: `Temporary OS/build file committed: ${fileName}`,
            message: `Junk file '${relPath}' should be pruned and added to .gitignore.`,
            file: relPath,
            status: 'OPEN',
            remediation: `Remove '${relPath}' and add it to your global or repo .gitignore.`
          });
        }

        // Large files
        try {
          const stat = await fs.stat(file);
          if (stat.size > 10 * 1024 * 1024) {
            const sizeMb = (stat.size / (1024 * 1024)).toFixed(1);
            const fingerprint = computeFindingFingerprint({
              analyzerId: this.id,
              ruleId: 'HYG-004',
              file: relPath,
              title: `Oversized repository artifact (${sizeMb} MB)`
            });
            findings.push({
              id: `finding-${findings.length + 1}`,
              fingerprint,
              analyzerId: this.id,
              category: this.category,
              ruleId: 'HYG-004',
              severity: 'MEDIUM',
              title: `Oversized repository artifact (${sizeMb} MB)`,
              message: `File '${relPath}' is ${sizeMb} MB. Storing large binary artifacts in Git slows down repository operations.`,
              file: relPath,
              status: 'OPEN',
              remediation: 'Use Git LFS or external release asset storage for large files.'
            });
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
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
        ? 'Repository hygiene checks passed cleanly.'
        : `Found ${findings.length} hygiene issue(s).`,
      durationMs,
      findings
    };
  }
}
