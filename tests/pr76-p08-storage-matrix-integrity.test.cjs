"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const matrix = JSON.parse(fs.readFileSync(path.join(root, "docs/owner-control/p08/P08_STORAGE_POLICY_MATRIX.json"), "utf8"));
const expected = ["audit-artifacts", "listing-media-processed", "moderation-evidence", "profile-assets-private", "temporary-upload-quarantine", "tiger-care-attachments"];
const actual = matrix.buckets.map((bucket) => bucket.name).sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("P08 storage bucket coverage is incomplete");
if (matrix.buckets.some((bucket) => /public read/i.test(bucket.access))) throw new Error("P08 storage buckets must be private by default");
console.log("PR76 STORAGE MATRIX INTEGRITY PASS");