# Global Platform Control Plane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a complete, server-only, lossless project-control plane into VVIP TIGER and make it the single measurable source of truth for the global launch program.

**Architecture:** Additive strangler migration. New files live under `project-control/`, `docs/global/`, `supabase/migrations/`, and `tests/`; the legacy runtime remains untouched until dedicated feature PRs migrate it. Supabase access is deny-by-default and exposed only through an authenticated owner backend.

**Tech Stack:** PostgreSQL/Supabase, Node.js built-in test runner, Clerk owner authorization, static owner dashboard adapter, JSON/CSV source artifacts.

## Global Constraints
- No direct changes to `main`.
- No Production DDL before Development/Branch and Staging verification.
- Preserve every old source and phase mapping.
- Four-million registered-user year-one capacity target; test in 10k/25k/50k concurrency tiers.
- Country and payment capabilities are disabled until approved.
- Sacred text is not a security mechanism.

---

### Task 1: Integrity Contract
**Files:** `project-control/tests/project_control_integrity.test.mjs`, `project-control/scripts/validate_project_control.mjs`
- [ ] Write tests that fail when registers are empty, hashes mismatch, dependencies cycle, requirements point to missing tasks, or mandatory global datasets are absent.
- [ ] Run `node --test project-control/tests/project_control_integrity.test.mjs`; verify RED on the unextended package.
- [ ] Implement the validator using Node standard libraries only.
- [ ] Run the test and validator; expect all checks PASS.
- [ ] Commit: `test: enforce project control integrity contract`.

### Task 2: Complete Operational Registers
**Files:** `project-control/data/decision_log.csv`, `risk_register.csv`, `vendor_register.csv`, `launch_gate_register.csv`, `artifact_register.csv`, `strategic_backlog.csv`
- [ ] Seed approved decisions, concrete risks, vendor categories and exit plans, launch gates, retained backlog and artifact hashes.
- [ ] Validate UTF-8, unique IDs and non-empty rows.
- [ ] Commit: `docs: complete global operational registers`.

### Task 3: Extended Control Schema
**Files:** `supabase/migrations/20260720_project_control_schema.sql`, `project-control/database/003_project_control_extended_seed.sql`
- [ ] Add requirements, links, vendors, gates, backlog, country capabilities, scale targets, facets, tests and evidence tables.
- [ ] Revoke browser roles and grant server service role only.
- [ ] Apply on a Supabase development branch; verify table counts and advisor results.
- [ ] Roll back by dropping schema only on the disposable branch.
- [ ] Commit: `feat: add server-only global project control schema`.

### Task 4: Lossless Import
**Files:** `project-control/scripts/import_project_control.mjs`
- [ ] Add transactional upserts for every dataset and checksum verification before import.
- [ ] Reject imports when manifest counts or source hashes differ.
- [ ] Verify exact counts: 3 sources, 23 phases, 70 tasks, 2,093 requirements and 112 dependencies.
- [ ] Commit: `feat: import complete project control datasets`.

### Task 5: Owner API Boundary
**Files:** `supabase/functions/project-control/index.ts`, `tests/project-control-api.test.cjs`
- [ ] Write failing tests for anonymous denial, non-owner denial, owner read, validated status transition, immutable history and evidence requirement.
- [ ] Implement owner authorization using verified Clerk identity/role claims; never accept role from request body.
- [ ] Implement GET summaries/details and POST status/evidence actions with allowlisted fields.
- [ ] Run security and contract tests.
- [ ] Commit: `feat: add owner-only project control API`.

### Task 6: Dashboard Integration
**Files:** `owner-control.html`, `scripts/project-control-client.js`, `styles/project-control.css`
- [ ] Write failing DOM/static contract tests for loading, error, offline, filters, task details and evidence submission.
- [ ] Replace LocalStorage as source of truth with API reads; retain a read-only cached snapshot for outages.
- [ ] Add Arabic RTL and English LTR, keyboard navigation, mobile layout and low-data mode.
- [ ] Commit: `feat: integrate global owner control center`.

### Task 7: Legacy Reconciliation
**Files:** `docs/owner-control/global-execution-status.json`, `project-control/data/legacy_phase_mapping.csv`
- [ ] Keep `phase-status.json` unchanged as historical state.
- [ ] Add explicit P-to-G mapping and display both statuses without claiming equivalence.
- [ ] Add tests preventing deletion or accidental completion drift.
- [ ] Commit: `docs: reconcile legacy and global execution roadmaps`.

### Task 8: CI and Launch Gates
**Files:** `.github/workflows/project-control-integrity.yml`, `tests/project-control-launch-gates.test.cjs`
- [ ] Run integrity, secret scan, SQL static checks and artifact hash verification on every PR.
- [ ] Block merge on empty registers, changed source hashes without decision, cyclic dependencies or missing evidence.
- [ ] Commit: `ci: enforce global project control gates`.

### Task 9: Staging Verification
- [ ] Apply migrations to Supabase branch.
- [ ] Import datasets and record counts.
- [ ] Run security/performance advisors.
- [ ] Exercise owner API and dashboard from two roles.
- [ ] Store evidence in `project_control.evidence_records`.
- [ ] Mark only GATE-01 through GATE-03 eligible for approval.

### Task 10: Pull Request
- [ ] Run all tests and `git diff --check`.
- [ ] Verify no secrets and no production identifiers.
- [ ] Open a draft PR with rollback and exact evidence.
- [ ] Do not merge until owner review and green CI.
