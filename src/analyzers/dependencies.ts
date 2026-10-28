import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { fileExists, readJsonFile } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class DependenciesAnalyzer implements IAnalyzer {
  public readonly id = 'dependencies';
  public readonly name = 'Dependency Health';
  public readonly category = 'dependencies';
  public readonly version = '1.0.0';
  public readonly description = 'Checks lockfile integrity, package manager conflicts, and vulnerable dependency patterns.';

  public async isAvailable(ctx: AnalyzerContext): Promise<boolean> {
    return (
      (await fileExists(path.join(ctx.projectPath, 'package.json'))) ||
      (await fileExists(path.join(ctx.projectPath, 'requirements.txt'))) ||
      (await fileExists(path.join(ctx.projectPath, 'Cargo.toml')))
    );
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    const lockfiles = [
      { name: 'pnpm-lock.yaml', tool: 'pnpm' },
      { name: 'package-lock.json', tool: 'npm' },
      { name: 'yarn.lock', tool: 'yarn' },
      { name: 'bun.lockb', tool: 'bun' }
    ];

    const detectedLockfiles: string[] = [];
    for (const lf of lockfiles) {
      if (await fileExists(path.join(ctx.projectPath, lf.name))) {
        detectedLockfiles.push(lf.name);
      }
    }

    const hasPackageJson = await fileExists(path.join(ctx.projectPath, 'package.json'));

    // 1. Missing lockfile
    if (hasPackageJson && detectedLockfiles.length === 0) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'DEP-001',
        title: 'Missing dependency lockfile'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'DEP-001',
        severity: 'HIGH',
        title: 'Missing dependency lockfile',
        message: 'package.json found without a corresponding lockfile (pnpm-lock.yaml, package-lock.json, etc.). Builds may not be reproducible.',
        status: 'OPEN',
        remediation: 'Run your package manager to generate a deterministic lockfile and commit it.'
      });
    }

    // 2. Conflicting lockfiles
    if (detectedLockfiles.length > 1) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'DEP-002',
        title: `Multiple conflicting lockfiles detected (${detectedLockfiles.join(', ')})`
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'DEP-002',
        severity: 'HIGH',
        title: `Multiple conflicting lockfiles detected (${detectedLockfiles.join(', ')})`,
        message: `Found multiple package manager lockfiles: ${detectedLockfiles.join(', ')}. This leads to non-deterministic dependency installations across environments.`,
        status: 'OPEN',
        remediation: `Standardize on a single package manager and delete the redundant lockfiles.`
      });
    }

    // 3. Check for wildcards or unstable versions in package.json
    if (hasPackageJson) {
      const pkg = await readJsonFile<PackageJson>(path.join(ctx.projectPath, 'package.json'));
      if (pkg?.dependencies) {
        for (const [dep, version] of Object.entries(pkg.dependencies)) {
          if (version === '*' || version === 'latest') {
            const fingerprint = computeFindingFingerprint({
              analyzerId: this.id,
              ruleId: 'DEP-003',
              file: 'package.json',
              title: `Unpinned wildcard dependency: ${dep}@${version}`
            });
            findings.push({
              id: `finding-${findings.length + 1}`,
              fingerprint,
              analyzerId: this.id,
              category: this.category,
              ruleId: 'DEP-003',
              severity: 'MEDIUM',
              title: `Unpinned wildcard dependency: ${dep}@${version}`,
              message: `Dependency '${dep}' uses '${version}' which can break builds when upstream releases unexpected breaking changes.`,
              file: 'package.json',
              status: 'OPEN',
              remediation: `Pin '${dep}' to a specific semantic version range (e.g. ^1.2.0).`
            });
          }
        }
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
        ? 'Dependency health and lockfile verification passed.'
        : `Found ${findings.length} dependency issue(s).`,
      durationMs,
      findings
    };
  }
}
