(function (root, factory) {
  "use strict";

  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGEROneFieldRuntimeController = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  function frozen(value) {
    return Object.freeze(value);
  }

  function state(kind, code) {
    return frozen({ kind: kind, code: code || null });
  }

  function isAbort(error) {
    return Boolean(error && (error.name === "AbortError" || error.code === "ABORT_ERR"));
  }

  function createOneFieldRuntimeController(options) {
    const source = options && typeof options === "object" ? options : {};
    const orchestrator = source.orchestrator;
    const view = source.view;

    if (!orchestrator || typeof orchestrator.run !== "function") {
      throw new TypeError("ONE_FIELD_RUNTIME_ORCHESTRATOR_REQUIRED");
    }
    if (!view || typeof view.setState !== "function" || typeof view.renderResult !== "function") {
      throw new TypeError("ONE_FIELD_RUNTIME_VIEW_REQUIRED");
    }

    let generation = 0;
    let activeAbort = null;

    function makeAbortController() {
      const AbortCtor = root && typeof root.AbortController === "function"
        ? root.AbortController
        : null;
      return AbortCtor ? new AbortCtor() : null;
    }

    function cancel() {
      generation += 1;
      if (activeAbort) {
        try { activeAbort.abort(); } catch (_) {}
        activeAbort = null;
      }
      return frozen({ ok: false, code: "ONE_FIELD_RUNTIME_CANCELLED" });
    }

    async function submit(request) {
      const activeGeneration = ++generation;

      if (activeAbort) {
        try { activeAbort.abort(); } catch (_) {}
      }
      const abortController = makeAbortController();
      activeAbort = abortController;

      view.setState(state("interpreting"));
      view.setState(state("discovering"));

      try {
        const input = request && typeof request === "object" ? request : {};
        const result = await orchestrator.run(frozen({
          text: input.text,
          locale: input.locale,
          context: input.context && typeof input.context === "object" ? input.context : frozen({}),
          signal: abortController ? abortController.signal : undefined
        }));

        if (activeGeneration !== generation || (abortController && abortController.signal.aborted)) {
          return frozen({ ok: false, code: "ONE_FIELD_RUNTIME_CANCELLED" });
        }

        const kind = result && (result.status === "results" || result.status === "empty" || result.status === "degraded")
          ? result.status
          : "error";
        if (kind === "error") {
          view.setState(state("error", "ONE_FIELD_RUNTIME_FAILED"));
          return frozen({ ok: false, code: "ONE_FIELD_RUNTIME_FAILED" });
        }

        view.setState(state(kind));
        view.renderResult(result);
        return frozen({ ok: true, value: result });
      } catch (error) {
        if (activeGeneration !== generation || isAbort(error) || (abortController && abortController.signal.aborted)) {
          return frozen({ ok: false, code: "ONE_FIELD_RUNTIME_CANCELLED" });
        }
        view.setState(state("error", "ONE_FIELD_RUNTIME_FAILED"));
        return frozen({ ok: false, code: "ONE_FIELD_RUNTIME_FAILED" });
      } finally {
        if (activeGeneration === generation && activeAbort === abortController) {
          activeAbort = null;
        }
      }
    }

    return frozen({
      submit: submit,
      cancel: cancel
    });
  }

  return frozen({
    createOneFieldRuntimeController: createOneFieldRuntimeController
  });
});
