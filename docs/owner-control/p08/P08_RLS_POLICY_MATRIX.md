# P08 RLS Policy Matrix

The machine-readable policy contract is [P08_RLS_POLICY_MATRIX.json](P08_RLS_POLICY_MATRIX.json). It covers each of the 19 P07 entities exactly once and defines `SELECT`, `INSERT`, `UPDATE`, and `DELETE` decisions for each.

Every conditional decision is based on Clerk JWT subject ownership, an explicitly scoped administrative role, or sector permission. Audit and lifecycle entities are append-only where their matrix decision denies mutation.