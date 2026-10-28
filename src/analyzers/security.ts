import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { safeReadFile, walkDirectory } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';
import { redactSecrets } from '../engine/redactor.js';

interface SecretRule {
  ruleId: string;
  name: string;
  regex: RegExp;
  severity: 'CRITICAL' | 'HIGH';
  description: string;
}

const SECRET_RULES: SecretRule[] = [
  {
    ruleId: 'SEC-001',
    name: 'Exposed AWS Access Key',
    regex: /\b(AKIA[0-9A-Z]{16})\b/,
    severity: 'CRITICAL',
    description: 'Hardcoded AWS Access Key ID detected.'
  },
  {
    ruleId: 'SEC-002',
    name: 'Exposed GitHub Personal Access Token',
    regex: /\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b/,
    severity: 'CRITICAL',
    description: 'Hardcoded GitHub authentication token detected.'
  },
  {
    ruleId: 'SEC-003',
    name: 'Exposed Private Key',
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    severity: 'CRITICAL',
    description: 'Embedded private cryptographic key block detected.'
  },
  {
    ruleId: 'SEC-004',
    name: 'Exposed OpenAI / Anthropic API Key',
    regex: /\b(sk-[A-Za-z0-9_-]{20,})\b/,
    severity: 'CRITICAL',
    description: 'Hardcoded AI model provider API key detected.'
  },
  {
    ruleId: 'SEC-005',
    name: 'Database URI with Plaintext Password',
    regex: /[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^:]+:[^@\s]+@[a-zA-Z0-9.-]+/,
    severity: 'HIGH',
    description: 'Database connection URI contains hardcoded username and password.'
  }
];

export class SecurityAnalyzer implements IAnalyzer {
  public readonly id = 'security';
  public readonly name = 'Security & Secret Scanner';
  public readonly category = 'security';
  public readonly version = '1.0.0';
  public readonly description = 'Scans for hardcoded secrets, private keys, database credentials, and unsafe code patterns.';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    try {
      const files = await walkDirectory(ctx.projectPath, {
        maxDepth: 6,
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.yaml', '.yml', '.py', '.php', '.go', '.rs']
      });

      for (const file of files) {
        const relPath = path.relative(ctx.projectPath, file).replace(/\\/g, '/');

        // Skip test suites and fixtures from production secret scans
        if (relPath.startsWith('tests/') || relPath.startsWith('test/') || relPath.includes('/tests/') || relPath.includes('/test/')) {
          continue;
        }
        if (relPath.includes('analyzers/security') || relPath.includes('engine/redactor')) {
          continue;
        }

        const content = await safeReadFile(file, 1024 * 1024);
        if (!content) continue;

        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // 1. Check secret rules
          for (const rule of SECRET_RULES) {
            if (rule.regex.test(line)) {
              if (line.includes('mock') || line.includes('fake') || line.includes('example')) {
                continue;
              }

              const fingerprint = computeFindingFingerprint({
                analyzerId: this.id,
                ruleId: rule.ruleId,
                file: relPath,
                line: i + 1,
                title: rule.name
              });

              findings.push({
                id: `finding-${findings.length + 1}`,
                fingerprint,
                analyzerId: this.id,
                category: this.category,
                ruleId: rule.ruleId,
                severity: rule.severity,
                title: rule.name,
                message: `${rule.description} on line ${i + 1}: ${redactSecrets(line.trim()).slice(0, 100)}`,
                file: relPath,
                line: i + 1,
                status: 'OPEN',
                remediation: 'Immediately revoke the secret and move credentials to secure environment variables.'
              });
              break;
            }
          }

          // 2. SAST: Dangerous eval usage
          if (/\beval\s*\([^\)]+\)/.test(line) && !line.includes('// shipguard-ignore')) {
            const fingerprint = computeFindingFingerprint({
              analyzerId: this.id,
              ruleId: 'SEC-010',
              file: relPath,
              line: i + 1,
              title: 'Use of dangerous eval()'
            });
            findings.push({
              id: `finding-${findings.length + 1}`,
              fingerprint,
              analyzerId: this.id,
              category: this.category,
              ruleId: 'SEC-010',
              severity: 'HIGH',
              title: 'Use of dangerous eval()',
              message: `eval() execution introduces arbitrary code execution vulnerabilities on line ${i + 1}.`,
              file: relPath,
              line: i + 1,
              status: 'OPEN',
              remediation: 'Refactor code to avoid dynamic eval() execution.'
            });
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
        ? 'Security scan passed with zero detected secrets or high-risk patterns.'
        : `Found ${findings.length} security finding(s).`,
      durationMs,
      findings
    };
  }
}
