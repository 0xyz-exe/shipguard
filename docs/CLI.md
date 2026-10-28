# CLI Reference

The `shipguard` CLI provides command-line assessment, configuration generation, SARIF/JSON reporting, and local dashboard serving.

## Command Reference

```bash
# Run comprehensive release readiness assessment on current directory
shipguard analyze

# Scan a specific repository or project path
shipguard analyze /path/to/project

# Use strict quality profile (fails on warnings as well as blockers)
shipguard analyze --profile strict

# Output standard OASIS SARIF v2.1.0 for GitHub Code Scanning
shipguard analyze --format sarif --output report.sarif

# Output machine-readable JSON for automated CI pipelines
shipguard analyze --format json > report.json

# Export clean GitHub Markdown summary
shipguard analyze --format markdown > release-checklist.md

# Initialize a default shipguard.config.json
shipguard init

# Validate existing configuration
shipguard config validate

# List all registered analyzers and capabilities
shipguard analyzers list

# Check local runtime and analyzer prerequisites
shipguard doctor

# Display the latest assessment report
shipguard report

# Launch the interactive browser dashboard
shipguard ui --port 4173
```

## Exit Codes

| Exit Code | State | Description |
| :---: | :--- | :--- |
| **`0`** | `READY` / `READY_WITH_WARNINGS` | All mandatory release gates passed successfully. |
| **`1`** | `BLOCKED` | One or more mandatory quality gates failed, or strict mode warnings were detected. |
| **`2`** | `CONFIG_ERROR` | Invalid CLI arguments, missing target directory, or invalid `shipguard.config.json`. |
| **`3`** | `INTERNAL_ERROR` | Unhandled execution exception or analyzer timeout. |
