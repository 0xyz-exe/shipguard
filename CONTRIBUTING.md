# Contributing to ShipGuard

Thank you for your interest in contributing to ShipGuard! We welcome issues, bug reports, and pull requests.

## Development Workflow

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Getting Started

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/0xyz-exe/shipguard.git
   cd shipguard
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run the development build:
   ```bash
   pnpm run build
   ```

4. Run the test suite:
   ```bash
   pnpm test
   ```

5. Run typecheck:
   ```bash
   pnpm run typecheck
   ```

## Pull Request Guidelines

- Ensure all existing tests pass (`pnpm test`).
- Add tests for new analyzers, scoring modifications, or reporter features.
- Ensure typecheck passes cleanly with zero errors (`pnpm run typecheck`).
- Follow established project formatting and commit message conventions.
