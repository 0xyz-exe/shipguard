import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { fileExists, safeReadFile, walkDirectory } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

export class CodeQualityAnalyzer implements IAnalyzer {
  public readonly id = 'code-quality';
  public readonly name = 'Code Quality & Hygiene';
  public readonly category = 'code_quality';
  public readonly version = '1.0.0';
  public readonly description = 'Checks for linter/formatter configurations, TODO/FIXME markers, and debugger statements.';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    // 1. Check for linter configuration
    const linterConfigs = [
      'eslint.config.js',
      'eslint.config.mjs',
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.yml',
      'biome.json',
      '.prettierrc',
      '.prettierrc.json'
    ];
    let hasLinter = false;
    for (const c of linterConfigs) {
      if (await fileExists(path.join(ctx.projectPath, c))) {
        hasLinter = true;
        break;
      }
    }

    if (!hasLinter) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'QUAL-001',
        title: 'No linter or formatter configuration detected'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'QUAL-001',
        severity: 'LOW',
        title: 'No linter or formatter configuration detected',
        message: 'No ESLint, Biome, or Prettier configuration detected. Code styling and static checks may be inconsistent.',
        status: 'OPEN',
        remediation: 'Set up ESLint, Biome, or Prettier to enforce consistent code style.'
      });
    }

    // 2. Scan source files for TODO/FIXME markers and debugger statements
    try {
      const sourceFiles = await walkDirectory(ctx.projectPath, {
        maxDepth: 6,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.php']
      });

      let todoCount = 0;
      for (const file of sourceFiles) {
        const relPath = path.relative(ctx.projectPath, file).replace(/\\/g, '/');
        const content = await safeReadFile(file, 512 * 1024);
        if (!content) continue;

        // Skip scanning analyzer definition files for self-referential keywords
        if (relPath.includes('analyzers/code-quality') || relPath.includes('engine/')) {
          continue;
        }

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for actual debugger statements in JS/TS (e.g. standalone debugger;)
          if (/^\s*debugger\s*;?$/.test(line.trim())) {
            const fingerprint = computeFindingFingerprint({
              analyzerId: this.id,
              ruleId: 'QUAL-002',
              file: relPath,
              line: i + 1,
              title: 'Debugger statement left in source code'
            });
            findings.push({
              id: `finding-${findings.length + 1}`,
              fingerprint,
              analyzerId: this.id,
              category: this.category,
              ruleId: 'QUAL-002',
              severity: 'HIGH',
              title: 'Debugger statement left in source code',
              message: `Explicit 'debugger' statement found on line ${i + 1}.`,
              file: relPath,
              line: i + 1,
              status: 'OPEN',
              remediation: 'Remove the debugger statement prior to shipping.'
            });
          }

          // Check for FIXME / XXX in actual comments
          if (/(?:\/\/|\/\*|#)\s*(FIXME|BUG|XXX)\b/i.test(line)) {
            todoCount++;
            if (todoCount <= 5) {
              const fingerprint = computeFindingFingerprint({
                analyzerId: this.id,
                ruleId: 'QUAL-003',
                file: relPath,
                line: i + 1,
                title: 'Unresolved FIXME marker'
              });
              findings.push({
                id: `finding-${findings.length + 1}`,
                fingerprint,
                analyzerId: this.id,
                category: this.category,
                ruleId: 'QUAL-003',
                severity: 'MEDIUM',
                title: 'Unresolved FIXME marker',
                message: `Code comment indicates a known issue or FIXME on line ${i + 1}: ${line.trim().slice(0, 80)}`,
                file: relPath,
                line: i + 1,
                status: 'OPEN',
                remediation: 'Address the highlighted defect before production release.'
              });
            }
          }
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
        ? 'Code quality checks passed with zero defects.'
        : `Found ${findings.length} code quality finding(s).`,
      durationMs,
      findings
    };
  }
}
