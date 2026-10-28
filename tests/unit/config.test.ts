import { describe, it, expect } from 'vitest';
import { ShipguardConfigSchema } from '../../src/config/schema.js';

describe('Config Schema Validation', () => {
  it('validates a valid shipguard.config.json', () => {
    const config = {
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
      }
    };

    const res = ShipguardConfigSchema.safeParse(config);
    expect(res.success).toBe(true);
  });

  it('rejects category weights that do not sum to 100%', () => {
    const invalidConfig = {
      scoring: {
        security: 25,
        testing: 20,
        code_quality: 15,
        build: 15,
        dependencies: 10,
        cicd: 10,
        documentation: 10, // Sum = 105%
        hygiene: 0
      }
    };

    const res = ShipguardConfigSchema.safeParse(invalidConfig);
    expect(res.success).toBe(false);
  });
});
