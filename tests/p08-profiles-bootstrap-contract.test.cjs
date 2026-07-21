const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationsDirectory = path.resolve(__dirname, '../supabase/migrations');
const repositoryRoot = path.resolve(__dirname, '..');
const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('.sql'))
  .sort();

function readMigration(name) {
  return fs.readFileSync(path.join(migrationsDirectory, name), 'utf8');
}

function stripLineComments(sql) {
  return sql.replace(/--.*$/gm, '');
}

test('profiles regression fixtures are explicitly allowlisted', () => {
  const gitignore = fs.readFileSync(path.join(repositoryRoot, '.gitignore'), 'utf8');

  for (const name of [
    'p08-profiles-bootstrap-contract.test.cjs',
    'p08-profiles-bootstrap-local.sql',
    'p08-profiles-migration-order.test.cjs',
  ]) {
    assert.match(
      gitignore,
      new RegExp(`^!tests/${name.replaceAll('.', '\\.')}\\s*$`, 'm'),
      `${name} must be explicitly allowlisted in .gitignore`,
    );
  }
});

test('cross-user insert probe uses an unseeded Clerk identity', () => {
  const sql = stripLineComments(
    fs.readFileSync(path.join(__dirname, 'p08-profiles-bootstrap-local.sql'), 'utf8'),
  );
  const seed = sql.match(
    /insert\s+into\s+public\.profiles[\s\S]+?values\s+\([^;]+?'([^']+)'\s*\)\s*;/i,
  );
  const probe = sql.match(
    /values\s*\(\s*'profile-isolation-forbidden@example\.invalid'\s*,\s*'([^']+)'\s*\)/i,
  );

  assert.notEqual(seed, null, 'expected the two-user profiles seed');
  assert.notEqual(probe, null, 'expected the cross-user insert probe');
  assert.doesNotMatch(
    seed[0],
    new RegExp(`'${probe[1]}'`),
    'cross-user insert probe must not reuse a seeded unique clerk_user_id',
  );
});

test('public.profiles is created before the first dependent migration', () => {
  let creation = null;
  let firstDependency = null;

  migrationFiles.forEach((name, index) => {
    const sql = stripLineComments(readMigration(name));
    const createsProfiles = /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.profiles\s*\(/i.test(sql);
    const dependsOnProfiles =
      /alter\s+table\s+public\.profiles\b/i.test(sql) ||
      /insert\s+into\s+public\.profiles\b/i.test(sql) ||
      /update\s+public\.profiles\b/i.test(sql) ||
      /from\s+public\.profiles\b/i.test(sql) ||
      /on\s+public\.profiles\b/i.test(sql) ||
      /public\.profiles%rowtype\b/i.test(sql);

    if (createsProfiles && creation === null) creation = { name, index };
    if (dependsOnProfiles && !createsProfiles && firstDependency === null) {
      firstDependency = { name, index };
    }
  });

  assert.notEqual(firstDependency, null, 'expected a migration that depends on public.profiles');
  assert.notEqual(
    creation,
    null,
    `no migration creates public.profiles before ${firstDependency.name}`,
  );
  assert.equal(creation.name, '20260706_public_profiles_bootstrap.sql');
  assert.ok(
    creation.index < firstDependency.index,
    `${creation.name} must run before ${firstDependency.name}`,
  );
});

test('profiles bootstrap preserves the proven transitional identity contract', () => {
  const bootstrap = stripLineComments(
    readMigration('20260706_public_profiles_bootstrap.sql'),
  );
  const bridge = stripLineComments(
    readMigration('20260707_vvip_tiger_auth_profile_bridge.sql'),
  );
  const resolver = stripLineComments(
    readMigration('20260710_vvip_tiger_atomic_profile_resolver_rpc.sql'),
  );

  assert.match(bootstrap, /create\s+extension\s+if\s+not\s+exists\s+pgcrypto/i);
  assert.match(
    bootstrap,
    /\bid\s+uuid\s+not\s+null\s+default\s+gen_random_uuid\s*\(\s*\)\s+primary\s+key/i,
  );
  assert.doesNotMatch(bootstrap, /\bid\b[^,;]*references\s+auth\.users/i);
  assert.match(bootstrap, /\bsuperior_id\s+uuid\s+references\s+public\.profiles\s*\(\s*id\s*\)/i);
  assert.match(bootstrap, /\bcreated_at\s+timestamp\s+with\s+time\s+zone\s+not\s+null\s+default\s+now\s*\(\s*\)/i);
  assert.doesNotMatch(bootstrap, /\bclerk_user_id\b/i);

  assert.match(bridge, /add\s+column\s+if\s+not\s+exists\s+clerk_user_id\s+text\s*;/i);
  assert.match(
    bridge,
    /create\s+unique\s+index[^;]+on\s+public\.profiles\s*\(\s*clerk_user_id\s*\)[^;]+where\s+clerk_user_id\s+is\s+not\s+null/is,
  );

  const insertColumns = resolver.match(/insert\s+into\s+public\.profiles\s*\(([^)]+)\)/i);
  assert.notEqual(insertColumns, null, 'resolver must insert into public.profiles');
  assert.doesNotMatch(insertColumns[1], /\bid\b/i, 'profiles.id must retain its UUID default');
});

test('profiles migrations end with Clerk-scoped RLS and no open policy', () => {
  const bootstrap = stripLineComments(
    readMigration('20260706_public_profiles_bootstrap.sql'),
  );
  const profileMigrations = migrationFiles
    .filter((name) => /profile/i.test(name))
    .map(readMigration)
    .map(stripLineComments)
    .join('\n');

  assert.doesNotMatch(bootstrap, /\bgrant\b|\bcreate\s+policy\b/i);
  assert.match(profileMigrations, /alter\s+table\s+public\.profiles\s+enable\s+row\s+level\s+security/i);
  assert.match(profileMigrations, /auth\.jwt\s*\(\s*\)\s*->>\s*'sub'/i);
  assert.doesNotMatch(profileMigrations, /\bto\s+anon\b/i);
  assert.doesNotMatch(profileMigrations, /\bservice_role\b/i);
  assert.doesNotMatch(profileMigrations, /(?:using|with\s+check)\s*\(\s*true\s*\)/i);
});
