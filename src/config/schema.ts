import { z } from 'zod';

export const CategoryWeightsSchema = z.object({
  security: z.number().min(0).max(100).default(25),
  testing: z.number().min(0).max(100).default(20),
  code_quality: z.number().min(0).max(100).default(15),
  build: z.number().min(0).max(100).default(15),
  dependencies: z.number().min(0).max(100).default(10),
  cicd: z.number().min(0).max(100).default(10),
  documentation: z.number().min(0).max(100).default(5),
  hygiene: z.number().min(0).max(100).default(0)
}).refine((weights) => {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 100) <= 0.01;
}, {
  message: 'Category weights must sum to exactly 100%'
});

export const GatesConfigSchema = z.object({
  failOnCritical: z.boolean().default(true),
  failOnHigh: z.boolean().default(false),
  requireTests: z.boolean().default(true),
  requireBuild: z.boolean().default(true),
  requireSecurityScan: z.boolean().default(true),
  minimumScore: z.number().min(0).max(100).default(80)
});

export const CoverageConfigSchema = z.object({
  enabled: z.boolean().default(true),
  minimumPercentage: z.number().min(0).max(100).default(70)
});

export const ShipguardConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.number().default(1),
  profile: z.enum(['standard', 'production', 'strict', 'lax']).default('production'),
  scoring: CategoryWeightsSchema.optional(),
  gates: GatesConfigSchema.optional(),
  coverage: CoverageConfigSchema.optional(),
  exclusions: z.array(z.string()).default([
    'node_modules/**',
    'dist/**',
    'coverage/**',
    '.git/**',
    '.shipguard/**'
  ])
});

export type ShipguardConfig = z.infer<typeof ShipguardConfigSchema>;
