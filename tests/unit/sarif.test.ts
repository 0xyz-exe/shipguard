import { describe, it, expect } from 'vitest';
import { formatSarifReport } from '../../src/reporters/sarif.js';
import { Finding } from '../../src/types/index.js';

describe('SARIF Reporter', () => {
  it('produces valid OASIS SARIF 2.1.0 JSON format', () => {
    const findings: Finding[] = [
      {
        id: 'f-1',
        fingerprint: 'fp-1',
        analyzerId: 'security',
        category: 'security',
        ruleId: 'SEC-001',
        severity: 'CRITICAL',
        title: 'Exposed Secret',
        message: 'Hardcoded API key detected',
        file: 'src/secret.ts',
        line: 10,
        status: 'OPEN'
      }
    ];

    const rawSarif = formatSarifReport({
      projectName: 'test-app',
      findings
    });

    const parsed = JSON.parse(rawSarif);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].tool.driver.name).toBe('ShipGuard');
    expect(parsed.runs[0].results).toHaveLength(1);
    expect(parsed.runs[0].results[0].ruleId).toBe('SEC-001');
    expect(parsed.runs[0].results[0].level).toBe('error');
  });
});
