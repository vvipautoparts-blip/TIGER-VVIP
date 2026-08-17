# TIGER Sovereign Intelligence — CURRENT_ONLY Design

Status: APPROVED OWNER ARCHITECTURE / IMPLEMENTATION CONVERGENCE
Date: 2026-08-17
Target: Global Launch Ready

## Objective

Converge the existing TIGER AI/control-plane code into one sovereign intelligence authority without introducing another agent framework. The current repository already contains a Node security kernel plus browser command-center/owner-console surfaces. The final design keeps one policy/capability registry, one security kernel/policy gate, and thin non-authoritative UI consumers.

## Existing authority problem

The current tree duplicates security semantics across `scripts/ai/sovereign-security-kernel.js` and `scripts/ai/vvip-ai-command-center.js`: ACTIONS, DECISIONS, policy rules, and agent/action scopes are independently declared. `owner-control.html` loads the browser command center and owner console, while Node tests exercise the sovereign security kernel. Two independently editable policy tables are unacceptable under CURRENT_ONLY.

## Canonical architecture

```text
OWNER / TRUSTED ACTOR
        |
        v
TIGER SOVEREIGN DIRECTOR
        |
        +-- Security Sentinel
        +-- Trust & Abuse Sentinel
        +-- Market Intelligence
        +-- Operations Sentinel
        +-- Owner Intelligence
        |
        v
SOVEREIGN INTELLIGENCE REGISTRY
(actions, profiles, capabilities, inference policy)
        |
        v
SOVEREIGN SECURITY KERNEL / POLICY GATE
        |
        v
CONTROLLED TOOLS ONLY
```

The named managers/sentinels are profiles/capability sets, not separately running AI programs.

## Runtime authority

- `scripts/ai/sovereign-intelligence-registry.js`: sole declarative authority for actions, decisions, profiles/scopes, policy levels, intelligence ladder, forbidden inference/data capabilities, and zero-paid-inference default.
- `scripts/ai/sovereign-security-kernel.js`: sole executable authorization/policy gate. It consumes the registry and owns trusted actors, trusted runtime state, approvals, replay prevention, budget/rate gates, tool binding, kill switches, and audit-safe execution planning.
- `scripts/ai/vvip-ai-command-center.js`: browser facade/state/reporting only. It consumes the registry and must not contain an independently editable security policy or profile permission matrix.
- `scripts/ai/vvip-ai-owner-console.js`: owner UI adapter only. It must not become an authorization authority.
- `owner-control.html`: loads the canonical registry before command-center and owner-console consumers.

## Intelligence ladder

Every intelligence request follows this order:

1. Deterministic rule.
2. Database/metric result through an approved API/tool boundary; never direct AI database access.
3. Small local model when required and permitted.
4. Browser/device built-in AI when available and explicitly permitted.
5. No-AI graceful fallback.

If a deterministic or metric path can answer the request, model inference is not selected.

## Cost sovereignty

- Recurring paid AI inference budget is `0` by default.
- OpenAI, Claude/Anthropic, Gemini/Google paid inference, Firebase AI, or any other paid remote model is not a silent fallback.
- A missing local/browser model degrades to the no-AI path rather than creating a remote bill.
- Models/WASM are feature-triggered/lazy; the baseline application must not require downloading a model.
- Local execution may use WebGPU where available, then WASM, then no-AI fallback.

## Security invariants

- Default deny for unknown action, profile, tool, or runtime state.
- No direct database access by an AI/profile. Data is obtained only through an approved bounded API/tool path.
- No Service Role credential, AWS credential, IAM mutation, secrets reveal/print, or production deployment credential is exposed to intelligence runtime.
- AI cannot delete users or production data, transfer funds, or change owner permissions.
- Owner-gated L4 actions remain explicit, scoped, time-bounded where applicable, payload-bound, and replay resistant; an owner approval cannot convert permanently forbidden actions into allowed actions.
- Independent global/agent/tool kill switches fail closed.
- Private messages are excluded from general intelligence memory/training inputs. A narrowly scoped product feature may process user-provided text transiently only under its explicit capability and must not convert it into general memory.
- Audit metadata is allow-listed and must not contain raw secrets or raw private message bodies.

## Zero-residue rules

- No duplicate ACTIONS/POLICY/profile permission tables may remain in browser and Node runtimes.
- No paid-provider fallback key/config is introduced for the primary path.
- No dead agent/model/provider definition remains after replacement.
- `.agent`, `.agents`, and developer-assistant instruction files are not runtime intelligence authority and are not deleted merely because of their names.
- Machine authority documents must reference only paths that exist in the current tree.

## Failure behavior

- Registry unavailable in browser: command-center fails closed/disabled; no permissive local policy is reconstructed.
- Kill switch active: execution denied before tool invocation.
- Unsupported local/browser inference: return a deterministic/no-AI degraded outcome.
- Malformed runtime state or approval: deny.
- Unknown provider/model: deny unless it is a declared local/browser capability consistent with zero-paid-inference policy.

## Verification contracts

Tests must prove:

1. Kernel and browser facade use the same canonical registry objects/semantics.
2. Command center has no duplicate policy/action/profile authority.
3. Zero-paid-inference is the default and paid remote fallback is denied.
4. Intelligence ladder prefers deterministic/metric routes before model inference and degrades to no-AI.
5. Kill switches and unknown capabilities fail closed.
6. Direct DB, service-role/AWS/secrets/IAM/destructive permissions remain forbidden.
7. Owner control loads registry before its AI consumers.
8. `current-authority.v1.json` lists the actual canonical AI paths and does not reference nonexistent verification paths.
9. Existing AI02 authorization, approval, replay, tool-binding, and audit tests remain green.

## Deployment boundary

This work is delivered on a child feature branch and PR into `feat/fusion-single-surface-integration-20260815`. It does not authorize a direct merge to `main` or production deployment. Exact-SHA CI and review gates remain mandatory.
