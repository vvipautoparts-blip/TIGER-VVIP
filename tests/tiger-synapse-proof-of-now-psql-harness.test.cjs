"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BEHAVIOR_SQL = path.join(ROOT, "tests/sql/tiger-synapse-proof-of-now.sql");

function dollarQuotedBodies(source) {
  const bodies = [];
  const opener = /\$([A-Za-z_][A-Za-z0-9_]*)?\$/g;
  let match;

  while ((match = opener.exec(source)) !== null) {
    const tag = match[0];
    const bodyStart = opener.lastIndex;
    const bodyEnd = source.indexOf(tag, bodyStart);
    if (bodyEnd === -1) break;
    bodies.push(source.slice(bodyStart, bodyEnd));
    opener.lastIndex = bodyEnd + tag.length;
  }

  return bodies;
}

test("S4 psql rehearsal never interpolates client variables inside dollar-quoted PL/pgSQL", () => {
  const sql = fs.readFileSync(BEHAVIOR_SQL, "utf8");
  const bodies = dollarQuotedBodies(sql);

  assert.ok(bodies.length > 0, "PROOF_PLSQL_BLOCK_MISSING");
  for (const body of bodies) {
    assert.doesNotMatch(
      body,
      /:'?[A-Za-z_][A-Za-z0-9_]*/,
      "PROOF_PSQL_VARIABLE_INSIDE_DOLLAR_QUOTED_BLOCK",
    );
  }
});
