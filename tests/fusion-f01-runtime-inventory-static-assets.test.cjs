const test = require('node:test');
const assert = require('node:assert/strict');
const { collectStaticReferences } = require('../scripts/fusion/runtime-inventory.cjs');

test('F01 discovers bounded JavaScript asset literals', () => {
  const source = `
    const ASSETS = ['/index.html', '/styles/app.css', '/scripts/app.js', 'https://cdn.example.com/x.js'];
  `;
  assert.deepEqual(
    collectStaticReferences(source, 'sw.js'),
    ['index.html', 'scripts/app.js', 'styles/app.css']
  );
});

test('F01 discovers CSS url assets relative to the CSS file', () => {
  const source = `
    .brand { background-image: url('../icons/brand.svg'); }
    .remote { background-image: url('https://cdn.example.com/remote.png'); }
  `;
  assert.deepEqual(
    collectStaticReferences(source, 'styles/app.css'),
    ['icons/brand.svg']
  );
});
