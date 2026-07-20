# VVIP TIGER Global Platform Control Plane Design

## Purpose
Create the canonical, lossless project-control plane that governs the migration from the current static marketplace shell to a secure global platform. It preserves all legacy sources, enforces conflict-free task execution, and provides measurable launch gates for a four-million-user year-one capacity target.

## Approved Approach
Use a strangler migration. Preserve the existing static shell and P-phase history, introduce a server-only `project_control` schema, and drive implementation through the G00–G22 registry. Country capabilities and risky features are deny-by-default. No direct browser access to control data.

## Components
- Immutable source registry with SHA-256 hashes.
- Phase/task/requirement/dependency graph.
- Decisions, risks, vendors, artifacts, evidence, tests and launch gates.
- Country capability matrix for all ISO countries.
- Global scale/SLO and search-facet contracts.
- Owner-only API contract and dashboard adapter.
- Legacy P-to-G reconciliation.

## Security
Service-role access is server-only. Anonymous and authenticated browser roles receive no grants. Every status transition creates history and evidence. Sacred text is never used as an authentication or cryptographic mechanism.

## Success Criteria
Integrity tests pass; all registers contain records; dependency graph is acyclic; all requirements trace to existing tasks; SQL applies on an isolated Supabase branch; owner API authorization tests pass; import counts match the manifest exactly; no production mutation occurs before launch gates.
