# V13.1 Authorization Command Boundary Scope

This stacked slice is server-only composition code above PR #119.

It contains no SQL migration, no remote Supabase application, no endpoint, no credential, no Service Role, no database URL, no production identity, and no country activation.

The slice accepts exactly six authorization write operations and delegates all authority decisions, semantic idempotency, persistence, append-only audit, and receipt storage to the trusted command handler.

Reads are intentionally excluded and will use a separate query boundary.
