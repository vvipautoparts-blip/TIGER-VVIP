# TIGER P0 Search and Discovery Implementation Plan

**Goal:** Add authenticated people search, post search, and safe social discovery without reusing Marketplace search authority or exposing internal identity.

**Invariants:** Profile UUIDs are the only browser identity; every post result reuses current post visibility; active profile discovery excludes self and blocked pairs; historical unavailable authors use the neutral tombstone; query and result sizes are bounded; raw tables remain unavailable; Production/Staging remain untouched.

## Execution

1. Write RED runtime, UI/read-model, migration, proof, and workflow contracts.
2. Add bounded subject-blind PostgreSQL search/discovery RPCs.
3. Add a dedicated Social search destination with people and post results.
4. Reuse the trusted profile navigation and feed post renderer.
5. Prove audience, block, lifecycle, least-privilege, and subject-blind behavior in local DB rehearsal.
6. Run focused tests and full Quality Gate, content-address the migration review, publish the exact tree, and require both remote gates GREEN on one SHA.
