# Release Readiness Scoring Model

ShipGuard uses a deterministic, explainable scoring algorithm. Release decisions are not derived from arbitrary heuristics; they are calculated from applicable category weights and mandatory quality gates.

## Category Weights

| Category | Weight | Focus Areas |
| :--- | :---: | :--- |
| **Security** | 25% | Hardcoded credentials, exposed secrets, private keys, dangerous functions |
| **Testing & Coverage** | 20% | Test framework availability, test file discovery, test execution, coverage reports |
| **Code Quality** | 15% | Linter/formatter configuration, compiler errors, TODO/FIXME markers, hygiene |
| **Build & Packaging** | 15% | Build scripts, distribution artifacts, Dockerfile health |
| **Dependency Health** | 10% | Lockfile integrity, package manager conflicts, unpinned versions |
| **CI/CD Readiness** | 10% | GitHub Actions presence, automated test/build jobs, security permissions |
| **Documentation** | 5% | README, LICENSE, SECURITY, CONTRIBUTING, CHANGELOG |

## Deduction Calculation

Each category starts with a baseline score of 100 points.

Deductions are applied per open finding:
- **CRITICAL**: -35 points
- **HIGH**: -20 points
- **MEDIUM**: -10 points
- **LOW**: -4 points
- **INFO**: 0 points

If an analyzer fails due to an unexpected execution error, its score is clamped to a maximum of 50 points or 0 points depending on severity.

## Mandatory Release Gates

Even with a high overall numerical score, a release can be **BLOCKED** if any mandatory gate fails:
1. `Zero Critical Vulnerabilities`: Mandatory gate fails if any unresolved CRITICAL finding exists.
2. `Zero High-Severity Issues`: Configurable in `strict` profile.
3. `Automated Tests Passed`: Requires a passing test framework and test suite.
4. `Build Verification`: Requires a build script and valid build output.
5. `Security Scan Completed`: Requires successful completion of the security analysis module.
6. `Minimum Quality Score`: Requires overall score to exceed threshold (default: 80).
