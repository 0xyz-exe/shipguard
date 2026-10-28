import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { dirExists, fileExists, readJsonFile, walkDirectory } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
}

export class TestingAnalyzer implements IAnalyzer {
  public readonly id = 'testing-coverage';
  public readonly name = 'Testing & Coverage';
  public readonly category = 'testing';
  public readonly version = '1.0.0';
  public readonly description = 'Verifies test frameworks, test suites, and coverage reports.';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    // 1. Discover test files
    let testFiles: string[] = [];
    try {
      testFiles = await walkDirectory(ctx.projectPath, {
        maxDepth: 5,
        extensions: ['.test.ts', '.spec.ts', '.test.js', '.spec.js', '.test.py', '_test.go', '_test.rs']
      });
    } catch {
      // ignore
    }

    const hasTestsDir = (await dirExists(path.join(ctx.projectPath, 'tests'))) ||
                        (await dirExists(path.join(ctx.projectPath, 'test')));

    // 2. Discover test configuration in package.json or config files
    let hasTestScript = false;
    let isStubTestScript = false;

    const pkgPath = path.join(ctx.projectPath, 'package.json');
    if (await fileExists(pkgPath)) {
      const pkg = await readJsonFile<PackageJson>(pkgPath);
      if (pkg?.scripts?.test) {
        hasTestScript = true;
        if (pkg.scripts.test.includes('no test specified') || pkg.scripts.test === 'exit 1') {
          isStubTestScript = true;
        }
      }
    }

    const testConfigs = [
      'vitest.config.ts',
      'vitest.config.js',
      'jest.config.js',
      'jest.config.ts',
      'pytest.ini',
      'phpunit.xml'
    ];
    let hasTestConfig = false;
    for (const c of testConfigs) {
      if (await fileExists(path.join(ctx.projectPath, c))) {
        hasTestConfig = true;
        break;
      }
    }

    // Evaluate findings
    if (isStubTestScript) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'TEST-001',
        file: 'package.json',
        title: 'Stub test script detected'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'TEST-001',
        severity: 'HIGH',
        title: 'Stub test script detected',
        message: 'The package.json contains an unconfigured stub test script ("no test specified").',
        file: 'package.json',
        status: 'OPEN',
        remediation: 'Configure a real test runner such as Vitest or Jest.'
      });
    } else if (!hasTestScript && !hasTestConfig && testFiles.length === 0) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'TEST-002',
        title: 'No automated tests detected'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'TEST-002',
        severity: 'HIGH',
        title: 'No automated tests detected',
        message: 'No test configuration, test files, or test execution scripts were found in the project.',
        status: 'OPEN',
        remediation: 'Add unit and integration tests to ensure release reliability.'
      });
    }

    // 3. Check for coverage reports
    const coverageFiles = [
      'coverage/lcov.info',
      'coverage/coverage-final.json',
      'coverage/index.html',
      '.coverage'
    ];
    let hasCoverageReport = false;
    for (const c of coverageFiles) {
      if (await fileExists(path.join(ctx.projectPath, c))) {
        hasCoverageReport = true;
        break;
      }
    }

    if (!hasCoverageReport && (hasTestScript || testFiles.length > 0)) {
      const fingerprint = computeFindingFingerprint({
        analyzerId: this.id,
        ruleId: 'TEST-003',
        title: 'Missing code coverage report'
      });
      findings.push({
        id: `finding-${findings.length + 1}`,
        fingerprint,
        analyzerId: this.id,
        category: this.category,
        ruleId: 'TEST-003',
        severity: 'LOW',
        title: 'Missing code coverage report',
        message: 'No recent coverage report found in coverage/ directory. Run tests with coverage enabled.',
        status: 'OPEN',
        remediation: 'Run your test suite with --coverage to generate coverage artifacts.'
      });
    }

    const durationMs = Date.now() - startTime;
    const passed = (hasTestScript || hasTestConfig || testFiles.length > 0 || hasTestsDir) && !isStubTestScript;
    const status = findings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH')
      ? 'failed'
      : findings.length > 0
      ? 'warning'
      : 'passed';

    return {
      analyzerId: this.id,
      category: this.category,
      status,
      summary: passed
        ? `Found ${testFiles.length} test file(s) and valid test configuration.`
        : 'Automated testing is missing or misconfigured.',
      durationMs,
      findings,
      metadata: {
        testFilesCount: testFiles.length,
        hasCoverageReport,
        hasTestScript
      }
    };
  }
}
