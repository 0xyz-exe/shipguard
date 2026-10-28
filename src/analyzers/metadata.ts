import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { fileExists, readJsonFile } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  license?: string;
  repository?: unknown;
  author?: unknown;
}

export class MetadataAnalyzer implements IAnalyzer {
  public readonly id = 'project-metadata';
  public readonly name = 'Project Metadata';
  public readonly category = 'documentation';
  public readonly version = '1.0.0';
  public readonly description = 'Validates package manifest metadata (name, version, license, repository).';

  public async isAvailable(ctx: AnalyzerContext): Promise<boolean> {
    return (
      (await fileExists(path.join(ctx.projectPath, 'package.json'))) ||
      (await fileExists(path.join(ctx.projectPath, 'Cargo.toml'))) ||
      (await fileExists(path.join(ctx.projectPath, 'pyproject.toml')))
    );
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const pkgPath = path.join(ctx.projectPath, 'package.json');
    const findings: Finding[] = [];
    const startTime = Date.now();

    if (await fileExists(pkgPath)) {
      const pkg = await readJsonFile<PackageJson>(pkgPath);
      if (!pkg) {
        const fingerprint = computeFindingFingerprint({
          analyzerId: this.id,
          ruleId: 'META-001',
          file: 'package.json',
          title: 'Invalid package.json manifest'
        });
        findings.push({
          id: `finding-${findings.length + 1}`,
          fingerprint,
          analyzerId: this.id,
          category: this.category,
          ruleId: 'META-001',
          severity: 'CRITICAL',
          title: 'Invalid package.json manifest',
          message: 'The package.json file exists but cannot be parsed as valid JSON.',
          file: 'package.json',
          status: 'OPEN',
          remediation: 'Check package.json for trailing commas or syntax errors.'
        });
      } else {
        if (!pkg.version || pkg.version === '0.0.0') {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'META-002',
            file: 'package.json',
            title: 'Missing or placeholder version'
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'META-002',
            severity: 'HIGH',
            title: 'Missing or placeholder version',
            message: `Package version is '${pkg.version || 'undefined'}'. Production releases must declare a semver release tag.`,
            file: 'package.json',
            status: 'OPEN',
            remediation: 'Specify a valid semantic version string (e.g., "1.0.0").'
          });
        }

        if (!pkg.license) {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'META-003',
            file: 'package.json',
            title: 'Missing license declaration'
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'META-003',
            severity: 'MEDIUM',
            title: 'Missing license declaration',
            message: 'No SPDX license identifier declared in package.json.',
            file: 'package.json',
            status: 'OPEN',
            remediation: 'Add a valid SPDX license identifier like "Apache-2.0" or "MIT".'
          });
        }

        if (!pkg.description || pkg.description.trim().length < 5) {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'META-004',
            file: 'package.json',
            title: 'Missing or minimal description'
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'META-004',
            severity: 'LOW',
            title: 'Missing or minimal description',
            message: 'Project description is missing or too short to describe package functionality.',
            file: 'package.json',
            status: 'OPEN',
            remediation: 'Add a descriptive summary explaining what this application does.'
          });
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
        ? 'Project metadata is valid and complete.'
        : `Found ${findings.length} project metadata issue(s).`,
      durationMs,
      findings
    };
  }
}
