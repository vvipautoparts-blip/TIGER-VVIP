"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ERD_PATH = path.join(ROOT, "docs/owner-control/p07/P07_DATABASE_ERD.mmd");
const DICT_PATH = path.join(ROOT, "docs/owner-control/p07/P07_DATA_DICTIONARY.json");
const COVERAGE_PATH = path.join(ROOT, "docs/owner-control/p07/P07_COVERAGE_MATRIX.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeEntity(name) {
  return String(name || "").trim().toLowerCase();
}

function parseErdEntitiesAndRelations(content) {
  const entities = new Set();
  const relations = [];

  for (const line of content.split(/\r?\n/)) {
    const rel = line.match(/^\s*([A-Z0-9_]+)\s+[|}{o-]+\s+([A-Z0-9_]+)\s*:\s*(.+)\s*$/);
    if (rel) {
      relations.push({
        from: normalizeEntity(rel[1]),
        to: normalizeEntity(rel[2]),
        label: rel[3].trim().toLowerCase()
      });
    }

    const ent = line.match(/^\s*([A-Z0-9_]+)\s*\{$/);
    if (ent) entities.add(normalizeEntity(ent[1]));
  }

  return { entities, relations };
}

(function main() {
  const erd = fs.readFileSync(ERD_PATH, "utf8");
  const dict = JSON.parse(fs.readFileSync(DICT_PATH, "utf8"));
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, "utf8"));

  const erdParsed = parseErdEntitiesAndRelations(erd);
  const dictEntities = new Map(dict.entities.map((e) => [normalizeEntity(e.name), e]));

  // 1) every entity in dictionary exists in ERD
  for (const name of dictEntities.keys()) {
    assert(erdParsed.entities.has(name), `dictionary entity missing in ERD: ${name}`);
  }

  // 2) every relation in ERD exists in dictionary relationships
  const dictRelKeys = new Set((dict.relationships || []).map((r) => `${normalizeEntity(r.from)}->${normalizeEntity(r.to)}:${String(r.label || "").trim().toLowerCase()}`));
  for (const r of erdParsed.relations) {
    const key = `${r.from}->${r.to}:${r.label}`;
    assert(dictRelKeys.has(key), `ERD relation missing in dictionary relationships: ${key}`);
  }

  // 3) no orphan entities: every entity must have a relationship in or out
  const linked = new Set();
  for (const r of (dict.relationships || [])) {
    linked.add(normalizeEntity(r.from));
    linked.add(normalizeEntity(r.to));
  }
  for (const name of dictEntities.keys()) {
    assert(linked.has(name), `orphan entity without relationships: ${name}`);
  }

  // 4) every FK points to existing entity/column
  for (const [name, entity] of dictEntities.entries()) {
    const ownColumns = new Set((entity.columns || []).map((c) => c.name));
    for (const fk of (entity.foreign_keys || [])) {
      assert(ownColumns.has(fk.column), `FK column missing in entity ${name}: ${fk.column}`);
      const refEntity = dictEntities.get(normalizeEntity(fk.ref_entity));
      assert(refEntity, `FK references unknown entity from ${name}: ${fk.ref_entity}`);
      const refCols = new Set((refEntity.columns || []).map((c) => c.name));
      assert(refCols.has(fk.ref_column), `FK references unknown column ${fk.ref_entity}.${fk.ref_column}`);
    }
  }

  // 5) lifecycle states documented for each entity
  for (const [name, entity] of dictEntities.entries()) {
    assert(Array.isArray(entity.lifecycle_states) && entity.lifecycle_states.length > 0, `missing lifecycle states for ${name}`);
  }

  // 6) roadmap requirement links in coverage matrix
  assert(Array.isArray(coverage.coverage) && coverage.coverage.length >= 37, "coverage matrix must include all roadmap requirements");
  for (let i = 1; i <= 37; i += 1) {
    const row = coverage.coverage.find((x) => x.id === i);
    assert(row, `missing requirement id in coverage matrix: ${i}`);
    assert(Array.isArray(row.artifacts) && row.artifacts.length > 0, `requirement ${i} missing artifacts`);
    assert(Array.isArray(row.tests) && row.tests.length > 0, `requirement ${i} missing tests`);
  }

  // extra quality counters for reportability
  const fkCount = dict.entities.reduce((acc, e) => acc + (e.foreign_keys || []).length, 0);
  const uqCount = dict.entities.reduce((acc, e) => acc + (e.unique_constraints || []).length, 0);
  const ckCount = dict.entities.reduce((acc, e) => acc + (e.check_constraints || []).length, 0);
  const idxCount = dict.entities.reduce((acc, e) => acc + (e.indexes || []).length, 0);
  const relCount = (dict.relationships || []).length;

  console.log(JSON.stringify({
    test: "PR72 ERD-DICTIONARY INTEGRITY PASS",
    entities: dict.entities.length,
    relationships: relCount,
    foreign_keys: fkCount,
    unique_constraints: uqCount,
    check_constraints: ckCount,
    indexes: idxCount
  }));
}());
