# F03A Sovereign Capability Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the pure delegation invariant for server-confirmed capabilities without changing SOA, Clerk, database, UI, or Production.

**Architecture:** A fail-closed policy validates grant envelopes and runtime capability checks. OWNER authority remains outside SCG and can never be delegated. Creating a PARTNER grant requires active sovereign OWNER authority with L4 assurance. Any downstream grant must be a strict subset of the grantor's capabilities and geography/sector/resource/expiry/delegation scope.

**Tech Stack:** Node.js 22, CommonJS, `node:test`.

## Global Constraints
- OWNER is sovereign authority, not a grantable role.
- Browser role strings and client claims are never authority.
- PARTNER initial grant requires active OWNER + L4 + server-confirmed source.
- No delegate can delegate more capability/scope/depth/expiry than possessed.
- Runtime checks require server-confirmed active envelope and current time inside expiry.
- No DB write, Clerk mutation, partner creation, or Production authorization in F03A.

### Task 1: Delegation invariant
- [ ] RED tests.
- [ ] Minimal pure grant validator.
- [ ] GREEN.

### Task 2: Runtime capability check
- [ ] RED tests.
- [ ] Minimal server-confirmed capability evaluator.
- [ ] GREEN.