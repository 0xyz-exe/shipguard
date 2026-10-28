import { AssessmentRecord } from '../types/index.js';

export function formatTerminalReport(assessment: AssessmentRecord): string {
  const { decision, findings, durationMs } = assessment;

  const cyan = '\x1b[36m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const red = '\x1b[31m';
  const gray = '\x1b[90m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';

  let stateColor = green;
  if (decision.state === 'BLOCKED') stateColor = red;
  if (decision.state === 'READY_WITH_WARNINGS') stateColor = yellow;
  if (decision.state === 'INCOMPLETE') stateColor = gray;

  let out = '\n';
  out += `${bold}${cyan}🛡️  ShipGuard — Software Release Readiness Assessment${reset}\n`;
  out += `${gray}═══════════════════════════════════════════════════════════════${reset}\n`;
  out += `Project:     ${bold}${assessment.projectName}${reset}\n`;
  out += `Status:      ${stateColor}${bold}${decision.state}${reset}\n`;
  out += `Score:       ${bold}${decision.score}/100${reset}\n`;
  out += `Duration:    ${(durationMs / 1000).toFixed(2)}s\n`;
  out += `Summary:     ${decision.summary}\n\n`;

  out += `${bold}Quality Gates:${reset}\n`;
  for (const gate of decision.gates) {
    const icon = gate.passed ? `${green}✔${reset}` : `${red}✘${reset}`;
    const req = gate.mandatory ? `${bold}[Mandatory]${reset}` : `${gray}[Optional]${reset}`;
    out += `  ${icon} ${req} ${gate.title}\n`;
    if (!gate.passed) {
      out += `     ${red}└─ ${gate.reason}${reset}\n`;
    }
  }

  out += `\n${bold}Category Breakdown:${reset}\n`;
  for (const [cat, cs] of Object.entries(decision.categoryScores)) {
    let catColor = green;
    if (cs.status === 'failed') catColor = red;
    if (cs.status === 'warning') catColor = yellow;
    if (cs.status === 'skipped') catColor = gray;

    const padName = cat.replace(/_/g, ' ').padEnd(16);
    const scoreStr = `${cs.score}`.padStart(3);
    const weightStr = `${cs.weight}%`.padStart(4);
    out += `  ${catColor}${padName}${reset} ${bold}${scoreStr}/100${reset} (weight: ${weightStr}) [${cs.checksPassed}/${cs.checksTotal} passed]\n`;
  }

  out += `\n${bold}Findings (${findings.length}):${reset}\n`;
  if (findings.length === 0) {
    out += `  ${green}✔ No release blockers or security findings identified.${reset}\n`;
  } else {
    for (const f of findings.slice(0, 10)) {
      let sevColor = gray;
      if (f.severity === 'CRITICAL') sevColor = red;
      if (f.severity === 'HIGH') sevColor = red;
      if (f.severity === 'MEDIUM') sevColor = yellow;

      const loc = f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : '';
      out += `  ${sevColor}[${f.severity}]${reset} ${bold}${f.title}${reset}${gray}${loc}${reset}\n`;
      out += `     ${f.message}\n`;
    }
    if (findings.length > 10) {
      out += `  ${gray}... and ${findings.length - 10} more finding(s). View full report in UI or JSON.${reset}\n`;
    }
  }

  out += `\n${gray}═══════════════════════════════════════════════════════════════${reset}\n`;
  return out;
}
