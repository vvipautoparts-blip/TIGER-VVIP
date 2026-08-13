# F12A Red-Team Evidence Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Define a fail-closed evidence contract for the five approved FUSION red-team campaigns without implementing offensive payloads.

**Architecture:** A pure evaluator consumes campaign evidence records and returns PASS only when all five exact campaigns have immutable run identity, completed status, and zero unresolved Critical/High findings. A JSON schema freezes the evidence shape. This phase does not perform scanning or exploitation.

**Tech Stack:** Node.js 22, CommonJS, JSON Schema, `node:test`.

## Global Constraints
- Exactly five campaigns: owner takeover, delegation escape, financial tampering, media weaponization, release/supply-chain.
- No exploit payloads, attack code, credential attacks, or Production tests in F12A.
- Exact 40-hex commit SHA and SHA-256 artifact digest required per campaign.
- PASS requires zero unresolved Critical and High findings.
- Medium/Low findings remain reported and must not disappear silently.
- F12 PASS alone never authorizes global launch.

### Task 1: Campaign evaluator
- [ ] Write failing tests.
- [ ] Verify RED because evaluator does not exist.
- [ ] Implement minimal evaluator.
- [ ] Verify GREEN.

### Task 2: Evidence schema
- [ ] Write failing tests for schema.
- [ ] Verify RED.
- [ ] Add strict schema.
- [ ] Verify GREEN.