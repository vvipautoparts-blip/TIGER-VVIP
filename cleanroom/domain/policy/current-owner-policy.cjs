'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const CURRENT_OWNER_POLICY = deepFreeze({
  sectors: [
    { id: 'SEC-001', labelAr: 'قطع غيار المركبات' },
    { id: 'SEC-002', labelAr: 'خدمات المركبات والخدمات المرتبطة بها' },
    { id: 'SEC-003', labelAr: 'المواد والتموين' },
    { id: 'SEC-004', labelAr: 'العقارات' },
    { id: 'SEC-005', labelAr: 'المقاولات والبناء' },
    { id: 'SEC-006', labelAr: 'الخدمات والمهن والحرف' },
    { id: 'SEC-007', labelAr: 'المعدات والآليات' },
    { id: 'SEC-008', labelAr: 'التجارة والأعمال والتوريد' },
    { id: 'SEC-009', labelAr: 'الهندسة والاستشارات' },
    { id: 'SEC-010', labelAr: 'التصميم' },
  ],
  visibility: {
    pricesJod: [2, 10, 20, 45],
    paceLabelsAr: ['بطيء', 'جيد', 'سريع'],
    expiryBasis: 'VERIFIED_IMPRESSION_QUOTA_ONLY',
    postAfterCardHours: 24,
  },
  finance: {
    knownAssignedPercent: 84,
    pendingOwnerReallocationPercent: 16,
    pendingOwnerReallocationAccount: 'PENDING_OWNER_REALLOCATION',
    operationsPercent: 43,
    operations: {
      RISK: 8,
      MAINTENANCE: 8,
      DEVELOPMENT: 8,
      TECHNICAL_SUPPORT: 8,
      ADVERTISING: 8,
      CSR: 3,
    },
    salesAdministrationPercent: 21,
    salesRoles: {
      GENERAL_MANAGER: 7,
      SECTOR_MANAGER: 7,
      MARKETER: 7,
    },
    selfServiceDiscountPercent: 7,
  },
});

function isApprovedPriceJod(value) {
  return CURRENT_OWNER_POLICY.visibility.pricesJod.includes(value);
}

module.exports = Object.freeze({ CURRENT_OWNER_POLICY, deepFreeze, isApprovedPriceJod });
