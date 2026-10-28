export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShipGuard — Software Release Readiness & Quality Checker</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text: #e5e7eb;
      --text-muted: #9ca3af;
      --heading: #f9fafb;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --info: #6366f1;
      --code-bg: #030712;
      --badge-critical: rgba(239, 68, 68, 0.2);
      --badge-high: rgba(249, 115, 22, 0.2);
      --badge-medium: rgba(245, 158, 11, 0.2);
      --badge-low: rgba(59, 130, 246, 0.2);
      --badge-info: rgba(99, 102, 241, 0.2);
    }

    [data-theme="light"] {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-border: #e2e8f0;
      --text: #334155;
      --text-muted: #64748b;
      --heading: #0f172a;
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --success: #059669;
      --warning: #d97706;
      --danger: #dc2626;
      --info: #4f46e5;
      --code-bg: #f1f5f9;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    body { background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; }

    header {
      background: var(--card-bg);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon { font-size: 28px; }
    .brand-title { font-size: 19px; font-weight: 700; color: var(--heading); letter-spacing: -0.02em; }
    .brand-tagline { font-size: 13px; color: var(--text-muted); }

    .header-actions { display: flex; align-items: center; gap: 12px; }

    button {
      background: var(--card-border);
      color: var(--heading);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    button:hover { background: #374151; color: #fff; }
    button.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
    button.primary:hover { background: var(--primary-hover); }

    main { max-width: 1360px; margin: 0 auto; width: 100%; padding: 24px 32px; flex: 1; }

    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--card-border); margin-bottom: 24px; }
    .tab {
      padding: 10px 18px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      transition: all 0.15s;
    }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }

    /* Decision Banner */
    .decision-banner {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 24px 32px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
    }

    .decision-main { flex: 1; }
    .decision-status-row { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; }
    .state-pill {
      font-size: 13px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .state-READY { background: rgba(16, 185, 129, 0.2); color: var(--success); border: 1px solid var(--success); }
    .state-READY_WITH_WARNINGS { background: rgba(245, 158, 11, 0.2); color: var(--warning); border: 1px solid var(--warning); }
    .state-BLOCKED { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid var(--danger); }
    .state-INCOMPLETE { background: rgba(156, 163, 175, 0.2); color: var(--text-muted); border: 1px solid var(--text-muted); }

    .decision-project { font-size: 18px; font-weight: 700; color: var(--heading); }
    .decision-summary { font-size: 14px; color: var(--text-muted); margin-top: 4px; }

    .score-circle {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: var(--code-bg);
      border: 3px solid var(--primary);
    }
    .score-value { font-size: 28px; font-weight: 800; color: var(--heading); }
    .score-label { font-size: 10px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }

    /* Grid Layout */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
    }

    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--heading);
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* Gates Checklist */
    .gate-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .gate-item:last-child { border-bottom: none; }
    .gate-icon { font-size: 16px; }
    .gate-title { font-size: 13px; font-weight: 600; color: var(--heading); }
    .gate-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    /* Category Cards */
    .cat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 16px;
    }
    .cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .cat-name { font-size: 13px; font-weight: 700; color: var(--heading); text-transform: capitalize; }
    .cat-score { font-size: 14px; font-weight: 800; color: var(--primary); }
    .progress-bar-bg { width: 100%; height: 6px; background: var(--code-bg); border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
    .progress-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; transition: width 0.3s; }
    .cat-meta { font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between; }

    /* Severity badges */
    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-CRITICAL { background: var(--badge-critical); color: var(--danger); }
    .badge-HIGH { background: var(--badge-high); color: #f97316; }
    .badge-MEDIUM { background: var(--badge-medium); color: var(--warning); }
    .badge-LOW { background: var(--badge-low); color: var(--primary); }
    .badge-INFO { background: var(--badge-info); color: var(--info); }

    /* Findings Table */
    .filter-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      align-items: center;
    }
    .filter-select, .search-input {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
    }
    .search-input { flex: 1; min-width: 200px; }

    .finding-row {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      transition: border-color 0.15s;
    }
    .finding-row:hover { border-color: #4b5563; }
    .finding-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .finding-title { font-size: 14px; font-weight: 700; color: var(--heading); }
    .finding-loc { font-size: 12px; color: var(--text-muted); font-family: monospace; }
    .finding-msg { font-size: 13px; color: var(--text); margin-bottom: 8px; }
    .finding-rem {
      background: var(--code-bg);
      border-left: 3px solid var(--primary);
      padding: 8px 12px;
      font-size: 12px;
      border-radius: 0 4px 4px 0;
      margin-bottom: 12px;
    }
    .finding-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .finding-actions button { font-size: 11px; padding: 4px 10px; }

    footer {
      border-top: 1px solid var(--card-border);
      padding: 16px 32px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">🛡️</div>
      <div>
        <div class="brand-title">ShipGuard</div>
        <div class="brand-tagline">Know your release is ready before you ship</div>
      </div>
    </div>
    <div class="header-actions">
      <button id="theme-toggle" onclick="toggleTheme()">☀️ / 🌙</button>
      <button onclick="exportReport('sarif')">Export SARIF</button>
      <button onclick="exportReport('json')">Export JSON</button>
      <button onclick="exportReport('markdown')">Export Markdown</button>
      <button class="primary" onclick="runNewScan()">⚡ Run Assessment</button>
    </div>
  </header>

  <main>
    <div class="tabs">
      <div class="tab active" onclick="switchTab('overview')">Release Overview</div>
      <div class="tab" onclick="switchTab('findings')">Findings Explorer (<span id="findings-count">0</span>)</div>
      <div class="tab" onclick="switchTab('history')">Assessment History</div>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview">
      <div class="decision-banner">
        <div class="decision-main">
          <div class="decision-status-row">
            <span id="decision-state" class="state-pill state-READY">READY</span>
            <span id="decision-project" class="decision-project">Loading project...</span>
          </div>
          <div id="decision-summary" class="decision-summary">Evaluating quality gates and analyzer telemetry...</div>
        </div>
        <div class="score-circle">
          <div id="decision-score" class="score-value">--</div>
          <div class="score-label">Score</div>
        </div>
      </div>

      <div class="grid-2">
        <!-- Release Gates -->
        <div class="card">
          <div class="card-title">
            <span>Mandatory Release Gates</span>
            <span id="gates-status-badge" style="font-size:12px; color:var(--text-muted)">Evaluated</span>
          </div>
          <div id="gates-list">
            <div style="color:var(--text-muted); font-size:13px;">Checking release gates...</div>
          </div>
        </div>

        <!-- Severity Distribution -->
        <div class="card">
          <div class="card-title">Findings by Severity</div>
          <div style="display:flex; gap:16px; margin-top:20px; justify-content:space-around; text-align:center;">
            <div>
              <div id="sev-critical" style="font-size:24px; font-weight:800; color:var(--danger)">0</div>
              <div class="badge badge-CRITICAL" style="margin-top:6px;">Critical</div>
            </div>
            <div>
              <div id="sev-high" style="font-size:24px; font-weight:800; color:#f97316">0</div>
              <div class="badge badge-HIGH" style="margin-top:6px;">High</div>
            </div>
            <div>
              <div id="sev-medium" style="font-size:24px; font-weight:800; color:var(--warning)">0</div>
              <div class="badge badge-MEDIUM" style="margin-top:6px;">Medium</div>
            </div>
            <div>
              <div id="sev-low" style="font-size:24px; font-weight:800; color:var(--primary)">0</div>
              <div class="badge badge-LOW" style="margin-top:6px;">Low</div>
            </div>
            <div>
              <div id="sev-info" style="font-size:24px; font-weight:800; color:var(--info)">0</div>
              <div class="badge badge-INFO" style="margin-top:6px;">Info</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card-title" style="margin-bottom:12px;">Category Readiness Breakdown</div>
      <div id="categories-grid" class="grid-3">
        <!-- Dynamic Category Cards -->
      </div>
    </div>

    <!-- TAB 2: FINDINGS EXPLORER -->
    <div id="tab-findings" style="display:none;">
      <div class="filter-bar">
        <input type="text" id="search-box" class="search-input" placeholder="Search findings by rule, title, or file..." oninput="filterFindings()">
        <select id="severity-filter" class="filter-select" onchange="filterFindings()">
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="INFO">Info</option>
        </select>
        <select id="category-filter" class="filter-select" onchange="filterFindings()">
          <option value="ALL">All Categories</option>
          <option value="security">Security</option>
          <option value="testing">Testing</option>
          <option value="code_quality">Code Quality</option>
          <option value="build">Build</option>
          <option value="dependencies">Dependencies</option>
          <option value="cicd">CI/CD</option>
          <option value="documentation">Documentation</option>
          <option value="hygiene">Hygiene</option>
        </select>
        <select id="status-filter" class="filter-select" onchange="filterFindings()">
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="ACCEPTED_RISK">Accepted Risk</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div id="findings-container">
        <!-- Dynamic Findings -->
      </div>
    </div>

    <!-- TAB 3: HISTORY -->
    <div id="tab-history" style="display:none;">
      <div class="card">
        <div class="card-title">Assessment Runs History</div>
        <div id="history-container">
          <div style="color:var(--text-muted); font-size:13px;">Loading assessment history...</div>
        </div>
      </div>
    </div>
  </main>

  <footer>
    ShipGuard v1.0.0 &bull; Open-Source Release Readiness Checker &bull; <a href="https://github.com/0xyz-exe/shipguard" target="_blank" style="color:var(--primary); text-decoration:none;">GitHub Repository</a>
  </footer>

  <script>
    let currentAssessment = null;
    let allFindings = [];

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('[id^="tab-"]').forEach(d => d.style.display = 'none');

      document.getElementById('tab-' + tabId).style.display = 'block';
      event.target.classList.add('active');
    }

    async function loadLatestAssessment() {
      try {
        const res = await fetch('/api/v1/assessments/latest');
        if (!res.ok) throw new Error('No assessment found');
        currentAssessment = await res.json();
        renderDashboard(currentAssessment);
      } catch (err) {
        console.warn('Auto-running initial assessment...');
        await runNewScan();
      }
    }

    async function runNewScan() {
      try {
        const btn = document.querySelector('.primary');
        if (btn) btn.innerText = '⏳ Scanning...';
        const res = await fetch('/api/v1/assessments', { method: 'POST' });
        currentAssessment = await res.json();
        renderDashboard(currentAssessment);
        if (btn) btn.innerText = '⚡ Run Assessment';
      } catch (err) {
        alert('Failed to execute assessment: ' + err.message);
      }
    }

    function renderDashboard(data) {
      const decision = data.decision;
      allFindings = data.findings || [];

      // Decision Banner
      const stateEl = document.getElementById('decision-state');
      stateEl.className = 'state-pill state-' + decision.state;
      stateEl.innerText = decision.state.replace(/_/g, ' ');

      document.getElementById('decision-project').innerText = data.projectName;
      document.getElementById('decision-summary').innerText = decision.summary;
      document.getElementById('decision-score').innerText = Math.round(decision.score);
      document.getElementById('findings-count').innerText = allFindings.length;

      // Severity Distribution
      document.getElementById('sev-critical').innerText = decision.countsBySeverity.CRITICAL || 0;
      document.getElementById('sev-high').innerText = decision.countsBySeverity.HIGH || 0;
      document.getElementById('sev-medium').innerText = decision.countsBySeverity.MEDIUM || 0;
      document.getElementById('sev-low').innerText = decision.countsBySeverity.LOW || 0;
      document.getElementById('sev-info').innerText = decision.countsBySeverity.INFO || 0;

      // Gates Checklist
      const gatesContainer = document.getElementById('gates-list');
      gatesContainer.innerHTML = decision.gates.map(g => \`
        <div class="gate-item">
          <div class="gate-icon">\${g.passed ? '✅' : '❌'}</div>
          <div>
            <div class="gate-title">\${g.title} \${g.mandatory ? '<span style="color:var(--danger);font-size:11px;">[Mandatory]</span>' : ''}</div>
            <div class="gate-desc">\${g.reason}</div>
          </div>
        </div>
      \`).join('');

      // Categories Breakdown
      const catContainer = document.getElementById('categories-grid');
      catContainer.innerHTML = Object.entries(decision.categoryScores).map(([cat, cs]) => \`
        <div class="cat-card">
          <div class="cat-header">
            <span class="cat-name">\${cat.replace(/_/g, ' ')}</span>
            <span class="cat-score">\${cs.score}/100</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: \${cs.score}%;"></div>
          </div>
          <div class="cat-meta">
            <span>Weight: \${cs.weight}%</span>
            <span>Checks: \${cs.checksPassed}/\${cs.checksTotal} passed</span>
          </div>
        </div>
      \`).join('');

      filterFindings();
      loadHistory();
    }

    function filterFindings() {
      const q = document.getElementById('search-box').value.toLowerCase();
      const sev = document.getElementById('severity-filter').value;
      const cat = document.getElementById('category-filter').value;
      const stat = document.getElementById('status-filter').value;

      const filtered = allFindings.filter(f => {
        if (sev !== 'ALL' && f.severity !== sev) return false;
        if (cat !== 'ALL' && f.category !== cat) return false;
        if (stat !== 'ALL' && f.status !== stat) return false;
        if (q) {
          const match = f.title.toLowerCase().includes(q) ||
                        f.message.toLowerCase().includes(q) ||
                        (f.file && f.file.toLowerCase().includes(q)) ||
                        f.ruleId.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });

      const container = document.getElementById('findings-container');
      if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No matching findings.</div>';
        return;
      }

      container.innerHTML = filtered.map(f => \`
        <div class="finding-row">
          <div class="finding-header">
            <div>
              <span class="badge badge-\${f.severity}">\${f.severity}</span>
              <strong style="margin-left:8px; color:var(--heading);">\${f.title}</strong>
              <span style="font-size:12px; color:var(--text-muted); margin-left:8px;">[\${f.ruleId}]</span>
            </div>
            <div class="finding-loc">\${f.file ? f.file + (f.line ? ':' + f.line : '') : 'Global'}</div>
          </div>
          <div class="finding-msg">\${f.message}</div>
          \${f.remediation ? '<div class="finding-rem"><strong>Fix:</strong> ' + f.remediation + '</div>' : ''}
          <div class="finding-actions">
            <span style="margin-right:auto; font-size:12px; color:var(--text-muted); align-self:center;">Status: <strong>\${f.status}</strong></span>
            \${f.status === 'OPEN' ? \`
              <button onclick="updateFindingStatus('\${f.fingerprint}', 'ACKNOWLEDGED')">Acknowledge</button>
              <button onclick="updateFindingStatus('\${f.fingerprint}', 'ACCEPTED_RISK')">Accept Risk</button>
              <button onclick="updateFindingStatus('\${f.fingerprint}', 'RESOLVED')">Resolve</button>
            \` : \`
              <button onclick="updateFindingStatus('\${f.fingerprint}', 'OPEN')">Reopen</button>
            \`}
          </div>
        </div>
      \`).join('');
    }

    async function updateFindingStatus(fingerprint, status) {
      await fetch('/api/v1/findings/' + fingerprint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      // Update local state
      const target = allFindings.find(f => f.fingerprint === fingerprint);
      if (target) target.status = status;
      filterFindings();
    }

    async function loadHistory() {
      try {
        const res = await fetch('/api/v1/assessments');
        const list = await res.json();
        const container = document.getElementById('history-container');
        if (!list || list.length === 0) {
          container.innerHTML = '<div style="color:var(--text-muted);">No history recorded yet.</div>';
          return;
        }

        container.innerHTML = list.map(item => \`
          <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--card-border);">
            <div>
              <strong style="color:var(--heading);">\${new Date(item.timestamp).toLocaleString()}</strong>
              <div style="font-size:12px; color:var(--text-muted);">Duration: \${(item.durationMs / 1000).toFixed(2)}s &bull; Findings: \${item.findings.length}</div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="state-pill state-\${item.decision.state}">\${item.decision.state}</span>
              <span style="font-size:16px; font-weight:800; color:var(--primary);">\${Math.round(item.decision.score)}/100</span>
            </div>
          </div>
        \`).join('');
      } catch (err) {
        // ignore
      }
    }

    function exportReport(format) {
      if (!currentAssessment) return alert('No assessment loaded yet.');
      window.open('/api/v1/assessments/' + currentAssessment.id + '/export?format=' + format, '_blank');
    }

    loadLatestAssessment();
  </script>
</body>
</html>`;
}
