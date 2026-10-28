export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type FindingStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ACCEPTED_RISK';

export type ReleaseState = 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED' | 'INCOMPLETE';

export type AnalyzerCategory =
  | 'security'
  | 'testing'
  | 'code_quality'
  | 'build'
  | 'dependencies'
  | 'cicd'
  | 'documentation'
  | 'hygiene';

export interface Finding {
  id: string;
  fingerprint: string;
  projectId?: string;
  assessmentId?: string;
  analyzerId: string;
  category: AnalyzerCategory;
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  status: FindingStatus;
  remediation?: string;
  firstSeen?: string;
  lastSeen?: string;
  details?: Record<string, unknown>;
}

export interface CategoryScore {
  category: AnalyzerCategory;
  score: number; // 0 to 100
  weight: number; // percentage weight, e.g. 25
  findingsCount: Record<FindingSeverity, number>;
  checksTotal: number;
  checksPassed: number;
  status: 'passed' | 'warning' | 'failed' | 'skipped';
}

export interface GateResult {
  gateId: string;
  title: string;
  passed: boolean;
  mandatory: boolean;
  reason: string;
}

export interface ReleaseDecision {
  state: ReleaseState;
  score: number; // 0 to 100 overall weighted score
  summary: string;
  gates: GateResult[];
  categoryScores: Record<AnalyzerCategory, CategoryScore>;
  totalFindings: number;
  countsBySeverity: Record<FindingSeverity, number>;
}

export interface AnalyzerContext {
  projectPath: string;
  options: Record<string, unknown>;
}

export interface AnalyzerResult {
  analyzerId: string;
  category: AnalyzerCategory;
  status: 'passed' | 'warning' | 'failed' | 'skipped' | 'error';
  summary: string;
  durationMs: number;
  findings: Finding[];
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface IAnalyzer {
  readonly id: string;
  readonly name: string;
  readonly category: AnalyzerCategory;
  readonly version: string;
  readonly description: string;
  isAvailable(ctx: AnalyzerContext): Promise<boolean>;
  run(ctx: AnalyzerContext): Promise<AnalyzerResult>;
}

export interface ProjectPolicy {
  profile: 'standard' | 'production' | 'strict' | 'lax';
  weights: Record<AnalyzerCategory, number>;
  gates: {
    failOnCritical: boolean;
    failOnHigh: boolean;
    requireTests: boolean;
    requireBuild: boolean;
    requireSecurityScan: boolean;
    minimumScore: number;
  };
  coverage: {
    enabled: boolean;
    minimumPercentage: number;
  };
  exclusions: string[];
}

export interface AssessmentRecord {
  id: string;
  projectId: string;
  projectName: string;
  projectPath: string;
  timestamp: string;
  gitCommit?: string;
  gitBranch?: string;
  durationMs: number;
  decision: ReleaseDecision;
  findings: Finding[];
  analyzerResults: AnalyzerResult[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string;
  path: string;
  createdAt: string;
  lastAssessmentAt?: string;
  policy: ProjectPolicy;
}
