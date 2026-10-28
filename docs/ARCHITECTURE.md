# Architecture Overview

ShipGuard is designed around a decoupled, local-first engine architecture that evaluates software release readiness without external dependencies.

```
┌─────────────────────────────────────────────────────────────┐
│                       ShipGuard CLI / Web                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────▼──────────────────┐
            │       Analyzer Orchestration        │
            │   (Concurrency, Timeouts, Sandbox)  │
            └──────────────────┬──────────────────┘
                               │
  ┌────────────────────────────┼────────────────────────────┐
  │                            │                            │
┌─▼──────────────┐   ┌─────────▼────────┐         ┌─────────▼────────┐
│ Security &     │   │ Code Quality &   │   ...   │ Testing & Build  │
│ Secret Scanner │   │ Hygiene          │         │ Verification     │
└─┬──────────────┘   └─────────┬────────┘         └─────────┬────────┘
  │                            │                            │
  └────────────────────────────┼────────────────────────────┘
                               │
            ┌──────────────────▼──────────────────┐
            │   Zero-Secret Redactor & Normalizer │
            └──────────────────┬──────────────────┘
                               │
            ┌──────────────────▼──────────────────┐
            │  Scoring & Release Gates Evaluator  │
            └──────────────────┬──────────────────┘
                               │
  ┌────────────────────────────┴────────────────────────────┐
  │                            │                            │
┌─▼──────────────┐   ┌─────────▼────────┐         ┌─────────▼────────┐
│ Terminal Table │   │ OASIS SARIF v2.1 │         │ Local SQLite/DB  │
│ & Decision     │   │ & JSON / MD      │         │ & Interactive UI │
└────────────────┘   └──────────────────┘         └──────────────────┘
```

## Core Components

1. **Analyzer Registry (`src/engine/registry.ts`)**: Extensible catalog of analyzers. Analyzers implement a typed `IAnalyzer` interface with discovery checks (`isAvailable`), execution timeouts, and finding schemas.
2. **Execution Runner (`src/engine/runner.ts`)**: Executes active analyzers in parallel with bounded execution duration. Isolates analyzer exceptions so a failure in one module never crashes the entire evaluation.
3. **Secret Redactor (`src/engine/redactor.ts`)**: Automatically redacts high-entropy keys, AWS identifiers, GitHub PATs, Bearer headers, and database credentials before persistence or reporting.
4. **Scoring Engine (`src/engine/scoring.ts`)**: Deterministic deduction model calculating category scores and overall weighted release quality index.
5. **Gatekeeper (`src/engine/gates.ts`)**: Evaluates hard-blocking release gates (mandatory checks, critical thresholds, test and build presence).
6. **Persistence & REST API (`src/store/db.ts`, `src/server/app.ts`)**: Stores project history, assessment runs, and finding statuses in local storage. Serves REST API and responsive single-page application dashboard.
