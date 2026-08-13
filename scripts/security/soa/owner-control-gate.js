const MODES = Object.freeze(['LOCKED','RESTRICTED','REVERIFY','RECOVERY','READY','LOCAL_PREVIEW']);

function frozen(value) { return Object.freeze(value); }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }

export function resolveOwnerUiGateDecision({ evidence = null, serverState = null, localPreview = false } = {}) {
  if (localPreview === true) {
    return frozen({ mode:'LOCAL_PREVIEW', code:'OWNER_LOCAL_PREVIEW_ONLY', canRender:true, sovereignAuthorized:false });
  }
  if (!evidence || evidence.advisoryOnly !== true || evidence.sessionAuthenticated !== true
      || !nonEmpty(evidence.clerkUserId) || !nonEmpty(evidence.sessionId)) {
    return frozen({ mode:'LOCKED', code:'ERR_OWNER_BROWSER_SESSION_REQUIRED', canRender:false, sovereignAuthorized:false });
  }
  if (!serverState || serverState.source !== 'SOA_SERVER_VERIFIED'
      || serverState.clerkUserId !== evidence.clerkUserId
      || serverState.sessionId !== evidence.sessionId) {
    return frozen({ mode:'LOCKED', code:'ERR_OWNER_SERVER_CONFIRMATION_REQUIRED', canRender:false, sovereignAuthorized:false });
  }
  if (serverState.killSwitch !== false) {
    return frozen({ mode:'LOCKED', code:'ERR_OWNER_KILL_SWITCH', canRender:false, sovereignAuthorized:false });
  }
  if ((serverState.recoveryState !== 'NONE' && serverState.recoveryState !== 'COMPLETED')
      || serverState.holdState !== 'CLEAR') {
    return frozen({ mode:'RECOVERY', code:'ERR_OWNER_RECOVERY_PENDING', canRender:false, sovereignAuthorized:false });
  }
  if (serverState.authorityStatus !== 'ACTIVE') {
    return frozen({ mode:'RESTRICTED', code:'ERR_OWNER_AUTHORITY_INACTIVE', canRender:false, sovereignAuthorized:false });
  }
  if (serverState.requiresReverification === true) {
    return frozen({ mode:'REVERIFY', code:'ERR_OWNER_REVERIFICATION_REQUIRED', canRender:false, sovereignAuthorized:false });
  }
  if (serverState.allowed !== true) {
    return frozen({ mode:'LOCKED', code: nonEmpty(serverState.code) ? serverState.code : 'ERR_OWNER_ACCESS_DENIED', canRender:false, sovereignAuthorized:false });
  }
  return frozen({ mode:'READY', code:'OWNER_SERVER_CONFIRMED', canRender:true, sovereignAuthorized:true });
}

const AR_MESSAGES = Object.freeze({
  LOCKED: 'يتطلب الدخول تحقق المالك الآمن.',
  RESTRICTED: 'صلاحية المالك مقيّدة حاليًا.',
  REVERIFY: 'يلزم تأكيد الهوية قبل متابعة مركز المالك.',
  RECOVERY: 'الحساب في وضع استرداد محمي. الإجراءات السيادية متوقفة.',
  READY: '',
  LOCAL_PREVIEW: '',
});

export function applyOwnerUiGate(root, decision) {
  if (!root || typeof root.querySelector !== 'function' || !decision || !MODES.includes(decision.mode)) return false;
  const gate = root.querySelector('[data-owner-auth-gate]');
  const consoleRoot = root.querySelector('[data-owner-console]');
  const disclosure = root.querySelector('[data-owner-local-disclosure]');
  if (gate) {
    gate.hidden = decision.canRender === true;
    gate.textContent = AR_MESSAGES[decision.mode] || AR_MESSAGES.LOCKED;
    gate.dataset.soaState = decision.mode.toLowerCase();
  }
  if (consoleRoot) {
    consoleRoot.hidden = decision.canRender !== true;
    consoleRoot.dataset.soaState = decision.mode.toLowerCase();
  }
  if (disclosure) disclosure.hidden = decision.mode !== 'LOCAL_PREVIEW';
  return decision.canRender === true;
}

export function createOwnerControlGate({ root, loadServerState } = {}) {
  return frozen({
    async verify({ evidence = null, localPreview = false } = {}) {
      if (localPreview === true) {
        const decision = resolveOwnerUiGateDecision({ localPreview:true });
        applyOwnerUiGate(root, decision);
        return decision;
      }
      let serverState = null;
      if (typeof loadServerState === 'function') {
        try { serverState = await loadServerState(frozen({ clerkUserId:evidence?.clerkUserId || null, sessionId:evidence?.sessionId || null })); }
        catch { serverState = null; }
      }
      const decision = resolveOwnerUiGateDecision({ evidence, serverState });
      applyOwnerUiGate(root, decision);
      return decision;
    }
  });
}

export const OWNER_UI_MODES = MODES;
