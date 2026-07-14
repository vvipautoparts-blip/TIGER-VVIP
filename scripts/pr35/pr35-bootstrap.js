import { createLocalCareAdapter } from './pr35-local-adapter.js';
import { createProductionCareAdapter } from './pr35-production-adapter.js';
import { createVolatileAuthorizationRepository, createRemoteAuthorizationRepository } from './pr35-assignment-repository.js';
import { createUserSubmissionQueue } from './pr35-drafts.js';

const localHost = () => ['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'].includes(location.hostname);
const preview = () => localHost() && ['account', 'owner', 'home'].includes(new URLSearchParams(location.search).get('preview'));
const now = () => new Date().toISOString();
const demoOwner = () => ({ id: 'demo-owner', kind: 'staff', accountState: 'active', sessionIssuedAt: now(), assignments: [{ id: 'demo-owner-assignment', subjectId: 'demo-owner', roleId: 'owner', permissionIds: ['owner.console.read', 'authorization.assignment.read', 'authorization.assignment.manage', 'authorization.owner.manage', 'authorization.permission.delegate', 'care.ticket.read.scoped', 'care.ticket.escalate', 'audit.event.read.scoped'], scope: { level: 'platform' }, state: 'active', startsAt: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z' }] });
const productionIdentity = () => window.__VVIP_PR35_IDENTITY__ || { id: window.Clerk?.user?.id || null, kind: 'user', accountState: window.Clerk?.user ? 'active' : 'inactive', assignments: [] };
export const resolveCareIdentity = ({ local = false, clerkUser = null } = {}) => local
  ? { id: 'demo-member', kind: 'user', accountState: 'active', assignments: [] }
  : { id: clerkUser?.id || null, kind: 'user', accountState: clerkUser?.id ? 'active' : 'inactive', assignments: [] };

export async function waitForClerk({
  getClerk = () => window.Clerk,
  timeoutMs = 2500,
  pollMs = 25,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
} = {}) {
  const deadline = Date.now() + timeoutMs;
  let clerk = getClerk();
  while (!clerk && Date.now() < deadline) {
    await sleep(pollMs);
    clerk = getClerk();
  }
  if (!clerk) return null;
  if (!clerk.loaded && typeof clerk.load === 'function') {
    const remainingMs = Math.max(1, deadline - Date.now());
    let timer;
    try {
      await Promise.race([
        clerk.load(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('CLERK_TIMEOUT')), remainingMs); })
      ]);
    } catch { return null; } finally { clearTimeout(timer); }
  }
  return clerk.loaded === false ? null : clerk;
}

async function boot() {
  const local = preview(); const identity = local ? demoOwner : productionIdentity;
  if (!local && !window.__VVIP_PR35_IDENTITY__) await waitForClerk();
  const careIdentity = () => resolveCareIdentity({ local, clerkUser: window.Clerk?.user });
  const repository = local ? createVolatileAuthorizationRepository() : createRemoteAuthorizationRepository();
  const careAdapter = local ? createLocalCareAdapter({ clock: now, online: () => navigator.onLine }) : createProductionCareAdapter();
  if (document.querySelector('[data-vvip-tiger-care-entry]')) {
    const { createCareController } = await import('./pr35-care-controller.js');
    const queue = createUserSubmissionQueue(sessionStorage, window.Clerk?.session?.id || careIdentity().id || 'anonymous');
    const care = createCareController({ adapter: careAdapter, identity: careIdentity, clock: now, queue });
    document.querySelectorAll('[data-vvip-tiger-care-entry]').forEach((button) => button.addEventListener('click', (event) => { event.stopImmediatePropagation(); care.open(button); }, true));
  }
  const actionHost = document.querySelector('[data-profile-actions-menu]'); const ownerRoot = document.querySelector('[data-owner-root]');
  if (actionHost || ownerRoot) {
    const { createOwnerController } = await import('./pr35-owner-controller.js');
    const owner = createOwnerController({ root: document, repository, careAdapter, identity, clock: now, local });
    if (actionHost) owner.mountProfileActions(actionHost);
    const ownerLink = document.querySelector('[data-pr35-owner-link]');
    if (ownerLink && (local || identity().assignments?.some((item) => item.state === 'active' && item.permissionIds?.includes('owner.console.read')))) ownerLink.hidden = false;
    if (ownerRoot) await owner.mountConsole();
  }
}
if (typeof document !== 'undefined') boot().catch(() => { const status = document.querySelector('[data-owner-status]'); if (status) status.textContent = 'تعذر تجهيز الوحدة بأمان. لم يتم حفظ أي تغيير.'; });
