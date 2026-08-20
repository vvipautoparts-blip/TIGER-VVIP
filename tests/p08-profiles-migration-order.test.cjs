const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDirectory = path.resolve(__dirname, '../supabase/migrations');

test('profile migrations have unique ordered ledger versions', () => {
  const files = fs
    .readdirSync(migrationsDirectory)
    .filter((name) => name.endsWith('.sql') && /profile/i.test(name))
    .sort();

  const versions = files.map((name) => name.split('_', 1)[0]);
  assert.equal(
    new Set(versions).size,
    versions.length,
    `duplicate profile migration versions: ${files.join(', ')}`,
  );

  assert.deepEqual(files, [
    '20260706_public_profiles_bootstrap.sql',
    '20260707_vvip_tiger_auth_profile_bridge.sql',
    '20260708_vvip_tiger_clerk_profiles_table.sql',
    '20260709_vvip_tiger_profiles_clerk_jwt_rls_bridge.sql',
    '20260710_vvip_tiger_atomic_profile_resolver_rpc.sql',
    '20260808_vvip_identity_fail_closed_profile_resolver.sql',
    '20260812063600_identity02_profile_resolver_minimum_truth.sql',
    '20260816103000_sovereign_profile_authority_convergence.sql',
    '20260816104500_retire_legacy_profile_rpc.sql',
    '20260816105000_drop_legacy_profiles_table.sql',
    '20260817060000_retire_lc04_legacy_profile_helper_graph.sql',
    '20260820220500_public_profile_projection.sql',
  ]);
});
