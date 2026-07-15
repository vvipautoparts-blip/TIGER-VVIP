(function initP06OwnerControlReadonly(global) {
  "use strict";

  const STATUS_MAP = Object.freeze({
    pending: { key: "pending", labelAr: "معلق", labelEn: "Pending", tone: "muted" },
    planning: { key: "planning", labelAr: "تخطيط", labelEn: "Planning", tone: "info" },
    red: { key: "red", labelAr: "RED", labelEn: "RED", tone: "danger" },
    implementing: { key: "implementing", labelAr: "تنفيذ", labelEn: "Implementing", tone: "warning" },
    green: { key: "green", labelAr: "GREEN", labelEn: "GREEN", tone: "success" },
    preview: { key: "preview", labelAr: "معاينة", labelEn: "Preview", tone: "info" },
    pr_open: { key: "pr_open", labelAr: "PR مفتوح", labelEn: "PR Open", tone: "info" },
    reviewing: { key: "reviewing", labelAr: "مراجعة", labelEn: "Reviewing", tone: "warning" },
    merged: { key: "merged", labelAr: "مدمج", labelEn: "Merged", tone: "success" },
    post_merge_verified: { key: "post_merge_verified", labelAr: "تحقق بعد الدمج", labelEn: "Post Merge Verified", tone: "success" },
    completed: { key: "completed", labelAr: "مكتمل", labelEn: "Completed", tone: "success" },
    blocked: { key: "blocked", labelAr: "متوقف", labelEn: "Blocked", tone: "danger" },
    owner_approval_required: { key: "owner_approval_required", labelAr: "يتطلب موافقة المالك", labelEn: "Owner Approval Required", tone: "danger" }
  });

  function buildStatusBadge(status) {
    return STATUS_MAP[status] || STATUS_MAP.pending;
  }

  function safeReadOnlyFallback() {
    return Object.freeze({
      mode: "read_only",
      messageAr: "تعذر تحميل حالة المنسق. العرض الحالي للقراءة فقط.",
      messageEn: "Unable to load orchestrator state. Read-only fallback is active."
    });
  }

  function renderPhaseSummary(state) {
    const phases = Array.isArray(state && state.phases) ? state.phases : [];
    const mapped = phases.map(function mapPhase(phase) {
      const badge = buildStatusBadge(String(phase.status || "pending"));
      return {
        id: String(phase.id || ""),
        status: badge.key,
        tone: badge.tone,
        labelAr: badge.labelAr
      };
    });

    return Object.freeze({
      current: String((state && state.current_phase) || "P06"),
      next: String((state && state.next_authorized_phase) || "P06"),
      phases: mapped
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("state_fetch_failed");
    }
    return response.json();
  }

  function createCard(root) {
    const card = document.createElement("section");
    card.className = "pr40-orchestrator-card";
    card.setAttribute("data-pr40-orchestrator", "");

    const title = document.createElement("h2");
    title.textContent = "منسق التنفيذ P06-P34 (قراءة فقط)";

    const status = document.createElement("p");
    status.className = "pr40-orchestrator-status";
    status.setAttribute("data-pr40-state", "");

    const list = document.createElement("ul");
    list.className = "pr40-orchestrator-list";
    list.setAttribute("data-pr40-phases", "");

    card.append(title, status, list);
    root.append(card);
    return { status: status, list: list };
  }

  function writeState(view, summary) {
    view.status.textContent = "الحالي: " + summary.current + " | المصرح التالي: " + summary.next;
    view.list.replaceChildren();
    summary.phases.slice(0, 8).forEach(function append(item) {
      const li = document.createElement("li");
      li.className = "tone-" + item.tone;
      li.textContent = item.id + " - " + item.labelAr;
      view.list.append(li);
    });
  }

  async function mountReadOnlyOwnerControl(options) {
    const root = (options && options.root) || document.querySelector("[data-owner-console]");
    if (!root) return;

    const view = createCard(root);
    try {
      const phaseStatus = await fetchJson("docs/owner-control/phase-status.json");
      const state = await fetchJson("docs/owner-control/orchestrator/state.json");
      const phases = Array.isArray(phaseStatus.phases) ? phaseStatus.phases : [];
      const summary = renderPhaseSummary({
        current_phase: state.current_phase,
        next_authorized_phase: state.next_authorized_phase,
        phases: phases
      });
      writeState(view, summary);
    } catch (_error) {
      const fallback = safeReadOnlyFallback();
      view.status.textContent = fallback.messageAr;
      view.list.replaceChildren();
      const li = document.createElement("li");
      li.className = "tone-danger";
      li.textContent = "READ ONLY FALLBACK";
      view.list.append(li);
    }
  }

  global.VVIP_P06_OWNER_CONTROL = Object.freeze({
    buildStatusBadge: buildStatusBadge,
    safeReadOnlyFallback: safeReadOnlyFallback,
    renderPhaseSummary: renderPhaseSummary,
    mountReadOnlyOwnerControl: mountReadOnlyOwnerControl
  });

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", function onReady() {
      mountReadOnlyOwnerControl();
    });
  }
}(window));
