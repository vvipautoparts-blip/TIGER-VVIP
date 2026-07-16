#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dir = 'scripts/security/p08-steel-shield';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sh'));
const forbidden = [
  /(^|[;&|]\s*)supabase\s+link(\s|$)/im,
  /(^|[;&|]\s*)db\s+push(\s|$)/im,
  /(^|[;&|]\s*)migration\s+repair(\s|$)/im,
  /(^|[;&|]\s*)psql\s+.*(supabase|postgres)/im,
  /(^|[;&|]\s*)curl\s+.*supabase/im,
  /(^|[;&|]\s*)wget\s+.*supabase/im,
  /(^|[;&|]\s*)git\s+push(\s|$)/im,
  /(^|[;&|]\s*)gh\s+pr(\s|$)/im
];

for (const file of files) {
  const full = path.join(dir, file);
  const content = fs.readFileSync(full, 'utf8');
  for (const pattern of forbidden) {
    assert.ok(!pattern.test(content), `Forbidden remote/write command in ${file}: ${pattern}`);
  }
}

console.log('PASS: no remote write commands in shield scripts');
