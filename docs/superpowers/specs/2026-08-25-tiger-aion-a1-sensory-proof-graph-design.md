# TIGER AION ∞ A1 — Sensory Proof Graph Design

**Status:** `OWNER_APPROVED / A1 IN_PROGRESS`

**Parent authority:** `docs/owner-control/TIGER_AION_2026_CURRENT_OWNER_AUTHORITY.md`

**Parent design:** `docs/superpowers/specs/2026-08-25-tiger-aion-prospective-living-digital-organism-design.md`

## 1. Purpose

A1 establishes the vendor-neutral evidence substrate that every later AION stage consumes. It does not deploy a telemetry backend and does not grant autonomous authority. It converts trustworthy observations into deterministic, correlatable evidence objects while preserving the boundary between production facts, simulations, and derived hypotheses.

## 2. Required signal classes

The initial envelope supports these classes:

- `METRIC`
- `LOG`
- `TRACE`
- `PROFILE`
- `KERNEL`
- `NETWORK`
- `DATABASE`
- `RUM`
- `BUSINESS`
- `FRAUD`
- `COST`
- `RELEASE`
- `SECURITY`

OpenTelemetry is the preferred normalization direction where applicable, but the AION proof model remains backend/vendor neutral.

## 3. Fact classes

Every envelope must be exactly one of:

- `PRODUCTION_FACT` — observed from real runtime or authoritative release/CI evidence;
- `SIMULATION` — produced by Dream/Twin/Synthetic Society environments;
- `DERIVED_HYPOTHESIS` — analytical inference that is not itself an observed fact.

A simulation or hypothesis must never be silently promoted into a production fact.

## 4. Evidence Envelope

Canonical fields:

```text
EvidenceEnvelope {
  schema_version
  evidence_id
  signal_type
  fact_class
  occurred_at
  observed_at
  source { system, component, instance?, region?, release_sha? }
  subject { type, id }
  correlation { trace_id?, span_id?, request_id?, session_ref?, release_sha?, incident_id? }
  sensitivity
  attributes
  content_digest
  expires_at
}
```

### Invariants

- ISO-8601 timestamps only.
- `evidence_id`, subject identifiers, and correlation identifiers are bounded strings.
- `content_digest` is SHA-256 of a canonicalized safe representation; raw secret-bearing content is not persisted in the graph.
- Attribute names matching secret/credential/session-bearing keys are rejected fail-closed.
- Attribute values with obvious credential/token patterns are rejected fail-closed.
- Secret values never appear in Proof Graph nodes or edges.
- `PRODUCTION_FACT` requires an authoritative source classification supplied by the caller; the library does not infer production truth from text.
- Envelope expiry/freshness is explicit and deterministic.

## 5. Proof Graph

A graph contains immutable evidence nodes and typed edges.

Initial edge types:

- `CORRELATES_WITH`
- `CAUSED_BY_CANDIDATE`
- `OBSERVED_DURING`
- `EMITTED_BY`
- `USES_RELEASE`
- `AFFECTS`
- `VERIFIES`
- `DERIVED_FROM`

Each edge references existing node IDs; dangling references fail closed.

The graph digest is deterministic: identical canonical nodes/edges must produce the same SHA-256 digest independent of input ordering.

## 6. Freshness

Freshness is evaluated from `observed_at` and `expires_at` using an injected clock. Wall-clock access is forbidden inside deterministic tests.

- Evidence with `now > expires_at` is stale.
- Evidence cannot be made fresh by changing display metadata.
- High-risk automation later must require fresh evidence according to policy; A1 only exposes the deterministic freshness predicate.

## 7. Secret and privacy boundary

A1 stores references, classifications, and digests — not passwords, access tokens, cookies, private keys, payment credentials, or raw sensitive payloads.

The initial deny-key set includes case-insensitive matches for:

`password`, `passwd`, `secret`, `token`, `authorization`, `cookie`, `private_key`, `api_key`, `service_role`, `session_token`, `refresh_token`.

The deny-value detector covers common bearer/JWT/private-key/provider-secret patterns conservatively. False positives must be handled by moving the value out of the graph, not by globally weakening secret detection.

## 8. Deterministic canonicalization

Objects are recursively key-sorted before hashing. Arrays preserve semantic order unless the parent collection is explicitly modeled as an unordered graph set. Graph nodes and edges are sorted by stable identity before graph digesting.

## 9. Error model

The module fails closed with typed error codes:

- `AION_EVIDENCE_INVALID`
- `AION_SIGNAL_TYPE_INVALID`
- `AION_FACT_CLASS_INVALID`
- `AION_SECRET_MATERIAL_REJECTED`
- `AION_TIMESTAMP_INVALID`
- `AION_GRAPH_DANGLING_EDGE`
- `AION_GRAPH_DUPLICATE_ID`

No invalid item is silently dropped.

## 10. First implementation slice

Create `project-control/aion/sensory-proof-graph.mjs` exposing:

- `createEvidenceEnvelope(input)`
- `isEvidenceFresh(envelope, nowMs)`
- `createProofGraph({ nodes, edges })`
- `digestProofGraph(graph)`
- exported constants for allowed signal/fact/edge types.

The first tests must prove:

1. valid production/database evidence can be created;
2. simulation remains explicitly simulation;
3. stale evidence is rejected by freshness predicate;
4. secret-bearing keys and values fail closed;
5. dangling edges fail closed;
6. duplicate evidence IDs fail closed;
7. graph digest is deterministic across input ordering;
8. no wall-clock dependency is required by tests.

## 11. Non-goals of A1 slice 1

- No Grafana/Datadog deployment.
- No eBPF agent deployment yet.
- No Production instrumentation mutation yet.
- No raw log storage.
- No automatic remediation.
- No legal-policy execution.

Those are later, evidence-gated slices.
