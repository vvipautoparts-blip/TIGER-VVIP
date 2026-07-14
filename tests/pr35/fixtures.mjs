export const PLATFORM_SCOPE = Object.freeze({ level: 'platform' });
export const TEAM_SCOPE = Object.freeze({
  level: 'team',
  sectorId: 'sector-auto',
  regionId: 'region-north',
  areaId: 'area-a',
  teamId: 'team-care'
});

export function assignment(overrides = {}) {
  return {
    id: 'assignment-1',
    subjectId: 'actor-1',
    roleId: 'platform_admin',
    permissionIds: ['authorization.assignment.manage'],
    scope: PLATFORM_SCOPE,
    state: 'active',
    startsAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
    ...overrides
  };
}

export function actor(overrides = {}) {
  return { id: 'actor-1', accountState: 'active', sessionValidAfter: null,
    assignments: [assignment()], ...overrides };
}
