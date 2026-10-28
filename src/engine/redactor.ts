const SECRET_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  // AWS Access Key ID
  { regex: /\b(AKIA[0-9A-Z]{16})\b/g, replacement: 'AKIA****************' },
  // GitHub Personal Access Token / OAuth
  { regex: /\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b/g, replacement: 'ghp_********************************' },
  { regex: /\b(github_pat_[A-Za-z0-9_]{82})\b/g, replacement: 'github_pat_********************************' },
  // Slack Tokens
  { regex: /\b(xox[baprs]-[0-9A-Za-z_-]{10,})\b/g, replacement: 'xox*-[REDACTED]' },
  // Generic API / Secret Keys (e.g. sk-..., secret_...)
  { regex: /\b(sk-[A-Za-z0-9_-]{20,})\b/g, replacement: 'sk-********************' },
  // Database connection passwords in URIs: proto://user:password@host
  { regex: /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^:]+:)([^@/]+)(@)/g, replacement: '$1[REDACTED_PASSWORD]$3' },
  // Private key blocks
  { regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
  // High-entropy bearer tokens in headers
  { regex: /(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, replacement: '$1[REDACTED_BEARER_TOKEN]' }
];

export function redactSecrets(text: string): string {
  if (!text || typeof text !== 'string') return text;
  let result = text;
  for (const { regex, replacement } of SECRET_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

export function redactObject<T>(obj: T): T {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return redactSecrets(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = redactObject(v);
    }
    return out as T;
  }
  return obj;
}
