# Threat Model

## Core Assumptions
- Any environment input may be hostile.
- Any operator may make mistakes under pressure.
- Production write intent is denied by default.

## Primary Threats
- Accidental destructive SQL.
- Drift between migration files and intended ordering.
- Secret leakage in repository content.
- Over-privileged runtime boundary violations.

## Controls
- Target lock for production gates.
- Read-only scans for migration integrity and SQL risk.
- Secret scan with strict redaction.
- Backup checksum and rollback rehearsal checks.
- Incident isolation and evidence preservation procedures.

## Boundary Rules
- Clerk identity is external identity proof.
- Supabase RLS is authorization boundary.
- Frontend must never use service_role.
- Tiger Care must not view passwords or tokens.

## State Constraints
- P08 remains incomplete.
- P09 is not started.
