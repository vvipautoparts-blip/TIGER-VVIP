"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const dictionary = JSON.parse(fs.readFileSync(path.join(root, "docs/owner-control/p07/P07_DATA_DICTIONARY.json"), "utf8"));
const matrix = JSON.parse(fs.readFileSync(path.join(root, "docs/owner-control/p08/P08_RLS_POLICY_MATRIX.json"), "utf8"));

const expected = dictionary.entities.map((entity) => entity.name).sort();
const actual = matrix.entities.map((entity) => entity.entity).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("P08 RLS coverage must match the P07 dictionary");
for (const entity of matrix.entities) {
  const operations = entity.operations.map((operation) => operation.operation).sort();
  if (JSON.stringify(operations) !== JSON.stringify(["DELETE", "INSERT", "SELECT", "UPDATE"])) throw new Error(`P08 RLS operations incomplete for ${entity.entity}`);
}
console.log("PR76 RLS MATRIX INTEGRITY PASS");