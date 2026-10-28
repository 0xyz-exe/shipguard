import { describe, it, expect } from 'vitest';
import { redactSecrets, redactObject } from '../../src/engine/redactor.js';

describe('Secret Redactor', () => {
  it('redacts AWS Access Key IDs', () => {
    const input = 'My key is AKIA1234567890ABCDEF in production.';
    const output = redactSecrets(input);
    expect(output).toBe('My key is AKIA**************** in production.');
  });

  it('redacts GitHub Personal Access Tokens', () => {
    const input = 'Token: ghp_1234567890abcdefghijklmnopqrstuvwxyz1234';
    const output = redactSecrets(input);
    expect(output).toContain('ghp_********************************');
  });

  it('redacts database credentials in URLs', () => {
    const input = 'postgres://admin:super_secret_password123@db.internal:5432/prod';
    const output = redactSecrets(input);
    expect(output).toBe('postgres://admin:[REDACTED_PASSWORD]@db.internal:5432/prod');
  });

  it('redacts deep nested objects and arrays', () => {
    const data = {
      user: 'alice',
      credentials: {
        token: 'sk-1234567890abcdef1234567890abcdef',
        meta: ['Bearer eyJhbGciOi...secret']
      }
    };
    const redacted = redactObject(data);
    expect(redacted.credentials.token).toContain('sk-********************');
  });
});
