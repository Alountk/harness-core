import * as fs from "node:fs";
import * as path from "node:path";
import type { TestResult } from "../core/types";
import { MarkdownReporter } from "./markdown";

export interface HistoricalReportData {
  timestamp: string;
  suiteTitle: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    totalDurationMs: number;
  };
  results: TestResult[];
}

export interface TestDelta {
  id: string;
  name: string;
  statusChanged: boolean;
  previousStatus?: string;
  currentStatus: string;
  durationDeltaMs: number;
}

export interface ComparisonDelta {
  previousTimestamp: string;
  durationDeltaMs: number;
  passRateDeltaPercentage: number;
  testDeltas: Array<TestDelta>;
}

export class FileReporter {
  private static reportsDir = path.join(process.cwd(), "reports");

  private static ensureReportsDir(): void {
    if (!fs.existsSync(FileReporter.reportsDir)) {
      fs.mkdirSync(FileReporter.reportsDir, { recursive: true });
    }
  }

  public static getLatestReport(): HistoricalReportData | null {
    FileReporter.ensureReportsDir();
    const files = fs
      .readdirSync(FileReporter.reportsDir)
      .filter((file) => file.startsWith("eval-") && file.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      return null;
    }

    try {
      const latestPath = path.join(FileReporter.reportsDir, files[0]);
      const content = fs.readFileSync(latestPath, "utf-8");
      return JSON.parse(content) as HistoricalReportData;
    } catch (error) {
      return null;
    }
  }

  public static saveReport(
    results: TestResult[],
    suiteTitle: string = "AI Evaluation Report",
  ): {
    jsonPath: string;
    mdPath: string;
    reportData: HistoricalReportData;
  } {
    FileReporter.ensureReportsDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const total = results.length;
    const passed = results.filter((r) => r.status === "PASSED").length;
    const failed = total - passed;
    const totalDurationMs = results.reduce((acc, r) => acc + r.durationMs, 0);
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    const reportData: HistoricalReportData = {
      timestamp,
      suiteTitle,
      summary: {
        total,
        passed,
        failed,
        passRate,
        totalDurationMs,
      },
      results,
    };

    const jsonFilename = `eval-${timestamp}.json`;
    const mdFilename = `eval-${timestamp}.md`;

    const jsonPath = path.join(FileReporter.reportsDir, jsonFilename);
    const mdPath = path.join(FileReporter.reportsDir, mdFilename);

    fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2), "utf-8");

    const markdownContent = MarkdownReporter.generateReport(
      results,
      suiteTitle,
    );
    fs.writeFileSync(mdPath, markdownContent, "utf-8");

    return { jsonPath, mdPath, reportData };
  }

  public static compareWithPrevious(
    currentResults: TestResult[],
    previousReport: HistoricalReportData | null,
  ): ComparisonDelta | null {
    if (!previousReport) return null;

    const currentTotalDuration = currentResults.reduce(
      (acc, r) => acc + r.durationMs,
      0,
    );
    const currentPassed = currentResults.filter(
      (r) => r.status === "PASSED",
    ).length;
    const currentPassRate =
      currentResults.length > 0
        ? (currentPassed / currentResults.length) * 100
        : 0;

    const previousPassRate = previousReport.summary.passRate;
    const durationDeltaMs =
      currentTotalDuration - previousReport.summary.totalDurationMs;
    const passRateDeltaPercentage = currentPassRate - previousPassRate;

    const previousMap = new Map(
      previousReport.results.map((r) => [r.testId, r])
    );

    const testDeltas = currentResults.map((curr) => {
      const prev = previousMap.get(curr.testId);
      return {
        id: curr.testId,
        name: curr.attempts ? `${curr.testId} (Attempt ${curr.attempts})` : curr.testId,
        statusChanged: prev ? prev.status !== curr.status : false,
        previousStatus: prev?.status,
        currentStatus: curr.status,
        durationDeltaMs: prev ? curr.durationMs - prev.durationMs : 0,
      };
    });
    
    return {
      previousTimestamp: previousReport.timestamp,
      durationDeltaMs,
      passRateDeltaPercentage,
      testDeltas,
    };
  }
  public static printTrendSummary(delta: ComparisonDelta): void {
    console.log(
      "\n📈 ================ TREND & HISTORICAL COMPARISON ================",
    );
    console.log(`Comparing against execution: ${delta.previousTimestamp}`);

    const durationSign = delta.durationDeltaMs >= 0 ? "+" : "";
    const durationColor = delta.durationDeltaMs <= 0 ? "\x1b[32m" : "\x1b[33m"; // Green when it is faster
    console.log(
      `⏱️ Total Latency Delta: ${durationColor}${durationSign}${delta.durationDeltaMs} ms\x1b[0m`,
    );

    const passRateSign = delta.passRateDeltaPercentage >= 0 ? "+" : "";
    const passRateColor =
      delta.passRateDeltaPercentage >= 0 ? "\x1b[32m" : "\x1b[31m";
    console.log(
      `🎯 Pass Rate Delta: ${passRateColor}${passRateSign}${delta.passRateDeltaPercentage.toFixed(
        1,
      )}%\x1b[0m`,
    );

    console.log("\nDetails by Test Case:");
    for (const d of delta.testDeltas) {
      const dSign = d.durationDeltaMs >= 0 ? "+" : "";
      const deltaText = `${dSign}${d.durationDeltaMs}ms`;
      const statusText = d.statusChanged
        ? `[CHANGED: ${d.previousStatus} ➡️ ${d.currentStatus}]`
        : `[UNCHANGED: ${d.currentStatus}]`;

      console.log(` - [${d.id}] ${d.name}: ${deltaText} ${statusText}`);
    }
    console.log(
      "=================================================================\n",
    );
  }
}
