# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-28

### Added
- **Core Analyzer Engine**: Modular architecture supporting 9 built-in quality and release readiness analyzers:
  - Project Metadata Analyzer
  - Repository Hygiene Analyzer
  - Documentation & Metadata Analyzer
  - Code Quality & Hygiene Analyzer
  - Testing & Coverage Analyzer
  - Build & Packaging Analyzer
  - Dependency Health Analyzer
  - Security & Secret Scanner
  - CI/CD Readiness Analyzer
- **Deterministic Release Scoring**: Category-weighted scoring model (Security 25%, Testing 20%, Code Quality 15%, Build 15%, Dependencies 10%, CI/CD 10%, Documentation 5%).
- **Mandatory Quality Gates**: Configurable release policies (fail on critical, fail on high, test suite verification, build output verification, security scan requirement, minimum threshold).
- **Zero-Secret-Leakage Redactor**: Automatic pattern detection and redaction for AWS keys, GitHub PATs, OpenAI/Anthropic credentials, database connection strings, and private keys.
- **Multi-Format Reporting**:
  - Interactive Terminal CLI output with ANSI colors and decision badges.
  - Machine-readable normalized JSON format.
  - Standard OASIS SARIF v2.1.0 output for GitHub Code Scanning and security dashboards.
  - Formatted GitHub Markdown release reports.
- **Embedded Web Dashboard**: Self-contained local HTTP server serving a developer console with real-time assessment runs, release decision banner, category score breakdown, interactive findings explorer, and history tracking.
- **CLI Suite**: Complete command-line interface (`analyze`, `init`, `doctor`, `report`, `config validate`, `analyzers list`, `ui`).
