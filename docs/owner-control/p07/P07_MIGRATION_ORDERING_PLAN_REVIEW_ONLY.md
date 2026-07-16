# P07 Migration Ordering Plan — Review Only

No migrations are executed in P07.

## Ordered Plan for P08 Execution

1. Create base identity and profile tables.
2. Create account types and sector publishing permissions.
3. Create listings and listing media tables.
4. Create trials, subscriptions, and entitlements.
5. Create conversations and messages.
6. Create reports and moderation cases.
7. Create tiger care tickets and notifications.
8. Create audit logs and lifecycle event tables.
9. Add indexes in low-risk batches.
10. Add check constraints and unique constraints.
11. Add foreign keys after base data validation.
12. Enable RLS policies by entity class.
13. Enable storage policy bindings.
14. Run backfill and verification queries in staging only.
15. Cutover guard with rollback checkpoints.

## Dependency Notes

- Identity map and profiles must exist before any ownership-constrained tables.
- Listings must exist before media and listing lifecycle events.
- Conversations must exist before messages.
- Reports must exist before moderation cases.
- Subscriptions must exist before entitlements.
