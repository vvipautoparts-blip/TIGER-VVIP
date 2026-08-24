import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const registryText = fs.readFileSync(path.join(root, 'docs/architecture/OWNER_AUTHORITY_REGISTRY.md'), 'utf8');

const { validateProjectControlImport } = await import('../project-control/scripts/project_control_import_guard.mjs');

const localUrl = 'postgresql://user:secret@127.0.0.1:5432/tiger_dev';
const remoteUrl = 'postgresql://user:secret@db.example.internal:5432/tiger_dev';

test('project-control import preflight is fail-closed for target, host, and authority', () => {
  assert.throws(
    () => validateProjectControlImport({ target: 'production', databaseUrl: localUrl, allowedHosts: '', registryText }),
    /PROJECT_CONTROL_IMPORT_TARGET_DENIED/
  );

  assert.throws(
    () => validateProjectControlImport({ target: 'staging', databaseUrl: localUrl, allowedHosts: '', registryText }),
    /PROJECT_CONTROL_IMPORT_TARGET_DENIED/
  );

  assert.throws(
    () => validateProjectControlImport({ target: 'development', databaseUrl: remoteUrl, allowedHosts: '', registryText }),
    /PROJECT_CONTROL_IMPORT_HOST_DENIED/
  );

  assert.throws(
    () => validateProjectControlImport({ target: 'development', databaseUrl: localUrl, allowedHosts: '', registryText: '' }),
    /PROJECT_CONTROL_IMPORT_AUTHORITY_CONTRACT_MISSING/
  );

  assert.doesNotThrow(() =>
    validateProjectControlImport({ target: 'development', databaseUrl: localUrl, allowedHosts: '', registryText })
  );

  assert.doesNotThrow(() =>
    validateProjectControlImport({
      target: 'development',
      databaseUrl: remoteUrl,
      allowedHosts: 'db.example.internal',
      registryText,
    })
  );
});
