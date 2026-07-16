# Secrets and Access Control

## Principles
- Least privilege for all operators and services.
- No service_role usage in frontend code.
- No raw secret values in repository files.

## Detection Policy
- Scan for high-confidence secret signatures only.
- Redact all detected values in reports.
- Never print full token/password material.

## Identity and Authorization Boundary
- Clerk handles identity assertions.
- Supabase RLS enforces authorization controls.
- Boundary crossing must be explicit and audited.

## Tiger Care Constraints
- Tiger Care must never expose passwords or tokens.
- Sensitive actions must be audit logged.

## Key Rotation
- Rotate keys when exposure is suspected.
- Track rotation evidence and revocation timeline.
