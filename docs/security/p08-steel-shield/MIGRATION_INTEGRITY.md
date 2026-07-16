# Migration Integrity

## Required Controls
- Strict migration naming discipline.
- Unique numeric migration prefixes.
- No empty migration files.
- No unexpected non-SQL files in migrations.
- Enforced ordering checks.
- Files must end with newline.

## Risk Detection
- Hard-coded project refs.
- Hard-coded database URLs.
- service_role references.

## Execution Discipline
- Expand -> Migrate -> Verify -> Contract.
- No irreversible delete in same release train.
- Batch limits and explicit transaction boundaries.
- Statement timeout and lock timeout mandatory.
