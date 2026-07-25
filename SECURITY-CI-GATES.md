# Security CI Gates

## Scope

This repository uses two pull-request security gates:

- CodeQL analyzes JavaScript and TypeScript changes on pull requests and pushes to `main`.
- Dependency Review rejects dependency changes that introduce vulnerabilities rated high or critical.

CodeQL can also be started manually with `workflow_dispatch` for diagnostics. Neither workflow uses repository secrets or suppresses failures.

## Permissions

CodeQL receives only `contents: read` and `security-events: write`. Dependency Review receives only `contents: read`.

License enforcement is disabled because the repository has no approved license allowlist or denylist. Enabling it requires a separately reviewed legal policy.

## Dependency Maintenance

Dependabot tracks only ecosystems represented on `main`:

- GitHub Actions in `.github/workflows/`.
- Python development dependencies in `requirements-dev.txt`.

There is no npm or Docker ecosystem configuration because `main` has no corresponding manifest.

## Availability

Dependency Review is available because this repository is public and its Dependency Graph API is active. A workflow file is not execution evidence: the pull-request checks must complete successfully before this gate is treated as operational.