import { AssessmentRecord } from '../types/index.js';

export function formatJsonReport(assessment: AssessmentRecord): string {
  return JSON.stringify(assessment, null, 2);
}
