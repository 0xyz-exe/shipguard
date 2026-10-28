import { AnalyzerRegistry } from './engine/registry.js';
import { MetadataAnalyzer } from './analyzers/metadata.js';
import { HygieneAnalyzer } from './analyzers/hygiene.js';
import { DocumentationAnalyzer } from './analyzers/documentation.js';
import { CodeQualityAnalyzer } from './analyzers/code-quality.js';
import { TestingAnalyzer } from './analyzers/testing.js';
import { BuildAnalyzer } from './analyzers/build.js';
import { DependenciesAnalyzer } from './analyzers/dependencies.js';
import { SecurityAnalyzer } from './analyzers/security.js';
import { CicdAnalyzer } from './analyzers/cicd.js';

export function registerDefaultAnalyzers(): void {
  const registry = AnalyzerRegistry.getInstance();
  registry.register(new MetadataAnalyzer());
  registry.register(new HygieneAnalyzer());
  registry.register(new DocumentationAnalyzer());
  registry.register(new CodeQualityAnalyzer());
  registry.register(new TestingAnalyzer());
  registry.register(new BuildAnalyzer());
  registry.register(new DependenciesAnalyzer());
  registry.register(new SecurityAnalyzer());
  registry.register(new CicdAnalyzer());
}

// Auto-register on import
registerDefaultAnalyzers();

export * from './types/index.js';
export * from './config/schema.js';
export * from './config/defaults.js';
export * from './engine/fingerprint.js';
export * from './engine/redactor.js';
export * from './engine/scoring.js';
export * from './engine/gates.js';
export * from './engine/registry.js';
export * from './engine/runner.js';
export * from './reporters/terminal.js';
export * from './reporters/json.js';
export * from './reporters/sarif.js';
export * from './reporters/markdown.js';
export * from './store/db.js';
export * from './server/app.js';
export * from './server/ui.js';
