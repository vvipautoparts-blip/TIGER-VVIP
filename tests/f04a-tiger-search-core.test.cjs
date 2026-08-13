const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const corePath = path.join(root, 'scripts/fusion/search/tiger-search-core.js');
const configPath = path.join(root, 'config/fusion/search-language-aliases.json');

function load() {
  assert.equal(fs.existsSync(corePath), true, 'TIGER Search Core must exist');
  assert.equal(fs.existsSync(configPath), true, 'search alias config must exist');
  return {
    core: require(corePath),
    config: JSON.parse(fs.readFileSync(configPath, 'utf8'))
  };
}

const documents = [
  {
    id: 'm2020-amman', eligible: true, title: 'Mercedes E-Class 2020', description: 'سيارة بحالة ممتازة',
    brand: 'Mercedes', year: 2020, location: 'Amman', category: 'cars', tags: ['مرسيدس', 'سيدان']
  },
  {
    id: 'mention-only', eligible: true, title: 'مركز صيانة أوروبي', description: 'خبرة في مرسيدس وبي ام دبليو موديلات متعددة ومنها 2020 في عمان',
    brand: 'Other', year: 2024, location: 'Amman', category: 'services', tags: ['صيانة']
  },
  {
    id: 'hidden-perfect', eligible: false, title: 'Mercedes 2020 Amman', description: 'hidden',
    brand: 'Mercedes', year: 2020, location: 'Amman', category: 'cars', tags: ['مرسيدس']
  },
  {
    id: 'm2021-dubai', eligible: true, title: 'مرسيدس C200 2021', description: 'خليجي',
    brand: 'Mercedes', year: 2021, location: 'Dubai', category: 'cars', tags: ['Mercedes']
  }
];

test('normalizes Arabic diacritics, tatweel, and common Alef/Ya variants', () => {
  const { core } = load();
  assert.equal(core.normalizeText('عَمّــان'), 'عمان');
  assert.equal(core.normalizeText('إعلان إلى أعلى'), 'اعلان الي اعلي');
});

test('extracts bilingual structured intent from Arabic marketplace query', () => {
  const { core, config } = load();
  const intent = core.extractIntent('مرسيديز 2020 عمّان', config);
  assert.equal(intent.brand, 'Mercedes');
  assert.equal(intent.year, 2020);
  assert.equal(intent.location, 'Amman');
});

test('exact structured brand year location outranks description-only mention', () => {
  const { core, config } = load();
  const result = core.searchDocuments('مرسيدس 2020 عمان', documents, config, { limit: 10 });
  assert.equal(result.results[0].id, 'm2020-amman');
  assert.ok(result.results[0].score > result.results.find((item) => item.id === 'mention-only').score);
  assert.equal(result.results.some((item) => item.id === 'hidden-perfect'), false);
});

test('English query matches canonical data backed by Arabic aliases', () => {
  const { core, config } = load();
  const result = core.searchDocuments('Mercedes Amman 2020', documents, config, { limit: 10 });
  assert.equal(result.results[0].id, 'm2020-amman');
});

test('semantic assist cannot resurrect an ineligible document', () => {
  const { core, config } = load();
  const result = core.searchDocuments('Mercedes 2020 Amman', documents, config, {
    limit: 10,
    semanticScores: { 'hidden-perfect': 1000, 'm2020-amman': 0.1 }
  });
  assert.equal(result.results.some((item) => item.id === 'hidden-perfect'), false);
});

test('typeahead is concise and bounded to five suggestions', () => {
  const { core, config } = load();
  const suggestions = core.suggestTypeahead('مر', documents.concat([
    { id: 'x1', eligible: true, title: 'مراتب فاخرة', description: '', category: 'home', tags: [] },
    { id: 'x2', eligible: true, title: 'مرايا سيارات', description: '', category: 'cars', tags: [] },
    { id: 'x3', eligible: true, title: 'مركز طبي', description: '', category: 'health', tags: [] },
    { id: 'x4', eligible: true, title: 'مرسيدس GLC', description: '', category: 'cars', tags: [] },
    { id: 'x5', eligible: true, title: 'مراوح صناعية', description: '', category: 'industry', tags: [] },
    { id: 'x6', eligible: true, title: 'مركبات تجارية', description: '', category: 'cars', tags: [] }
  ]), config);
  assert.ok(suggestions.length <= 5);
  assert.ok(suggestions.length > 0);
});

test('zero-result rescue proposes bounded recovery without inventing a result', () => {
  const { core, config } = load();
  const intent = core.extractIntent('مرسدس 2035 عمان', config);
  const rescue = core.buildZeroResultRescue('مرسدس 2035 عمان', intent, documents, config);
  assert.ok(Array.isArray(rescue.suggestions));
  assert.ok(rescue.suggestions.length <= 5);
  assert.equal(Object.prototype.hasOwnProperty.call(rescue, 'fakeResult'), false);
});

test('search result includes explainable score reasons and a bounded limit', () => {
  const { core, config } = load();
  const result = core.searchDocuments('Mercedes', documents, config, { limit: 9999 });
  assert.ok(result.results.length <= 100);
  assert.ok(result.results.every((item) => Array.isArray(item.reasons)));
});
