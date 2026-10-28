import { Finding, FindingSeverity } from '../types/index.js';

export function formatSarifReport(params: {
  projectName: string;
  findings: Finding[];
}): string {
  const { findings } = params;

  function severityToLevel(severity: FindingSeverity): 'error' | 'warning' | 'note' {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
      case 'INFO':
      default:
        return 'note';
    }
  }

  const sarifResults = findings.map(f => {
    const uri = f.file ? f.file.replace(/\\/g, '/') : 'project-root';
    return {
      ruleId: f.ruleId,
      level: severityToLevel(f.severity),
      message: {
        text: `${f.title}: ${f.message}`
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri,
              uriBaseId: '%SRCROOT%'
            },
            region: {
              startLine: f.line || 1,
              startColumn: f.column || 1
            }
          }
        }
      ],
      properties: {
        category: f.category,
        severity: f.severity,
        fingerprint: f.fingerprint,
        remediation: f.remediation
      }
    };
  });

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'ShipGuard',
            version: '1.0.0',
            informationUri: 'https://github.com/0xyz-exe/shipguard',
            rules: Array.from(new Set(findings.map(f => f.ruleId))).map(ruleId => {
              const sample = findings.find(f => f.ruleId === ruleId);
              return {
                id: ruleId,
                name: sample?.title || ruleId,
                shortDescription: {
                  text: sample?.title || ruleId
                },
                defaultConfiguration: {
                  level: sample ? severityToLevel(sample.severity) : 'warning'
                }
              };
            })
          }
        },
        results: sarifResults
      }
    ]
  };

  return JSON.stringify(sarif, null, 2);
}
