# CI Expectation

The next pull-request CI run is intentionally expected to fail because the RED contracts reference implementation files not created yet. The expected missing authorities are:

- `scripts/release/media-cell-genome.cjs`
- `scripts/release/media-cell-supply-gate.cjs`
- `.github/workflows/tiger-media-sovereign-sealed-build.yml`

A failing exact-head run at this checkpoint is TDD evidence, not a Production failure. Implementation starts only after this RED result is observed.
