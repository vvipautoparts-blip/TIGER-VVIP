#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');

const doc = fs.readFileSync('docs/security/p08-steel-shield/BACKUP_RESTORE_ROLLBACK.md', 'utf8');
assert.match(doc, /Backup checksum/i);
assert.match(doc, /Restore rehearsal/i);
assert.match(doc, /Rollback command/i);
assert.match(doc, /Evidence/i);

const incident = fs.readFileSync('docs/security/p08-steel-shield/INCIDENT_RESPONSE.md', 'utf8');
assert.match(incident, /Isolate/i);
assert.match(incident, /root-cause analysis/i);
assert.match(incident, /Preserve evidence/i);

console.log('PASS: backup/restore/rollback and incident response coverage present');
