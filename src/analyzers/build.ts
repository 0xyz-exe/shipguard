import * as path from 'node:path';
import { AnalyzerContext, AnalyzerResult, Finding, IAnalyzer } from '../types/index.js';
import { dirExists, fileExists, readJsonFile, safeReadFile } from '../utils/fs.js';
import { computeFindingFingerprint } from '../engine/fingerprint.js';

interface PackageJson {
  scripts?: Record<string, string>;
  main?: string;
  module?: string;
  types?: string;
}

export class BuildAnalyzer implements IAnalyzer {
  public readonly id = 'build-packaging';
  public readonly name = 'Build & Packaging';
  public readonly category = 'build';
  public readonly version = '1.0.0';
  public readonly description = 'Checks for build scripts, distribution artifacts, and Dockerfile health.';

  public async isAvailable(_ctx: AnalyzerContext): Promise<boolean> {
    return true;
  }

  public async run(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: Finding[] = [];
    const startTime = Date.now();

    const pkgPath = path.join(ctx.projectPath, 'package.json');
    let hasBuildScript = false;
    let mainField: string | undefined;

    if (await fileExists(pkgPath)) {
      const pkg = await readJsonFile<PackageJson>(pkgPath);
      hasBuildScript = Boolean(pkg?.scripts?.build);
      mainField = pkg?.main;

      if (!hasBuildScript) {
        const fingerprint = computeFindingFingerprint({
          analyzerId: this.id,
          ruleId: 'BUILD-001',
          file: 'package.json',
          title: 'Missing build script in package manifest'
        });
        findings.push({
          id: `finding-${findings.length + 1}`,
          fingerprint,
          analyzerId: this.id,
          category: this.category,
          ruleId: 'BUILD-001',
          severity: 'HIGH',
          title: 'Missing build script in package manifest',
          message: 'package.json does not define a "build" script to generate release artifacts.',
          file: 'package.json',
          status: 'OPEN',
          remediation: 'Add a "build" script using tsup, esbuild, vite, or tsc.'
        });
      }
    }

    // Check for build artifact directories
    const distDirs = ['dist', 'build', 'out', 'target'];
    let foundDist = false;
    for (const d of distDirs) {
      if (await dirExists(path.join(ctx.projectPath, d))) {
        foundDist = true;
        break;
      }
    }

    // Check main entry point existence if configured
    if (mainField) {
      const targetMain = path.join(ctx.projectPath, mainField);
      if (!(await fileExists(targetMain))) {
        const fingerprint = computeFindingFingerprint({
          analyzerId: this.id,
          ruleId: 'BUILD-002',
          file: 'package.json',
          title: 'Declared main entry point does not exist'
        });
        findings.push({
          id: `finding-${findings.length + 1}`,
          fingerprint,
          analyzerId: this.id,
          category: this.category,
          ruleId: 'BUILD-002',
          severity: 'MEDIUM',
          title: 'Declared main entry point does not exist',
          message: `The package.json main entry point '${mainField}' was not found on disk. Did you run build?`,
          file: 'package.json',
          status: 'OPEN',
          remediation: 'Run the build command before packaging or shipping the release.'
        });
      }
    }

    // Check Dockerfile if present
    const dockerfilePath = path.join(ctx.projectPath, 'Dockerfile');
    if (await fileExists(dockerfilePath)) {
      const dockerfileContent = await safeReadFile(dockerfilePath);
      if (dockerfileContent) {
        if (/FROM\s+[^\s:]+:latest/i.test(dockerfileContent)) {
          const fingerprint = computeFindingFingerprint({
            analyzerId: this.id,
            ruleId: 'BUILD-003',
            file: 'Dockerfile',
            title: 'Unpinned Docker base image (:latest)'
          });
          findings.push({
            id: `finding-${findings.length + 1}`,
            fingerprint,
            analyzerId: this.id,
            category: this.category,
            ruleId: 'BUILD-003',
            severity: 'MEDIUM',
            title: 'Unpinned Docker base image (:latest)',
            message: 'Dockerfile uses :latest tag for base image, risking non-reproducible builds.',
            file: 'Dockerfile',
            status: 'OPEN',
            remediation: 'Pin the Docker base image to a specific version or digest (e.g. node:20-alpine).'
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
        ? 'Build configuration and packaging verification passed.'
        : `Found ${findings.length} build and packaging issue(s).`,
      durationMs,
      findings,
      metadata: {
        hasBuildScript,
        hasDistDirectory: foundDist
      }
    };
  }
}
