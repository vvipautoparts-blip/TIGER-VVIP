'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createOneFieldRuntimeController } = require('../scripts/discovery/one-field-runtime-controller.js');

test('older intent cannot overwrite newer results', async () => {
  const pending = new Map();
  const renders = [];
  const states = [];
  const controller = createOneFieldRuntimeController({
    orchestrator: {
      run: ({ text }) => new Promise((resolve) => pending.set(text, resolve))
    },
    view: {
      setState: (state) => states.push(state.kind),
      renderResult: (value) => renders.push(value.intentText)
    }
  });

  const first = controller.submit({ text: 'الأول', locale: 'ar', context: Object.freeze({}) });
  const second = controller.submit({ text: 'الثاني', locale: 'ar', context: Object.freeze({}) });

  pending.get('الثاني')({ status: 'results', intentText: 'الثاني', organic: [], sponsored: [] });
  await second;
  pending.get('الأول')({ status: 'results', intentText: 'الأول', organic: [], sponsored: [] });
  await first;

  assert.deepEqual(renders, ['الثاني']);
  assert.equal(states.at(-1), 'results');
});

test('orchestrator failure yields error state and never fake success rendering', async () => {
  const states = [];
  const renders = [];
  const controller = createOneFieldRuntimeController({
    orchestrator: {
      run: async () => { throw new Error('PRIVATE_UPSTREAM_DETAIL'); }
    },
    view: {
      setState: (state) => states.push(state),
      renderResult: (value) => renders.push(value)
    }
  });

  const result = await controller.submit({ text: 'بحث صحيح', locale: 'ar', context: Object.freeze({}) });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'ONE_FIELD_RUNTIME_FAILED');
  assert.equal(states.at(-1).kind, 'error');
  assert.equal(states.at(-1).code, 'ONE_FIELD_RUNTIME_FAILED');
  assert.equal(JSON.stringify(states).includes('PRIVATE_UPSTREAM_DETAIL'), false);
  assert.deepEqual(renders, []);
});

test('empty and degraded runtime statuses are surfaced truthfully', async () => {
  for (const status of ['empty', 'degraded']) {
    const states = [];
    const renders = [];
    const controller = createOneFieldRuntimeController({
      orchestrator: {
        run: async () => Object.freeze({ status, organic: Object.freeze([]), sponsored: Object.freeze([]) })
      },
      view: {
        setState: (state) => states.push(state.kind),
        renderResult: (value) => renders.push(value.status)
      }
    });

    const result = await controller.submit({ text: 'نية', locale: 'ar', context: Object.freeze({}) });
    assert.equal(result.ok, true);
    assert.equal(states.at(-1), status);
    assert.deepEqual(renders, [status]);
  }
});

test('cancelled request is silent and cannot emit user-facing error', async () => {
  const states = [];
  let rejectPending;
  const controller = createOneFieldRuntimeController({
    orchestrator: {
      run: ({ signal }) => new Promise((_resolve, reject) => {
        rejectPending = () => {
          const error = new Error('AbortError');
          error.name = 'AbortError';
          reject(error);
        };
        if (signal && typeof signal.addEventListener === 'function') {
          signal.addEventListener('abort', rejectPending, { once: true });
        }
      })
    },
    view: {
      setState: (state) => states.push(state.kind),
      renderResult() {}
    }
  });

  const pending = controller.submit({ text: 'نية ملغاة', locale: 'ar', context: Object.freeze({}) });
  controller.cancel();
  if (rejectPending) rejectPending();
  const result = await pending;

  assert.equal(result.ok, false);
  assert.equal(result.code, 'ONE_FIELD_RUNTIME_CANCELLED');
  assert.equal(states.includes('error'), false);
});
