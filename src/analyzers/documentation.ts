import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { fileExists, safeReadFile } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

export class DocumentationAnalyzer implements IAnalyzer {
  public readonly id = 'documentation';
  public readonly name = 'Documentation & Metadata';
  public readonly category = 'documentation';
  public readonly version = '1.0.0';
  public readonly description = 'Checks for essential project docs (README, LICENSE, SECURITY, CONTRIBUTING, CHANGELOG).';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    // 1. README.md
    const readmeFiles = ['README.md', 'README.markdown', 'readme.md'];
    let foundReadme = false;
    for (const r of readmeFiles) {
      const p = path.join(ctx.projectPath, r);
      if (await fileExists(p)) {
        foundReadme = true;
        const content = await safeReadFile(p);
        if (!content || content.trim().length < 50) {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'DOC-002',
            file: r,
            title: 'Empty or skeleton README'
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'DOC-002',
            severity: 'MEDIUM',
            title: 'Empty or skeleton README',
            message: `The '${r}' file exists but contains very little content (< 50 characters).`,
            file: r,
            status: 'OPEN',
            remediation: 'Expand README with installation steps, usage examples, and architecture overview.'
          });
        }
        break;
      }
    }

    if (!foundReadme) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'DOC-001',
        file: 'README.md',
        title: 'Missing README.md file'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'DOC-001',
        severity: 'HIGH',
        title: 'Missing README.md file',
        message: 'No README documentation found in the project root.',
        file: 'README.md',
        status: 'OPEN',
        remediation: 'Create a comprehensive README.md file explaining the project.'
      });
    }

    // 2. LICENSE
    const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE'];
    let foundLicense = false;
    for (const l of licenseFiles) {
      if (await fileExists(path.join(ctx.projectPath, l))) {
        foundLicense = true;
        break;
      }
    }
    if (!foundLicense) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'DOC-003',
        file: 'LICENSE',
        title: 'Missing LICENSE file'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'DOC-003',
        severity: 'MEDIUM',
        title: 'Missing LICENSE file',
        message: 'No open-source license file found in project root.',
        file: 'LICENSE',
        status: 'OPEN',
        remediation: 'Add an OSI-approved license file such as Apache-2.0 or MIT.'
      });
    }

    // 3. SECURITY.md
    const securityFiles = ['SECURITY.md', '.github/SECURITY.md', 'docs/SECURITY.md'];
    let foundSecurity = false;
    for (const s of securityFiles) {
      if (await fileExists(path.join(ctx.projectPath, s))) {
        foundSecurity = true;
        break;
      }
    }
    if (!foundSecurity) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'DOC-004',
        file: 'SECURITY.md',
        title: 'Missing SECURITY.md vulnerability reporting policy'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'DOC-004',
        severity: 'LOW',
        title: 'Missing SECURITY.md vulnerability reporting policy',
        message: 'No SECURITY.md file found. Open-source releases should document how to report vulnerabilities.',
        file: 'SECURITY.md',
        status: 'OPEN',
        remediation: 'Create a SECURITY.md file with contact details for responsible disclosure.'
      });
    }

    // 4. CHANGELOG.md
    const changelogFiles = ['CHANGELOG.md', 'HISTORY.md', 'RELEASES.md'];
    let foundChangelog = false;
    for (const c of changelogFiles) {
      if (await fileExists(path.join(ctx.projectPath, c))) {
        foundChangelog = true;
        break;
      }
    }
    if (!foundChangelog) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'DOC-005',
        file: 'CHANGELOG.md',
        title: 'Missing CHANGELOG.md'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'DOC-005',
        severity: 'INFO',
        title: 'Missing CHANGELOG.md',
        message: 'No release changelog detected in the repository.',
        file: 'CHANGELOG.md',
        status: 'OPEN',
        remediation: 'Maintain a CHANGELOG.md documenting changes across versions.'
      });
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
        ? 'All standard release documentation files are present.'
        : `Found ${findings.length} documentation recommendation(s).`,
      durationMs,
      findings
    };
  }
}
