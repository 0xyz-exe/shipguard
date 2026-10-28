import {
  AnalyzerContext,
  AnalyzerResult,
  Finding,
  IAnalyzer,
  ProjectPolicy,
  ReleaseDecision
} from '../types/index.js';
import { AnalyzerRegistry } from './registry.js';
import { evaluateReleaseGates } from './gates.js';
import { redactObject } from './redactor.js';

export interface RunOptions {
  projectPath: string;
  policy: ProjectPolicy;
  analyzerIds?: string[];
  timeoutMs?: number;
}

export async function runAssessment(options: RunOptions): Promise<{
  decision: ReleaseDecision;
  findings: Finding[];
  results: AnalyzerResult[];
  durationMs: number;
}> {
  const startTime = Date.now();
  const registry = AnalyzerRegistry.getInstance();
  const allAnalyzers = registry.getAll();

  const selectedAnalyzers: IAnalyzer[] = options.analyzerIds
    ? allAnalyzers.filter(a => options.analyzerIds!.includes(a.id))
    : allAnalyzers;

  const timeoutMs = options.timeoutMs ?? 10000;
  const ctx: AnalyzerContext = {
    projectPath: options.projectPath,
    options: {}
  };

  const results: AnalyzerResult[] = [];
  const allFindings: Finding[] = [];

  // Run analyzers in parallel with individual error boundaries and timeouts
  const promises = selectedAnalyzers.map(async (analyzer) => {
    const analyzerStart = Date.now();
    try {
      const isAvail = await analyzer.isAvailable(ctx);
      if (!isAvail) {
        return {
          analyzerId: analyzer.id,
          category: analyzer.category,
          status: 'skipped' as const,
          summary: `Analyzer '${analyzer.name}' is not applicable or required tools are not installed.`,
          durationMs: Date.now() - analyzerStart,
          findings: []
        };
      }

      // Execute with timeout
      const resultPromise = analyzer.run(ctx);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Execution timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      const res = await Promise.race([resultPromise, timeoutPromise]);
      return res;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        analyzerId: analyzer.id,
        category: analyzer.category,
        status: 'error' as const,
        summary: `Analyzer '${analyzer.name}' failed: ${errorMsg}`,
        durationMs: Date.now() - analyzerStart,
        findings: [],
        error: errorMsg
      };
    }
  });

  const settled = await Promise.all(promises);

  for (const rawRes of settled) {
    // Redact all sensitive strings from analyzer output
    const res = redactObject(rawRes);
    results.push(res);
    for (const rawFinding of res.findings) {
      const finding = redactObject(rawFinding);
      allFindings.push(finding);
    }
  }

  const durationMs = Date.now() - startTime;
  const decision = evaluateReleaseGates({
    results,
    findings: allFindings,
    policy: options.policy
  });

  return {
    decision,
    findings: allFindings,
    results,
    durationMs
  };
}
