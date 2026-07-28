import type { TestResult } from "../core/types";

export class MarkdownReporter {
  /**
   * Generates a Markdown-formatted report ideal for PRs or documentation
   */
  static generateReport(results: TestResult[], suiteName = "Harness Evaluation Suite"): string {
    const passed = results.filter((r) => r.status === "PASSED").length;
    const failed = results.filter((r) => r.status === "FAILED" || r.status === "TIMEOUT").length;
    const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

    let md = `# 📊 ${suiteName}\n\n`;
    md += `| Metric | Value |\n`;
    md += `| :--- | :--- |\n`;
    md += `| **Total Tests** | ${results.length} |\n`;
    md += `| **Passed** | ✅ ${passed} |\n`;
    md += `| **Failed/Timeout** | ❌ ${failed} |\n`;
    md += `| **Total Duration** | ${totalDuration} ms |\n\n`;

    md += `### 📝 Test Details\n\n`;
    md += `| Test ID | Status | Duration | Attempts | Eval Score | Reason / Error |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;

    for (const res of results) {
      const statusIcon = res.status === "PASSED" ? "✅ PASSED" : res.status === "TIMEOUT" ? "⏱️ TIMEOUT" : "❌ FAILED";
      const score = res.evalResult?.score !== undefined ? `${res.evalResult.score * 100}%` : "N/A";
      const errorMsg = res.evalResult?.reason || res.error?.message || "-";

      md += `| \`${res.testId}\` | ${statusIcon} | ${res.durationMs}ms | ${res.attempts} | ${score} | ${errorMsg} |\n`;
    }

    return md;
  }
}