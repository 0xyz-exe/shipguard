# Built-in Quality & Security Analyzers

ShipGuard includes 9 built-in analyzers:

### 1. Project Metadata (`project-metadata`)
- **Category:** `documentation`
- **Rules:**
  - `META-001`: Invalid or unparseable `package.json`
  - `META-002`: Missing or placeholder version tag (`0.0.0`)
  - `META-003`: Missing SPDX license identifier
  - `META-004`: Missing or minimal project description

### 2. Repository Hygiene (`repo-hygiene`)
- **Category:** `hygiene`
- **Rules:**
  - `HYG-001`: Missing `.gitignore` file
  - `HYG-002`: Committed `.env` or `.env.local` files containing configuration
  - `HYG-003`: Temporary OS or build junk files (`.DS_Store`, `Thumbs.db`, `*.tmp`)
  - `HYG-004`: Oversized repository artifacts (> 10 MB)

### 3. Documentation & Metadata (`documentation`)
- **Category:** `documentation`
- **Rules:**
  - `DOC-001`: Missing `README.md` file
  - `DOC-002`: Empty or skeleton README (< 50 characters)
  - `DOC-003`: Missing open-source `LICENSE` file
  - `DOC-004`: Missing `SECURITY.md` vulnerability reporting policy
  - `DOC-005`: Missing `CHANGELOG.md` file

### 4. Code Quality & Hygiene (`code-quality`)
- **Category:** `code_quality`
- **Rules:**
  - `QUAL-001`: Missing linter or formatter configuration (ESLint, Biome, Prettier)
  - `QUAL-002`: Standalone `debugger;` statement left in production code
  - `QUAL-003`: Unresolved `FIXME`, `BUG`, or `XXX` comment markers

### 5. Testing & Coverage (`testing-coverage`)
- **Category:** `testing`
- **Rules:**
  - `TEST-001`: Stub test script detected (`echo "Error: no test specified"`)
  - `TEST-002`: No automated tests, test files, or test configuration detected
  - `TEST-003`: Missing recent code coverage report (`coverage/`)

### 6. Build & Packaging (`build-packaging`)
- **Category:** `build`
- **Rules:**
  - `BUILD-001`: Missing `build` script in manifest
  - `BUILD-002`: Declared package `main` entry point missing on disk
  - `BUILD-003`: Unpinned Docker base image tag (`:latest`)

### 7. Dependency Health (`dependencies`)
- **Category:** `dependencies`
- **Rules:**
  - `DEP-001`: Missing dependency lockfile
  - `DEP-002`: Multiple conflicting lockfiles detected (e.g. `pnpm-lock.yaml` and `yarn.lock`)
  - `DEP-003`: Wildcard or unpinned dependency versions (`*`, `latest`)

### 8. Security & Secret Scanner (`security`)
- **Category:** `security`
- **Rules:**
  - `SEC-001`: Exposed AWS Access Key ID (`AKIA...`)
  - `SEC-002`: Exposed GitHub Personal Access Token (`ghp_...`, `github_pat_...`)
  - `SEC-003`: Embedded private cryptographic key block
  - `SEC-004`: Exposed OpenAI or Anthropic API key (`sk-...`)
  - `SEC-005`: Database URI with plaintext username and password
  - `SEC-010`: Dangerous `eval()` dynamic code execution

### 9. CI/CD Readiness (`cicd-readiness`)
- **Category:** `cicd`
- **Rules:**
  - `CICD-001`: Missing `.github/workflows` automation
  - `CICD-002`: Excessive workflow permissions (`permissions: write-all`)
  - `CICD-003`: CI workflow does not execute automated tests
  - `CICD-004`: CI workflow does not verify application build
