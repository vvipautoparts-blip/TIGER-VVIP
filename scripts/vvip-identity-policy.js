"use strict";

(() => {
  const LEGACY_IDENTITY_PARTS = [
    "VVIP",
    "Tiger",
    "AutoParts",
    "AutoParts",
  ];

  const legacyIdentity =
    LEGACY_IDENTITY_PARTS.join(" ");

  function normalize(value) {
    return String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase("en");
  }

  function compact(value) {
    return normalize(value)
      .replace(/\s+/g, "");
  }

  function isLegacyDisplayName(value) {
    const normalized = normalize(value);
    const compacted = compact(value);

    return (
      normalized === normalize(legacyIdentity) ||
      compacted === compact(legacyIdentity)
    );
  }

  function sanitizeDisplayName(value) {
    const clean = String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();

    if (
      !clean ||
      isLegacyDisplayName(clean)
    ) {
      return "";
    }

    return clean;
  }

  function removeLegacyText(value) {
    const source = String(value ?? "");

    if (!source) {
      return source;
    }

    const words =
      LEGACY_IDENTITY_PARTS.map(
        (word) =>
          word.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
      );

    const expression = new RegExp(
      words.join("\\s*"),
      "gi"
    );

    return source
      .replace(expression, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function sanitizeElementAttributes(element) {
    if (!(element instanceof Element)) {
      return;
    }

    const attributes = [
      "aria-label",
      "title",
      "alt",
      "placeholder",
    ];

    for (const attribute of attributes) {
      if (!element.hasAttribute(attribute)) {
        continue;
      }

      const current =
        element.getAttribute(attribute);

      const sanitized =
        removeLegacyText(current);

      if (current !== sanitized) {
        if (sanitized) {
          element.setAttribute(
            attribute,
            sanitized
          );
        } else {
          element.removeAttribute(attribute);
        }
      }
    }

    if (
      element instanceof HTMLInputElement &&
      element.value
    ) {
      const sanitized =
        removeLegacyText(element.value);

      if (sanitized !== element.value) {
        element.value = sanitized;
      }
    }
  }

  function sanitizeTree(root) {
    if (!root) {
      return;
    }

    if (root instanceof Element) {
      sanitizeElementAttributes(root);
    }

    const walker =
      document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT |
          NodeFilter.SHOW_ELEMENT
      );

    let node = walker.currentNode;

    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const current =
          node.nodeValue ?? "";

        const sanitized =
          removeLegacyText(current);

        if (sanitized !== current) {
          node.nodeValue = sanitized;
        }
      } else if (
        node.nodeType === Node.ELEMENT_NODE
      ) {
        sanitizeElementAttributes(node);
      }

      node = walker.nextNode();
    }
  }

  function startProtection() {
    sanitizeTree(document.body);

    const observer = new MutationObserver(
      (mutations) => {
        for (const mutation of mutations) {
          if (
            mutation.type ===
            "characterData"
          ) {
            const current =
              mutation.target.nodeValue ??
              "";

            const sanitized =
              removeLegacyText(current);

            if (sanitized !== current) {
              mutation.target.nodeValue =
                sanitized;
            }

            continue;
          }

          for (
            const node of mutation.addedNodes
          ) {
            sanitizeTree(node);
          }
        }
      }
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  window.VVIP_IDENTITY_POLICY = Object.freeze({
    isLegacyDisplayName,
    sanitizeDisplayName,
    removeLegacyText,
    sanitizeTree,
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startProtection,
      { once: true }
    );
  } else {
    startProtection();
  }
})();
