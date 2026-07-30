import * as fs from "node:fs";
import * as path from "node:path";
import type { TestResult } from "../core/types";

export class HtmlReporter {
  private static reportsDir = path.join(process.cwd(), "reports");

  private static ensureReportsDir(): void {
    if (!fs.existsSync(HtmlReporter.reportsDir)) {
      fs.mkdirSync(HtmlReporter.reportsDir, { recursive: true });
    }
  }

  public static generateHtml(results: TestResult[], title = "AI Benchmark Dashboard"): string {
    const serializedData = JSON.stringify(results);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { background-color: #0f172a; color: #f8fafc; font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body class="p-6 md:p-10 max-w-7xl mx-auto min-h-screen">
  <header class="mb-8 border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 class="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
        ⚡ <span>${title}</span>
      </h1>
      <p class="text-slate-400 text-sm mt-1">AI Evaluation Harness Engine &mdash; Visual Benchmark Report</p>
    </div>
    <div class="text-xs bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 text-slate-300">
      Generated: <span id="genDate" class="font-mono text-emerald-400"></span>
    </div>
  </header>

  <!-- Metrics summary cards -->
  <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg">
      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Tests</span>
      <div id="statTotal" class="text-3xl font-bold text-white mt-2">0</div>
    </div>
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg">
      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
      <div id="statPassRate" class="text-3xl font-bold text-emerald-400 mt-2">0%</div>
    </div>
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg">
      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Latency</span>
      <div id="statAvgLatency" class="text-3xl font-bold text-sky-400 mt-2">0 ms</div>
    </div>
    <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg">
      <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Fastest Model</span>
      <div id="statFastestModel" class="text-xl font-bold text-indigo-400 mt-2 truncate">-</div>
    </div>
  </section>

  <!-- Charts section -->
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
    <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl">
      <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span>⏱️</span> Latency Comparison by Model (ms)
      </h2>
      <div class="relative h-72">
        <canvas id="latencyChart"></canvas>
      </div>
    </div>

    <div class="bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl">
      <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span>🎯</span> Average Eval Score by Model (%)
      </h2>
      <div class="relative h-72">
        <canvas id="scoreChart"></canvas>
      </div>
    </div>
  </section>

  <!-- Detailed results table -->
  <section class="bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl mb-10">
    <h2 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <span>📋</span> Execution Details by Test Case
    </h2>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm text-slate-300">
        <thead class="bg-slate-900/80 text-xs uppercase text-slate-400 border-b border-slate-700">
          <tr>
            <th class="py-3 px-4">Test ID</th>
            <th class="py-3 px-4">Status</th>
            <th class="py-3 px-4">Duration</th>
            <th class="py-3 px-4">Attempts</th>
            <th class="py-3 px-4">Eval Score</th>
            <th class="py-3 px-4">Reason / Note</th>
          </tr>
        </thead>
        <tbody id="resultsTableBody" class="divide-y divide-slate-700/50">
          <!-- Populated by JavaScript -->
        </tbody>
      </table>
    </div>
  </section>

  <script>
    const rawData = ${serializedData};
    document.getElementById('genDate').innerText = new Date().toLocaleString();

    const total = rawData.length;
    const passed = rawData.filter(r => r.status === 'PASSED').length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
    const totalDuration = rawData.reduce((acc, r) => acc + r.durationMs, 0);
    const avgLatency = total > 0 ? Math.round(totalDuration / total) : 0;

    document.getElementById('statTotal').innerText = total;
    document.getElementById('statPassRate').innerText = passRate + '%';
    document.getElementById('statAvgLatency').innerText = avgLatency.toLocaleString() + ' ms';

    const modelStats = {};
    const testCasesSet = new Set();

    rawData.forEach(r => {
      const match = r.testId.match(/\\[(.*)\\]/);
      const modelName = match ? match[1] : 'Unknown';
      const baseTestId = r.testId.split(' ')[0];

      testCasesSet.add(baseTestId);

      if (!modelStats[modelName]) {
        modelStats[modelName] = { totalMs: 0, count: 0, scores: [], tests: {} };
      }
      modelStats[modelName].totalMs += r.durationMs;
      modelStats[modelName].count += 1;

      const scoreVal = r.evalResult?.score !== undefined ? r.evalResult.score * 100 : (r.status === 'PASSED' ? 100 : 0);
      modelStats[modelName].scores.push(scoreVal);
      modelStats[modelName].tests[baseTestId] = { durationMs: r.durationMs, score: scoreVal, status: r.status };
    });

    let fastestModel = '-';
    let minAvgLatency = Infinity;
    Object.keys(modelStats).forEach(m => {
      const avg = modelStats[m].totalMs / modelStats[m].count;
      if (avg < minAvgLatency) {
        minAvgLatency = avg;
        fastestModel = m;
      }
    });
    document.getElementById('statFastestModel').innerText = fastestModel;

    const modelsList = Object.keys(modelStats);
    const testCasesList = Array.from(testCasesSet);

    const colors = ['#38bdf8', '#818cf8', '#34d399', '#f43f5e', '#fbbf24'];
    const datasetsLatency = modelsList.map((model, idx) => ({
      label: model,
      data: testCasesList.map(t => modelStats[model].tests[t]?.durationMs || 0),
      backgroundColor: colors[idx % colors.length],
      borderRadius: 6
    }));

    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: { labels: testCasesList, datasets: datasetsLatency },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' }, title: { display: true, text: 'ms', color: '#94a3b8' } }
        }
      }
    });

    const avgScores = modelsList.map(m => {
      const arr = modelStats[m].scores;
      return arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
    });

    new Chart(document.getElementById('scoreChart'), {
      type: 'bar',
      data: {
        labels: modelsList,
        datasets: [{
          label: 'Score Promedio (%)',
          data: avgScores,
          backgroundColor: '#34d399',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
          y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
        }
      }
    });

    const tbody = document.getElementById('resultsTableBody');
    rawData.forEach(res => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-700/30 transition-colors';

      const statusBadge = res.status === 'PASSED'
        ? '<span class="px-2 py-1 text-xs font-semibold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>'
        : res.status === 'TIMEOUT'
        ? '<span class="px-2 py-1 text-xs font-semibold rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">TIMEOUT</span>'
        : '<span class="px-2 py-1 text-xs font-semibold rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">FAILED</span>';

      const scoreText = res.evalResult?.score !== undefined ? (res.evalResult.score * 100).toFixed(0) + '%' : 'N/A';
      const reason = res.evalResult?.reason || res.error?.message || '-';

      tr.innerHTML = [
        '<td class="py-3 px-4 font-mono text-xs text-slate-200">' + res.testId + '</td>',
        '<td class="py-3 px-4">' + statusBadge + '</td>',
        '<td class="py-3 px-4 font-mono text-xs text-sky-400">' + res.durationMs + ' ms</td>',
        '<td class="py-3 px-4 text-center text-xs">' + res.attempts + '</td>',
        '<td class="py-3 px-4 font-semibold text-xs text-emerald-400">' + scoreText + '</td>',
        '<td class="py-3 px-4 text-xs text-slate-400 max-w-xs truncate" title="' + reason + '">' + reason + '</td>',
      ].join('');
      tbody.appendChild(tr);
    });
  </script>
</body>
</html>`;
  }

  public static saveDashboard(results: TestResult[], title = "AI Benchmark Dashboard"): string {
    HtmlReporter.ensureReportsDir();
    const htmlContent = HtmlReporter.generateHtml(results, title);
    const latestPath = path.join(HtmlReporter.reportsDir, "dashboard.html");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const versionedPath = path.join(HtmlReporter.reportsDir, `dashboard-${timestamp}.html`);

    fs.writeFileSync(latestPath, htmlContent, "utf-8");
    fs.writeFileSync(versionedPath, htmlContent, "utf-8");

    return latestPath;
  }
}