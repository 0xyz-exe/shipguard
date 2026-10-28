import { createHash } from 'node:crypto';

export function computeFindingFingerprint(params: {
  analyzerId: string;
  ruleId: string;
  file?: string;
  line?: number;
  title: string;
}): string {
  const normFile = (params.file || '').replace(/\\/g, '/').toLowerCase();
  const normLine = params.line || 0;
  const raw = `${params.analyzerId}:${params.ruleId}:${normFile}:${normLine}:${params.title}`;
  return createHash('sha256').update(raw).digest('hex').substring(0, 16);
}
