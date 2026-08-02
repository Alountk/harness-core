import * as fs from "node:fs";
import * as path from "node:path";
import type { TestResult } from "../core/types";
import { DASHBOARD_CLIENT_SCRIPT } from "./dashboard-script";

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
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
          <div id="statAvgLatency" class="text-3xl font-bold text-sky-400 mt-2">0 ms</div>
        </div>
        <div class="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-lg">
          <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Fastest Model</span>
          <div id="statFastestModel" class="text-xl font-bold text-indigo-400 mt-2 truncate">-</div>
        </div>
      </section>

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
                <th class="py-3 px-4">Completion Tokens</th>
                <th class="py-3 px-4">Speed</th>
                <th class="py-3 px-4">Eval Score</th>
                <th class="py-3 px-4">Reason / Observation</th>
              </tr>
            </thead>
            <tbody id="resultsTableBody" class="divide-y divide-slate-700/50"></tbody>
          </table>
        </div>
      </section>

      <script id="benchmark-data" type="application/json">
        ${serializedData}
      </script>

      <script>
        ${DASHBOARD_CLIENT_SCRIPT}
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