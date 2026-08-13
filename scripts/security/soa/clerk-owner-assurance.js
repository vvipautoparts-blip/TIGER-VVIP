function frozen(value) { return Object.freeze(value); }

export function collectClerkOwnerEvidence(clerk) {
  const user = clerk && typeof clerk === 'object' ? clerk.user : null;
  const session = clerk && typeof clerk === 'object' ? clerk.session : null;
  const clerkUserId = typeof user?.id === 'string' && user.id.trim() ? user.id.trim() : null;
  const sessionId = typeof session?.id === 'string' && session.id.trim() ? session.id.trim() : null;
  const sessionAuthenticated = clerk?.loaded !== false && Boolean(clerkUserId && sessionId);
  return frozen({
    advisoryOnly: true,
    sovereignAuthorized: false,
    assuranceLevel: 'BROWSER_ADVISORY',
    clerkUserId,
    sessionId,
    sessionAuthenticated,
    passkeyEnrollmentHint: Array.isArray(user?.passkeys) && user.passkeys.length > 0,
    totpEnrollmentHint: user?.totpEnabled === true,
  });
}

export function createClerkOwnerAssuranceAdapter({ getClerk = () => globalThis.Clerk, waitForClerk = null } = {}) {
  return frozen({
    async read() {
      let clerk = typeof getClerk === 'function' ? getClerk() : null;
      if (!clerk && typeof waitForClerk === 'function') {
        try { clerk = await waitForClerk(); } catch { clerk = null; }
      }
      return collectClerkOwnerEvidence(clerk);
    }
  });
}
