#!/usr/bin/env node
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import {
  registerDefaultAnalyzers,
  AnalyzerRegistry,
  runAssessment,
  formatTerminalReport,
  formatJsonReport,
  formatSarifReport,
  formatMarkdownReport,
  createServer,
  DEFAULT_POLICY,
  PROFILES,
  DatabaseStore
} from '../index.js';
import { ShipguardConfigSchema } from '../config/schema.js';

registerDefaultAnalyzers();

function printHelp(): void {
  console.log(`
🛡️  ShipGuard — Software Release Readiness & Quality Checker
Know your release is ready before you ship.

USAGE:
  shipguard <command> [options]

COMMANDS:
  analyze [dir]          Run release readiness assessment (default)
  init                   Generate shipguard.config.json in project
  doctor                 Check analyzer system prerequisites and health
  report                 Print or export latest assessment report
  config validate        Validate project shipguard.config.json
  analyzers list         List all registered quality and security analyzers
  ui, web, serve         Launch interactive web dashboard
  version, -v            Show current version
  help, -h               Show this help message

OPTIONS:
  --project, -p <dir>    Target directory to inspect (default: .)
  --profile <name>       Readiness profile: production, strict, standard, lax
  --format, -f <fmt>     Output format: text, json, sarif, markdown (default: text)
  --output, -o <file>    Save report to destination file
  --port <num>           Port for web dashboard (default: 4173)
  --strict               Fail on warnings as well as blockers (exit code 1)
  --quiet, -q            Suppress banner output

EXIT CODES:
  0                      Release criteria satisfied (READY)
  1                      Release blocked or gates failed (BLOCKED)
  2                      Configuration error or invalid CLI arguments
  3                      Internal execution failure or timeout
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'analyze';

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === 'version' || command === '--version' || command === '-v') {
    console.log('shipguard v1.0.0');
    process.exit(0);
  }

  // Helper argument extractor
  function getArg(flag: string, alias?: string): string | undefined {
    for (let i = 0; i < args.length; i++) {
      if (args[i] === flag || (alias && args[i] === alias)) {
        return args[i + 1];
      }
      if (args[i].startsWith(flag + '=')) {
        return args[i].split('=')[1];
      }
    }
    return undefined;
  }

  const hasFlag = (flag: string, alias?: string): boolean =>
    args.includes(flag) || (alias ? args.includes(alias) : false);

  // Command: init
  if (command === 'init') {
    const configPath = path.join(process.cwd(), 'shipguard.config.json');
    try {
      await fs.access(configPath);
      console.error('❌ shipguard.config.json already exists in this directory.');
      process.exit(2);
    } catch {
      const sampleConfig = {
        $schema: 'https://raw.githubusercontent.com/0xyz-exe/shipguard/main/schemas/shipguard-config.schema.json',
        version: 1,
        profile: 'production',
        scoring: {
          security: 25,
          testing: 20,
          code_quality: 15,
          build: 15,
          dependencies: 10,
          cicd: 10,
          documentation: 5,
          hygiene: 0
        },
        gates: {
          failOnCritical: true,
          failOnHigh: false,
          requireTests: true,
          requireBuild: true,
          requireSecurityScan: true,
          minimumScore: 80
        },
        coverage: {
          enabled: true,
          minimumPercentage: 70
        },
        exclusions: [
          'node_modules/**',
          'dist/**',
          'coverage/**',
          '.git/**'
        ]
      };
      await fs.writeFile(configPath, JSON.stringify(sampleConfig, null, 2), 'utf-8');
      console.log('✅ Created shipguard.config.json successfully.');
      process.exit(0);
    }
  }

  // Command: config validate
  if (command === 'config' && args[1] === 'validate') {
    const configPath = path.join(process.cwd(), 'shipguard.config.json');
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      const res = ShipguardConfigSchema.safeParse(parsed);
      if (!res.success) {
        console.error('❌ shipguard.config.json validation failed:');
        console.error(res.error.format());
        process.exit(2);
      }
      console.log('✅ shipguard.config.json is valid.');
      process.exit(0);
    } catch (err: unknown) {
      console.error('❌ Could not read shipguard.config.json:', err instanceof Error ? err.message : String(err));
      process.exit(2);
    }
  }

  // Command: analyzers list
  if (command === 'analyzers' && (args[1] === 'list' || !args[1])) {
    const registry = AnalyzerRegistry.getInstance();
    const analyzers = registry.getAll();
    console.log(`\n🛡️  Registered ShipGuard Analyzers (${analyzers.length}):\n`);
    for (const a of analyzers) {
      console.log(`  • \x1b[1m${a.id}\x1b[0m (${a.category}) - ${a.name} v${a.version}`);
      console.log(`    \x1b[90m${a.description}\x1b[0m`);
    }
    console.log('');
    process.exit(0);
  }

  // Command: doctor
  if (command === 'doctor') {
    console.log('\n🩺 ShipGuard System & Analyzer Diagnostics:');
    console.log(`  • Node.js:    ${process.version}`);
    console.log(`  • Platform:   ${process.platform} (${process.arch})`);
    console.log(`  • WorkingDir: ${process.cwd()}`);

    const registry = AnalyzerRegistry.getInstance();
    const analyzers = registry.getAll();
    console.log(`\nChecking analyzer applicability for current workspace:`);
    for (const a of analyzers) {
      try {
        const isAvail = await a.isAvailable({ projectPath: process.cwd(), options: {} });
        const icon = isAvail ? '✔' : '○';
        const color = isAvail ? '\x1b[32m' : '\x1b[90m';
        console.log(`  ${color}${icon} ${a.name} [${a.category}]\x1b[0m`);
      } catch (err) {
        console.log(`  \x1b[31m✘ ${a.name}: Error checking availability\x1b[0m`);
      }
    }
    console.log('\nDiagnostics complete.\n');
    process.exit(0);
  }

  // Command: ui / web / serve
  if (command === 'ui' || command === 'web' || command === 'serve') {
    const port = parseInt(getArg('--port') || '4173', 10);
    const server = createServer();
    server.listen(port, () => {
      console.log(`\n🛡️  ShipGuard Dashboard running at:`);
      console.log(`   \x1b[36mhttp://localhost:${port}\x1b[0m\n`);
      console.log(`Press Ctrl+C to stop the server.\n`);
    });
    return;
  }

  // Command: report
  if (command === 'report') {
    const store = DatabaseStore.getInstance();
    const latest = (await store.getAssessments())[0];
    if (!latest) {
      console.error('❌ No previous assessment found in store. Run "shipguard analyze" first.');
      process.exit(2);
    }
    const fmt = getArg('--format', '-f') || 'text';
    if (fmt === 'json') {
      console.log(formatJsonReport(latest));
    } else if (fmt === 'sarif') {
      console.log(formatSarifReport({ projectName: latest.projectName, findings: latest.findings }));
    } else if (fmt === 'markdown') {
      console.log(formatMarkdownReport(latest));
    } else {
      console.log(formatTerminalReport(latest));
    }
    process.exit(0);
  }

  // Command: analyze (default)
  let targetDir = args[1] && !args[1].startsWith('-') ? args[1] : (getArg('--project', '-p') || process.cwd());
  targetDir = path.resolve(targetDir);

  const profileName = getArg('--profile') || 'production';
  const profileConfig = PROFILES[profileName] || PROFILES.production;

  const policy = {
    ...DEFAULT_POLICY,
    ...profileConfig,
    gates: {
      ...DEFAULT_POLICY.gates,
      ...(profileConfig.gates || {})
    }
  };

  // Check if target directory exists
  try {
    const stat = await fs.stat(targetDir);
    if (!stat.isDirectory()) {
      console.error(`❌ Target path '${targetDir}' is not a directory.`);
      process.exit(2);
    }
  } catch {
    console.error(`❌ Directory '${targetDir}' not found.`);
    process.exit(2);
  }

  const format = getArg('--format', '-f') || 'text';
  const outputFile = getArg('--output', '-o');
  const isStrict = hasFlag('--strict');

  try {
    const output = await runAssessment({
      projectPath: targetDir,
      policy
    });

    const assessmentRecord = {
      id: `asm-${Date.now().toString(36)}`,
      projectId: 'default-project',
      projectName: path.basename(targetDir),
      projectPath: targetDir,
      timestamp: new Date().toISOString(),
      durationMs: output.durationMs,
      decision: output.decision,
      findings: output.findings,
      analyzerResults: output.results
    };

    // Save to local database
    const store = DatabaseStore.getInstance();
    await store.saveAssessment(assessmentRecord);

    let formatted = '';
    if (format === 'json') {
      formatted = formatJsonReport(assessmentRecord);
    } else if (format === 'sarif') {
      formatted = formatSarifReport({ projectName: assessmentRecord.projectName, findings: assessmentRecord.findings });
    } else if (format === 'markdown') {
      formatted = formatMarkdownReport(assessmentRecord);
    } else {
      formatted = formatTerminalReport(assessmentRecord);
    }

    if (outputFile) {
      await fs.writeFile(outputFile, formatted, 'utf-8');
      console.log(`✅ Assessment report written to ${outputFile}`);
    } else {
      console.log(formatted);
    }

    if (output.decision.state === 'BLOCKED' || output.decision.state === 'INCOMPLETE') {
      process.exit(1);
    }

    if (isStrict && output.decision.state === 'READY_WITH_WARNINGS') {
      process.exit(1);
    }

    process.exit(0);
  } catch (err: unknown) {
    console.error('❌ Assessment failed unexpectedly:', err instanceof Error ? err.message : String(err));
    process.exit(3);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(3);
});
