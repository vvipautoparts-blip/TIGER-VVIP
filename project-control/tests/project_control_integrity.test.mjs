import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const csvRows = (relative) => readText(relative).trim().split(/\r?\n/).filter(Boolean);

const manifest = readJson('data/manifest.json');
const phases = readJson('data/phases.json');
const tasks = readJson('data/tasks.json');
const dependencies = readJson('data/task_dependencies.json');

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function hasCycle(taskCodes, edges) {
  const graph = new Map(taskCodes.map(code => [code, []]));
  for (const edge of edges) graph.get(edge.depends_on_task_code)?.push(edge.task_code);
  const state = new Map(taskCodes.map(code => [code, 0]));
  const visit = (node) => {
    if (state.get(node) === 1) return true;
    if (state.get(node) === 2) return false;
    state.set(node, 1);
    for (const next of graph.get(node) ?? []) if (visit(next)) return true;
    state.set(node, 2);
    return false;
  };
  return taskCodes.some(visit);
}

test('canonical counts and identifiers are internally consistent', () => {
  assert.equal(phases.length, manifest.counts.phases);
  assert.equal(tasks.length, manifest.counts.tasks);
  assert.equal(dependencies.length, manifest.counts.dependencies);
  assertUnique(phases.map(item => item.code), 'phase codes');
  assertUnique(tasks.map(item => item.code), 'task codes');
  assertUnique(tasks.map(item => item.order), 'task order values');
});

test('dependencies reference existing tasks and remain acyclic', () => {
  const codes = new Set(tasks.map(item => item.code));
  for (const edge of dependencies) {
    assert.ok(codes.has(edge.task_code), `missing task ${edge.task_code}`);
    assert.ok(codes.has(edge.depends_on_task_code), `missing dependency ${edge.depends_on_task_code}`);
    assert.notEqual(edge.task_code, edge.depends_on_task_code);
  }
  assert.equal(hasCycle([...codes], dependencies), false, 'dependency graph must be acyclic');
});

test('all operational registers contain real records', () => {
  for (const file of [
    'data/decision_log.csv',
    'data/risk_register.csv',
    'data/vendor_register.csv',
    'data/launch_gate_register.csv',
    'data/artifact_register.csv',
    'data/strategic_backlog.csv',
  ]) {
    assert.ok(csvRows(file).length > 1, `${file} must contain data rows`);
  }
});

test('global execution documents and control datasets exist', () => {
  for (const file of [
    'docs/GLOBAL_EXECUTION_CHARTER_AR.md',
    'docs/FAITH_AND_CULTURAL_INTEGRITY_POLICY_AR.md',
    'docs/GLOBAL_SEARCH_EXPERIENCE_SPEC_AR.md',
    'docs/GLOBAL_SCALE_AND_SLO_SPEC_AR.md',
    'data/country_capability_matrix.csv',
    'data/global_scale_targets.json',
    'data/search_facets.json',
    'data/requirements_catalog.json',
  ]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`);
  }
});

test('database schema covers the complete control plane', () => {
  const schema = readText('database/001_project_control_schema.sql');
  for (const table of [
    'requirements', 'requirement_links', 'vendors', 'launch_gates',
    'strategic_backlog', 'country_capabilities', 'scale_targets',
    'search_facets', 'test_cases', 'evidence_records'
  ]) {
    assert.match(schema, new RegExp(`project_control\\.${table}\\s*\\(`), `missing table ${table}`);
  }
});


test('artifact registry covers generated files with matching hashes', () => {
  const rows = readText('data/artifact_register.csv').trim().split(/\r?\n/).slice(1);
  assert.ok(rows.length > 20, 'artifact registry must be populated');
  for (const line of rows) {
    const columns = line.replace(/^\uFEFF/, '').split(',');
    const relative = columns[4];
    const expectedHash = columns[6];
    const target = path.join(root, relative);
    assert.ok(fs.existsSync(target), `artifact path missing: ${relative}`);
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    assert.equal(actualHash, expectedHash, `artifact hash mismatch: ${relative}`);
  }
});
