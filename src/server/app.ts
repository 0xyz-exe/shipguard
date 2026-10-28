import * as http from 'node:http';
import * as path from 'node:path';
import { DatabaseStore } from '../store/db.js';
import { runAssessment } from '../engine/runner.js';
import { AnalyzerRegistry } from '../engine/registry.js';
import { MetadataAnalyzer } from '../analyzers/metadata.js';
import { HygieneAnalyzer } from '../analyzers/hygiene.js';
import { DocumentationAnalyzer } from '../analyzers/documentation.js';
import { CodeQualityAnalyzer } from '../analyzers/code-quality.js';
import { TestingAnalyzer } from '../analyzers/testing.js';
import { BuildAnalyzer } from '../analyzers/build.js';
import { DependenciesAnalyzer } from '../analyzers/dependencies.js';
import { SecurityAnalyzer } from '../analyzers/security.js';
import { CicdAnalyzer } from '../analyzers/cicd.js';

function ensureAnalyzersRegistered(): void {
  const reg = AnalyzerRegistry.getInstance();
  if (reg.getAll().length === 0) {
    reg.register(new MetadataAnalyzer());
    reg.register(new HygieneAnalyzer());
    reg.register(new DocumentationAnalyzer());
    reg.register(new CodeQualityAnalyzer());
    reg.register(new TestingAnalyzer());
    reg.register(new BuildAnalyzer());
    reg.register(new DependenciesAnalyzer());
    reg.register(new SecurityAnalyzer());
    reg.register(new CicdAnalyzer());
  }
}
import { formatJsonReport } from '../reporters/json.js';
import { formatSarifReport } from '../reporters/sarif.js';
import { formatMarkdownReport } from '../reporters/markdown.js';
import { getDashboardHtml } from './ui.js';
import { FindingStatus } from '../types/index.js';

export function createServer(options: { port?: number; dbPath?: string } = {}): http.Server {
  ensureAnalyzersRegistered();
  const store = DatabaseStore.getInstance(options.dbPath);

  const server = http.createServer(async (req, res) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    try {
      // 1. Dashboard UI
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getDashboardHtml());
        return;
      }

      // 2. Health endpoint
      if (pathname === '/api/v1/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));
        return;
      }

      // 3. Analyzers List
      if (pathname === '/api/v1/analyzers') {
        const analyzers = AnalyzerRegistry.getInstance().getAll().map(a => ({
          id: a.id,
          name: a.name,
          category: a.category,
          version: a.version,
          description: a.description
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(analyzers));
        return;
      }

      // 4. Projects List & Create
      if (pathname === '/api/v1/projects') {
        if (method === 'GET') {
          const projects = await store.getProjects();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(projects));
          return;
        }
        if (method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const newProj = await store.createProject({
                name: data.name || 'Unnamed Project',
                path: data.path || process.cwd(),
                policy: data.policy || (await store.getProjects())[0]?.policy
              });
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(newProj));
            } catch (err: unknown) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
            }
          });
          return;
        }
      }

      // 5. Assessments List & Trigger Run
      if (pathname === '/api/v1/assessments') {
        if (method === 'GET') {
          const assessments = await store.getAssessments();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(assessments));
          return;
        }
        if (method === 'POST') {
          const projects = await store.getProjects();
          const targetProject = projects[0];
          const projectPath = targetProject?.path || process.cwd();
          const policy = targetProject?.policy || (await store.getProjects())[0].policy;

          const assessmentOutput = await runAssessment({
            projectPath,
            policy
          });

          const assessmentRecord = {
            id: `asm-${Date.now().toString(36)}`,
            projectId: targetProject?.id || 'default-project',
            projectName: targetProject?.name || path.basename(projectPath),
            projectPath,
            timestamp: new Date().toISOString(),
            durationMs: assessmentOutput.durationMs,
            decision: assessmentOutput.decision,
            findings: assessmentOutput.findings,
            analyzerResults: assessmentOutput.results
          };

          await store.saveAssessment(assessmentRecord);

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(assessmentRecord));
          return;
        }
      }

      // 6. Latest Assessment
      if (pathname === '/api/v1/assessments/latest') {
        const assessments = await store.getAssessments();
        if (assessments.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No assessments available.' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(assessments[0]));
        return;
      }

      // 7. Assessment by ID & Export
      const assessmentMatch = pathname.match(/^\/api\/v1\/assessments\/([a-zA-Z0-9_-]+)(\/export)?$/);
      if (assessmentMatch) {
        const id = assessmentMatch[1];
        const isExport = Boolean(assessmentMatch[2]);
        const assessment = await store.getAssessment(id);

        if (!assessment) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Assessment '${id}' not found.` }));
          return;
        }

        if (isExport) {
          const format = url.searchParams.get('format') || 'json';
          if (format === 'sarif') {
            res.writeHead(200, {
              'Content-Type': 'application/sarif+json; charset=utf-8',
              'Content-Disposition': `attachment; filename="shipguard-${id}.sarif"`
            });
            res.end(formatSarifReport({ projectName: assessment.projectName, findings: assessment.findings }));
            return;
          }
          if (format === 'markdown') {
            res.writeHead(200, {
              'Content-Type': 'text/markdown; charset=utf-8',
              'Content-Disposition': `attachment; filename="shipguard-${id}.md"`
            });
            res.end(formatMarkdownReport(assessment));
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="shipguard-${id}.json"`
          });
          res.end(formatJsonReport(assessment));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(assessment));
        return;
      }

      // 8. Finding Status Update
      const findingMatch = pathname.match(/^\/api\/v1\/findings\/([a-zA-Z0-9_-]+)$/);
      if (findingMatch && method === 'PATCH') {
        const fingerprint = findingMatch[1];
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body || '{}');
            const status = data.status as FindingStatus;
            await store.updateFindingStatus(fingerprint, status, data.comment);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, fingerprint, status }));
          } catch (err: unknown) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
          }
        });
        return;
      }

      // 404 Fallback
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (err: unknown) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: err instanceof Error ? err.message : String(err) }));
    }
  });

  return server;
}
