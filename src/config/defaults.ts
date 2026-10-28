import { ProjectPolicy, AnalyzerCategory } from '../types/index.js';

export const DEFAULT_WEIGHTS: Record<AnalyzerCategory, number> = {
  security: 25,
  testing: 20,
  code_quality: 15,
  build: 15,
  dependencies: 10,
  cicd: 10,
  documentation: 5,
  hygiene: 0
};

export const DEFAULT_POLICY: ProjectPolicy = {
  profile: 'production',
  weights: { ...DEFAULT_WEIGHTS },
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
    '.git/**',
    '.shipguard/**'
  ]
};

export const PROFILES: Record<string, Partial<ProjectPolicy>> = {
  standard: {
    profile: 'standard',
    gates: {
      failOnCritical: true,
      failOnHigh: false,
      requireTests: false,
      requireBuild: false,
      requireSecurityScan: true,
      minimumScore: 70
    }
  },
  production: {
    profile: 'production',
    gates: {
      failOnCritical: true,
      failOnHigh: false,
      requireTests: true,
      requireBuild: true,
      requireSecurityScan: true,
      minimumScore: 80
    }
  },
  strict: {
    profile: 'strict',
    gates: {
      failOnCritical: true,
      failOnHigh: true,
      requireTests: true,
      requireBuild: true,
      requireSecurityScan: true,
      minimumScore: 90
    }
  },
  lax: {
    profile: 'lax',
    gates: {
      failOnCritical: false,
      failOnHigh: false,
      requireTests: false,
      requireBuild: false,
      requireSecurityScan: false,
      minimumScore: 50
    }
  }
};
