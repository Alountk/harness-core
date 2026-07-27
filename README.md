# 🛠️ Harness Core

> Extensible, type-safe execution and evaluation harness designed for automated testing, benchmark execution, and structured reporting.

![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg)

---

## 📌 Overview

**Harness Core** provides a lightweight, modular foundation to execute, monitor, and report automated test suites and evaluation workflows. Built with TypeScript, it focuses on strict type safety, fast setup, and decoupled runner architectures.

### Key Features

- 🎯 **Type-Safe Fixtures & Inputs:** Schema validation using Zod for predictable test setups.
- ⚡ **Pluggable Runners:** Modular execution strategy allowing seamless custom test runners.
- 📊 **Structured Reporting:** Standardized output formats (JSON, Markdown, JUnit) for CI/CD integration.
- 🔁 **Concurrency & Retry Controls:** Fine-grained execution controls, timeouts, and exponential backoff handling.
- 🐳 **Container & CI-Ready:** Optimized for execution within GitHub Actions pipelines and Docker environments.

---

## 🏗️ Architecture
harness-core/
├── src/
│   ├── core/         # Engine core, execution loop, and state orchestration
│   ├── fixtures/     # Environment preparation and mock datasets
│   ├── runners/      # Execution adapters (unit, integration, or custom evals)
│   ├── reporters/    # Output formatters (Console, JSON, HTML, JUnit)
│   └── index.ts      # Main CLI & programmatic API entrypoint
├── tests/            # Harness self-testing suite
├── config/           # Default configurations and schemas
└── package.json
---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `>= 20.0.0` or **Bun**: `>= 1.0.0`
- **pnpm** (recommended) or **npm**

### Installation

```bash
# Clone the repository
git clone [https://github.com/Alountk/harness-core.git](https://github.com/your-username/harness-core.git)

# Navigate to project directory
cd harness-core

# Install dependencies
pnpm install