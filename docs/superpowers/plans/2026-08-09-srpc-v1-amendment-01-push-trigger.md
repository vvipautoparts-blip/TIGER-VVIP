# SRPC v1 Implementation Plan Amendment 01 — Control-Plane Workflow Trigger

Status: **EXECUTION CORRECTION — AUTHORITATIVE FOR TASKS 6 AND 10**
Date: **2026-08-09**

## Reason

The approved implementation plan originally used `workflow_dispatch` for SRPC workflows that exist only on `feat/srpc-v1-control-plane-20260809`. GitHub only delivers `workflow_dispatch` when the workflow file exists on the repository default branch. SRPC deliberately keeps its control plane outside `main`, so that trigger is not executable without first bootstrapping a workflow into `main`, which would violate the current isolation objective.

## Corrected Rule

Tasks 6 and 10 use a `push` trigger scoped exactly to:

`feat/srpc-v1-control-plane-20260809`

The workflow's signer/control-plane source identity is `github.sha` / `GITHUB_SHA` from the push event. The workflow must explicitly checkout the control plane at `${{ github.sha }}` and record that 40-character SHA in source/capsule/attestation evidence.

No mutable branch tip is accepted as evidence after the run starts.

## Task 6 Trigger

Use `push` on the control-plane branch with paths limited to the source-proof workflow and SRPC source-lock implementation/tests. Do not use `workflow_dispatch`.

## Task 10 Trigger

Use `push` on the same control-plane branch with paths limited to the attestation workflow and finalized Phase B SRPC evidence/capsule inputs. The attestation workflow must verify evidence completeness before signing. Do not use `workflow_dispatch`.

## Security Properties Preserved

- H0 remains immutable and separately checked out by exact SHA.
- Control-plane signer source is the exact pushed commit SHA.
- PR #181 remains untouched until the independent pin gate.
- No SRPC workflow is introduced into `main` merely to enable dispatch.
- All third-party Actions remain pinned to full commit SHAs.
- Staging/Production authority separation is unchanged.
