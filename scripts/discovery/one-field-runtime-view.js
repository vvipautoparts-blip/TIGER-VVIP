(function (root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && typeof root === "object") root.TIGEROneFieldRuntimeView = api;

  if (root && root.document && typeof root.addEventListener === "function") {
    root.addEventListener("DOMContentLoaded", function () {
      api.bootOneFieldRuntime().catch(function () {
        const status = root.document.querySelector("[data-one-field-runtime-status]");
        const surface = root.document.querySelector("[data-one-field-runtime]");
        if (surface) surface.setAttribute("data-state", "error");
        if (status) status.textContent = "تعذر تشغيل البحث الموحّد الآن. حاول مرة أخرى لاحقًا.";
      });
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const FIT_COPY = Object.freeze({
    matches_product_family: "يطابق نوع ما طلبته",
    matches_no_added_sugar: "يطابق شرط بدون سكر",
    matches_requested_geography: "يطابق الموقع المطلوب",
    matches_eligible_persona_kind: "من جهة مناسبة لطلبك",
    matches_requested_condition: "يطابق الحالة المطلوبة",
    matches_availability: "متاح وفق البيانات الظاهرة",
    matches_freshness: "بياناته حديثة وفق المصدر",
    matches_trust_requirement: "يطابق متطلبات الثقة"
  });

  function frozen(value) {
    return Object.freeze(value);
  }

  function cleanText(value, maximum) {
    return String(value == null ? "" : value)
      .replace(/[<>\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maximum);
  }

  function hashString(value) {
    let hash = 2166136261;
    const source = String(value == null ? "" : value);
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function semanticId(prefix, seed) {
    return prefix + hashString(seed);
  }

  function requiredApis(scope) {
    const target = scope || root || {};
    const apis = {
      semanticCore: target.TIGEROneFieldSemanticCore,
      intentScene: target.TIGEROneFieldIntentScene,
      semanticCapsule: target.TIGEROneFieldSemanticCapsule,
      hybrid: target.TIGEROneFieldHybridRetrieval,
      fitFacets: target.TIGEROneFieldFitFacets,
      adapters: target.TIGEROneFieldRuntimeAdapters,
      orchestrator: target.TIGEROneFieldRuntimeOrchestrator,
      controller: target.TIGEROneFieldRuntimeController
    };

    if (!apis.semanticCore || typeof apis.semanticCore.parseAcceptanceIntent !== "function"
      || !apis.intentScene || typeof apis.intentScene.createIntentFrame !== "function"
      || !apis.semanticCapsule || typeof apis.semanticCapsule.createSemanticCapsule !== "function"
      || !apis.hybrid || typeof apis.hybrid.retrieveCandidates !== "function"
      || !apis.fitFacets || typeof apis.fitFacets.createFitExplanation !== "function"
      || !apis.adapters || typeof apis.adapters.createMarketplaceCandidateAdapter !== "function"
      || !apis.orchestrator || typeof apis.orchestrator.createOneFieldRuntimeOrchestrator !== "function"
      || !apis.controller || typeof apis.controller.createOneFieldRuntimeController !== "function") {
      throw new TypeError("ONE_FIELD_BROWSER_DEPENDENCY_REQUIRED");
    }
    return frozen(apis);
  }

  function createIntentInterpreter(apis) {
    return function interpret(input) {
      const request = input && typeof input === "object" ? input : {};
      const text = cleanText(request.text, 500);
      const parsed = apis.semanticCore.parseAcceptanceIntent(text);
      const frame = apis.intentScene.createIntentFrame({
        intentId: semanticId("intent_", text),
        intentType: "discover",
        productFamily: parsed.productFamily || "unknown",
        audience: parsed.audience || null,
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
        categoryPath: Array.isArray(parsed.categoryPath) ? parsed.categoryPath : [],
        primaryFacets: Array.isArray(parsed.primaryFacets) ? parsed.primaryFacets : []
      });
      const context = request.context && typeof request.context === "object" ? request.context : {};
      const countryCode = /^[A-Z]{2}$/.test(String(context.countryCode || "").toUpperCase())
        ? String(context.countryCode).toUpperCase()
        : null;
      const hardConstraints = frame.constraints.includes("no_added_sugar")
        ? [frozen({ key: "noAddedSugar", value: true })]
        : [];

      return frozen(Object.assign({}, frame, {
        text: text,
        countryCode: countryCode,
        hardConstraints: frozen(hardConstraints)
      }));
    };
  }

  function candidateSourceType(candidate) {
    if (candidate && candidate.kind === "post") return "post";
    if (candidate && candidate.kind === "listing") return "listing";
    return "entity";
  }

  function createCapsuleBuilder(apis) {
    return function buildCapsule(candidate) {
      const source = candidate && typeof candidate === "object" ? candidate : {};
      const candidateText = [source.label, source.summary].filter(Boolean).join(" ");
      const parsed = apis.semanticCore.parseAcceptanceIntent(candidateText);
      const sourceType = candidateSourceType(source);
      const facts = source.facts && typeof source.facts === "object" ? source.facts : {};
      const country = /^[A-Z]{2}$/.test(String(facts.country || "").toUpperCase())
        ? String(facts.country).toUpperCase()
        : null;
      const location = cleanText(facts.location, 120) || null;
      const concepts = parsed.productFamily && parsed.productFamily !== "unknown"
        ? ["cpt_" + parsed.productFamily]
        : [];
      const seed = String(source.source || "source") + ":" + String(source.id || source.label || "item");
      const sourceObjectId = semanticId(sourceType + "_", seed);
      const capsule = apis.semanticCapsule.createSemanticCapsule({
        capsuleId: semanticId("capsule_", seed),
        sourceObjectId: sourceObjectId,
        sourceObjectType: sourceType,
        canonicalConcepts: concepts,
        aliases: [cleanText(source.label, 160) || sourceObjectId],
        structuredAttributes: {
          productFamily: parsed.productFamily || "unknown",
          noAddedSugar: typeof facts.noAddedSugar === "boolean" ? facts.noAddedSugar : null,
          sector: cleanText(facts.sector, 64) || null,
          source: cleanText(source.source, 64) || "unknown"
        },
        relations: [],
        multimodalRepresentations: [],
        personaId: semanticId("persona_", seed),
        domainViews: [],
        conditionState: "unknown",
        geoContext: country || location ? { country: country, location: location } : null,
        timeFreshness: null,
        availabilitySignal: "unknown",
        evidenceRefs: [],
        trustProjection: null,
        countryPolicyContext: country ? { countryCode: country } : null
      });

      return frozen(Object.assign({}, source, { capsule: capsule }));
    };
  }

  function createOrganicRanker(apis) {
    return function rankOrganic(intent, candidates) {
      const list = Array.isArray(candidates) ? candidates : [];
      const requiredConcepts = intent && intent.productFamily && intent.productFamily !== "unknown"
        ? ["cpt_" + intent.productFamily]
        : [];
      const requiredAttributes = {};
      if (intent && Array.isArray(intent.constraints) && intent.constraints.includes("no_added_sugar")) {
        requiredAttributes.noAddedSugar = true;
      }
      const signals = {};
      const byCapsule = new Map();
      for (const candidate of list) {
        if (!candidate || !candidate.capsule) continue;
        byCapsule.set(candidate.capsule.capsuleId, candidate);
        const conceptMatch = requiredConcepts.length === 0
          || requiredConcepts.every(function (concept) { return candidate.capsule.canonicalConcepts.includes(concept); });
        signals[candidate.capsule.capsuleId] = {
          semantic: conceptMatch ? 1 : 0,
          structured: Object.keys(requiredAttributes).length === 0
            ? 0.5
            : (candidate.capsule.structuredAttributes.noAddedSugar === true ? 1 : 0)
        };
      }

      const result = apis.hybrid.retrieveCandidates({
        intent: {
          requiredConcepts: requiredConcepts,
          requiredAttributes: requiredAttributes,
          countryCode: intent && intent.countryCode ? intent.countryCode : null
        },
        capsules: list.map(function (candidate) { return candidate.capsule; }),
        signals: signals
      });

      return result.items.map(function (item) { return byCapsule.get(item.capsuleId); }).filter(Boolean);
    };
  }

  function createFitBuilder(apis) {
    return function buildFit(intent, candidate) {
      const requiredConcept = intent && intent.productFamily && intent.productFamily !== "unknown"
        ? "cpt_" + intent.productFamily
        : null;
      const requiresNoSugar = Boolean(intent && Array.isArray(intent.constraints) && intent.constraints.includes("no_added_sugar"));
      return apis.fitFacets.createFitExplanation({
        itemId: candidate.id,
        matchedEvidence: {
          productFamily: requiredConcept ? candidate.capsule.canonicalConcepts.includes(requiredConcept) : false,
          noAddedSugar: requiresNoSugar && candidate.facts && candidate.facts.noAddedSugar === true
        }
      });
    };
  }

  function clear(node) {
    if (node && typeof node.replaceChildren === "function") node.replaceChildren();
  }

  function appendText(doc, parent, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    node.textContent = cleanText(text, 2000);
    parent.appendChild(node);
    return node;
  }

  function safePhoneLink(value) {
    const source = cleanText(value, 32);
    if (!/^\+?\d{7,15}$/.test(source)) return null;
    return "tel:" + source;
  }

  function renderCard(doc, item, sponsored) {
    const card = doc.createElement("article");
    card.className = "one-field-result";
    card.setAttribute("data-one-field-result-source", cleanText(item && item.source, 64) || "unknown");

    if (sponsored) {
      const badge = appendText(doc, card, "span", "one-field-result__sponsored-label", "ممول");
      badge.setAttribute("aria-label", "نتيجة ممولة");
    }

    appendText(doc, card, "h4", "", item && item.label ? item.label : "نتيجة متاحة");
    if (item && item.summary) appendText(doc, card, "p", "one-field-result__meta", item.summary);

    const reasons = item && item.fit && Array.isArray(item.fit.reasons) ? item.fit.reasons : [];
    if (reasons.length) {
      const list = doc.createElement("ul");
      list.className = "one-field-result__fit";
      list.setAttribute("aria-label", "لماذا تناسب هذه النتيجة طلبك");
      for (const reason of reasons) {
        appendText(doc, list, "li", "", FIT_COPY[reason] || reason);
      }
      card.appendChild(list);
    }

    const href = item && item.contact && item.contact.kind === "phone"
      ? safePhoneLink(item.contact.value)
      : null;
    if (href) {
      const link = appendText(doc, card, "a", "one-field-result__contact", "تواصل مباشر");
      link.href = href;
      link.setAttribute("aria-label", "تواصل مباشر مع " + cleanText(item.label, 120));
    }
    return card;
  }

  function createDomRuntimeView(doc) {
    const surface = doc.querySelector("[data-one-field-runtime]");
    const status = doc.querySelector("[data-one-field-runtime-status]");
    const organic = doc.querySelector("[data-one-field-organic-results]");
    const sponsored = doc.querySelector("[data-one-field-sponsored-results]");
    const sponsoredList = sponsored && sponsored.querySelector
      ? (sponsored.querySelector("[data-one-field-sponsored-list]") || sponsored)
      : sponsored;

    if (!surface || !status || !organic || !sponsored) {
      throw new TypeError("ONE_FIELD_HOME_SURFACE_REQUIRED");
    }

    function setState(state) {
      const kind = state && state.kind ? state.kind : "idle";
      surface.setAttribute("data-state", kind);
      const messages = {
        idle: "اكتب ما تريد بلغتك الطبيعية.",
        interpreting: "أفهم طلبك الآن…",
        discovering: "أبحث عن النتائج الأنسب لطلبك…",
        results: "هذه النتائج تطابق طلبك وفق البيانات المتاحة.",
        empty: "لم أجد نتيجة تطابق الشروط المطلوبة حاليًا.",
        degraded: "ظهرت النتائج المتاحة، لكن تعذر الوصول إلى أحد مصادر الاكتشاف.",
        error: "تعذر إكمال البحث الآن. لم يتم عرض نجاح وهمي؛ أعد المحاولة."
      };
      status.textContent = messages[kind] || messages.idle;
      surface.setAttribute("aria-busy", kind === "interpreting" || kind === "discovering" ? "true" : "false");
    }

    function renderResult(result) {
      clear(organic);
      clear(sponsoredList);
      const organicRows = result && Array.isArray(result.organic) ? result.organic : [];
      const sponsoredRows = result && Array.isArray(result.sponsored) ? result.sponsored : [];

      for (const item of organicRows) organic.appendChild(renderCard(doc, item, false));
      for (const item of sponsoredRows) sponsoredList.appendChild(renderCard(doc, item, true));
      sponsored.hidden = sponsoredRows.length === 0;
    }

    return frozen({ setState: setState, renderResult: renderResult });
  }

  function unavailableSource(name) {
    return frozen({
      name: name,
      discover: async function () { throw new Error("ONE_FIELD_SOURCE_UNAVAILABLE"); }
    });
  }

  async function createBrowserOrchestrator(scope) {
    const target = scope || root;
    const apis = requiredApis(target);
    const sources = [];
    let countryCode = null;

    try {
      const context = await target.VVIPFusionMarketplaceContext.ready();
      if (context && context.runtime && context.runtime.config) {
        const candidateCountry = String(context.runtime.config.defaultCountryCode || "").toUpperCase();
        countryCode = /^[A-Z]{2}$/.test(candidateCountry) ? candidateCountry : null;
      }
      sources.push(apis.adapters.createMarketplaceCandidateAdapter(context.repository));
    } catch (_) {
      sources.push(unavailableSource("marketplace"));
    }

    try {
      const social = target.TIGERSocialRuntime.createCurrentSocialRuntime(target);
      sources.push(apis.adapters.createSocialSearchCandidateAdapter(social.search, "people"));
      sources.push(apis.adapters.createSocialSearchCandidateAdapter(social.search, "posts"));
    } catch (_) {
      sources.push(unavailableSource("social_people"));
      sources.push(unavailableSource("social_posts"));
    }

    return frozen({
      countryCode: countryCode,
      orchestrator: apis.orchestrator.createOneFieldRuntimeOrchestrator({
        interpret: createIntentInterpreter(apis),
        organicSources: sources,
        buildCapsule: createCapsuleBuilder(apis),
        rankOrganic: createOrganicRanker(apis),
        buildFit: createFitBuilder(apis)
      }),
      controllerFactory: apis.controller.createOneFieldRuntimeController
    });
  }

  let bootPromise = null;
  function bootOneFieldRuntime() {
    if (bootPromise) return bootPromise;
    bootPromise = Promise.resolve().then(async function () {
      if (!root || !root.document) return null;
      const form = root.document.querySelector("[data-one-field-intent-form]");
      const input = root.document.querySelector("[data-one-field-intent-input]");
      if (!form || !input) return null;
      if (form.getAttribute("data-one-field-bound") === "true") return null;

      const assembly = await createBrowserOrchestrator(root);
      const view = createDomRuntimeView(root.document);
      const controller = assembly.controllerFactory({ orchestrator: assembly.orchestrator, view: view });
      form.setAttribute("data-one-field-bound", "true");

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const text = cleanText(input.value, 500);
        if (text.length < 2) {
          view.setState({ kind: "idle" });
          if (typeof input.focus === "function") input.focus();
          return;
        }
        controller.submit({
          text: text,
          locale: (root.document.documentElement && root.document.documentElement.lang) || "ar",
          context: assembly.countryCode ? { countryCode: assembly.countryCode } : {}
        });
      });

      return frozen({ controller: controller, view: view });
    }).catch(function (error) {
      bootPromise = null;
      throw error;
    });
    return bootPromise;
  }

  return frozen({
    createIntentInterpreter: createIntentInterpreter,
    createCapsuleBuilder: createCapsuleBuilder,
    createOrganicRanker: createOrganicRanker,
    createFitBuilder: createFitBuilder,
    createDomRuntimeView: createDomRuntimeView,
    createBrowserOrchestrator: createBrowserOrchestrator,
    bootOneFieldRuntime: bootOneFieldRuntime
  });
});
