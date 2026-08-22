(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root && typeof root === "object") {
    root.TIGEROneFieldRuntimeOrchestrator = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function frozen(value) {
    return Object.freeze(value);
  }

  function boundedText(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
  }

  function safeSourceName(value) {
    const name = boundedText(value).toLowerCase().slice(0, 64).replace(/[^a-z0-9_-]/g, "_");
    return name || "organic";
  }

  function boundedRuntimeError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  function matchesHardConstraints(intent, candidate) {
    const constraints = Array.isArray(intent && intent.hardConstraints)
      ? intent.hardConstraints
      : [];
    const facts = candidate && candidate.facts && typeof candidate.facts === "object"
      ? candidate.facts
      : {};

    return constraints.every(function (constraint) {
      return constraint && Object.prototype.hasOwnProperty.call(facts, constraint.key) && facts[constraint.key] === constraint.value;
    });
  }

  function createOneFieldRuntimeOrchestrator(options) {
    const source = options && typeof options === "object" ? options : {};
    const interpret = source.interpret;
    const buildCapsule = source.buildCapsule;
    const rankOrganic = source.rankOrganic;
    const buildFit = source.buildFit;
    const organicSources = Array.isArray(source.organicSources) ? source.organicSources.slice() : [];
    const sponsoredSource = source.sponsoredSource && typeof source.sponsoredSource.discover === "function"
      ? source.sponsoredSource
      : null;

    if (
      typeof interpret !== "function" ||
      typeof buildCapsule !== "function" ||
      typeof rankOrganic !== "function" ||
      typeof buildFit !== "function"
    ) {
      throw new TypeError("ONE_FIELD_RUNTIME_DEPENDENCY_REQUIRED");
    }

    async function run(request) {
      const input = request && typeof request === "object" ? request : {};
      const text = boundedText(input.text);
      if (!text) throw new TypeError("ONE_FIELD_INTENT_REQUIRED");

      const intent = frozen(interpret(frozen({
        text: text,
        locale: boundedText(input.locale || "ar").slice(0, 32) || "ar",
        context: input.context && typeof input.context === "object" ? input.context : frozen({})
      })));

      const candidates = [];
      const degradedSources = [];
      const configuredSourceCount = organicSources.length + (sponsoredSource ? 1 : 0);
      let successfulSourceCount = 0;

      for (const organicSource of organicSources) {
        try {
          const rows = await organicSource.discover(frozen({ intent: intent, signal: input.signal }));
          successfulSourceCount += 1;
          if (Array.isArray(rows)) {
            candidates.push.apply(candidates, rows.filter(function (candidate) {
              return candidate && candidate.sponsored !== true;
            }));
          }
        } catch (_) {
          degradedSources.push(safeSourceName(organicSource && organicSource.name));
        }
      }

      const constrained = candidates
        .filter(function (candidate) { return matchesHardConstraints(intent, candidate); })
        .map(function (candidate) { return buildCapsule(candidate); });

      const ranked = rankOrganic(intent, constrained).map(function (candidate) {
        return frozen(Object.assign({}, candidate, {
          fit: buildFit(intent, candidate)
        }));
      });

      let sponsored = [];
      if (sponsoredSource) {
        try {
          const sponsoredRows = await sponsoredSource.discover(frozen({ intent: intent, signal: input.signal }));
          successfulSourceCount += 1;
          if (Array.isArray(sponsoredRows)) {
            sponsored = sponsoredRows
              .filter(function (candidate) { return candidate && candidate.sponsored === true; })
              .map(function (candidate) { return frozen(Object.assign({}, candidate)); });
          }
        } catch (_) {
          degradedSources.push(safeSourceName(sponsoredSource && sponsoredSource.name));
        }
      }

      if (configuredSourceCount > 0 && successfulSourceCount === 0) {
        throw boundedRuntimeError("ONE_FIELD_ALL_SOURCES_UNAVAILABLE");
      }

      return frozen({
        status: degradedSources.length ? "degraded" : (ranked.length ? "results" : "empty"),
        intent: intent,
        organic: frozen(ranked.slice()),
        sponsored: frozen(sponsored.slice()),
        facets: frozen([]),
        degradedSources: frozen(degradedSources.slice())
      });
    }

    return frozen({ run: run });
  }

  return frozen({
    createOneFieldRuntimeOrchestrator: createOneFieldRuntimeOrchestrator
  });
});
