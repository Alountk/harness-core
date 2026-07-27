// src/reporters/console.ts
import type { TestResult } from "../core/types";

export class ConsoleReporter {
  static printSummary(results: TestResult[]): void {
    console.log(
      "\n================ 📊 HARNESS RESULTS SUMMARY ================",
    );

    let passed = 0;
    let failed = 0;

    results.forEach((res) => {
      const icon = res.status === "PASSED" ? "✅" : "❌";
      console.log(
        `${icon} [${res.testId}] Status: ${res.status} | Duration: ${res.durationMs}ms`,
      );

      if (res.error) {
        console.error(`   └─ Error: ${res.error.message}`);
      }

      if (res.status === "PASSED") passed++;
      else failed++;

      console.log(
        "------------------------------------------------------------",
      );
      console.log(
        `Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`,
      );
      console.log(
        "============================================================\n",
      );
    });
  }
}
