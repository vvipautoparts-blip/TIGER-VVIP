import { createHash } from "node:crypto";

export const SALES_DNA_POLICY_VERSION = "TIGER_SOVEREIGN_SALES_DNA_2026_08_19_V1";

export const FINANCIAL_ALLOCATION_BPS = Object.freeze({
  OWNER: 500,
  PARTNER_1: 500,
  PARTNER_2: 500,
  PARTNER_3: 500,
  GENERAL_MANAGER: 500,
  SECTOR_MANAGER: 500,
  MARKETER: 500,
  CUSTOMER_SUPPORT_POOL: 150,
  TECH_CONTENT_OPS_POOL: 150,
  PLATFORM_TREASURY_RESERVE: 6200
});

export const SALES_DNA_LOCKS = Object.freeze([
  "IDENTITY_LOCK",
  "SECTOR_LOCK",
  "LINEAGE_LOCK",
  "TIME_LOCK",
  "FINANCIAL_LOCK"
]);

const TOTAL_BPS = 10000;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{2,159}$/;
const COUNTRY_PATTERN = /^[A-Z0-9]{2,8}$/;
const ROLE_SET = new Set(["SECTOR_MANAGER", "MARKETER"]);
const ASSIGNMENT_STATUS_SET = new Set(["ACTIVE", "SUSPENDED", "EXPIRED", "REVOKED"]);
const CLAIM_STATUS_SET = new Set(["ELIGIBLE", "DISPUTED", "EXPIRED", "CANCELLED", "USED"]);
const CLAIM_SOURCE_SET = new Set([
  "REFERRAL_LINK",
  "QR_CODE",
  "INVITATION",
  "SALES_SESSION",
  "CUSTOMER_CONFIRMED",
  "ASSISTED_ONBOARDING",
  "CAMPAIGN_CODE"
]);

function assertInvariant(condition, code) {
  if (!condition) {
    throw new Error(code);
  }
}

function assertId(value, code) {
  assertInvariant(typeof value === "string" && ID_PATTERN.test(value), code);
}

function assertCountryId(value) {
  assertInvariant(typeof value === "string" && COUNTRY_PATTERN.test(value), "INVALID_COUNTRY_ID");
}

function parseTimestamp(value, code = "INVALID_TIMESTAMP") {
  assertInvariant(typeof value === "string" && value.length >= 10, code);
  const millis = Date.parse(value);
  assertInvariant(Number.isFinite(millis), code);
  return millis;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function publicAssignmentView(assignment) {
  if (!assignment) return null;
  return {
    assignmentId: assignment.assignmentId,
    subjectId: assignment.subjectId,
    role: assignment.role,
    countryId: assignment.countryId,
    sectorId: assignment.sectorId,
    responsibilityCellId: assignment.responsibilityCellId,
    managerAssignmentId: assignment.managerAssignmentId ?? null,
    validFrom: assignment.validFrom,
    validUntil: assignment.validUntil,
    status: assignment.status
  };
}

function publicClaimView(claim) {
  if (!claim) return null;
  return {
    claimId: claim.claimId,
    customerId: claim.customerId,
    opportunityId: claim.opportunityId,
    sectorId: claim.sectorId,
    marketerAssignmentId: claim.marketerAssignmentId,
    source: claim.source,
    createdAt: claim.createdAt,
    expiresAt: claim.expiresAt,
    status: claim.status
  };
}

function assertAllocationPolicy() {
  const total = Object.values(FINANCIAL_ALLOCATION_BPS)
    .reduce((sum, value) => sum + value, 0);
  assertInvariant(total === TOTAL_BPS, "FINANCIAL_POLICY_BPS_MISMATCH");
}

assertAllocationPolicy();

export function createAssignmentEpoch(input = {}) {
  const {
    assignmentId,
    subjectId,
    role,
    countryId,
    sectorId,
    responsibilityCellId,
    managerAssignmentId = null,
    validFrom,
    validUntil = null,
    status = "ACTIVE"
  } = input;

  assertId(assignmentId, "INVALID_ASSIGNMENT_ID");
  assertId(subjectId, "INVALID_SUBJECT_ID");
  assertInvariant(ROLE_SET.has(role), "INVALID_ASSIGNMENT_ROLE");
  assertCountryId(countryId);
  assertId(sectorId, "INVALID_SECTOR_ID");
  assertId(responsibilityCellId, "INVALID_RESPONSIBILITY_CELL_ID");
  assertInvariant(ASSIGNMENT_STATUS_SET.has(status), "INVALID_ASSIGNMENT_STATUS");

  const fromMillis = parseTimestamp(validFrom);
  let untilMillis = null;
  if (validUntil !== null) {
    untilMillis = parseTimestamp(validUntil);
    assertInvariant(untilMillis > fromMillis, "INVALID_ASSIGNMENT_WINDOW");
  }

  if (role === "MARKETER") {
    assertId(managerAssignmentId, "INVALID_MANAGER_ASSIGNMENT_ID");
  } else {
    assertInvariant(managerAssignmentId === null, "SECTOR_MANAGER_CANNOT_HAVE_PARENT_MANAGER");
  }

  return deepFreeze({
    assignmentId,
    subjectId,
    role,
    countryId,
    sectorId,
    responsibilityCellId,
    managerAssignmentId,
    validFrom: new Date(fromMillis).toISOString(),
    validUntil: untilMillis === null ? null : new Date(untilMillis).toISOString(),
    status
  });
}

export function createSaleOwnershipClaim(input = {}) {
  const {
    claimId,
    customerId,
    opportunityId,
    sectorId,
    marketerAssignmentId,
    source,
    createdAt,
    expiresAt,
    status = "ELIGIBLE"
  } = input;

  assertId(claimId, "INVALID_CLAIM_ID");
  assertId(customerId, "INVALID_CUSTOMER_ID");
  assertId(opportunityId, "INVALID_OPPORTUNITY_ID");
  assertId(sectorId, "INVALID_SECTOR_ID");
  assertId(marketerAssignmentId, "INVALID_MARKETER_ASSIGNMENT_ID");
  assertInvariant(CLAIM_SOURCE_SET.has(source), "INVALID_CLAIM_SOURCE");
  assertInvariant(CLAIM_STATUS_SET.has(status), "INVALID_CLAIM_STATUS");

  const createdMillis = parseTimestamp(createdAt);
  const expiresMillis = parseTimestamp(expiresAt);
  assertInvariant(expiresMillis > createdMillis, "INVALID_CLAIM_WINDOW");

  return deepFreeze({
    claimId,
    customerId,
    opportunityId,
    sectorId,
    marketerAssignmentId,
    source,
    createdAt: new Date(createdMillis).toISOString(),
    expiresAt: new Date(expiresMillis).toISOString(),
    status
  });
}

function assertAssignmentEffective(assignment, lockedMillis) {
  assertInvariant(assignment.status === "ACTIVE", "ASSIGNMENT_NOT_ACTIVE");
  const fromMillis = parseTimestamp(assignment.validFrom);
  const untilMillis = assignment.validUntil === null
    ? null
    : parseTimestamp(assignment.validUntil);

  assertInvariant(fromMillis <= lockedMillis, "ASSIGNMENT_NOT_EFFECTIVE");
  assertInvariant(untilMillis === null || lockedMillis < untilMillis, "ASSIGNMENT_NOT_EFFECTIVE");
}

function assertLineageScope({
  countryId,
  sectorId,
  responsibilityCellId,
  assignment,
  expectedRole,
  lockedMillis
}) {
  assertInvariant(assignment.role === expectedRole, "LINEAGE_ROLE_MISMATCH");
  assertAssignmentEffective(assignment, lockedMillis);
  assertInvariant(assignment.countryId === countryId, "LINEAGE_COUNTRY_MISMATCH");
  assertInvariant(assignment.sectorId === sectorId, "LINEAGE_SECTOR_MISMATCH");
  assertInvariant(
    assignment.responsibilityCellId === responsibilityCellId,
    "LINEAGE_RESPONSIBILITY_CELL_MISMATCH"
  );
}

function buildRevenueAddressBody({
  saleId,
  countryId,
  sectorId,
  responsibilityCellId,
  manager,
  marketer,
  financialPolicyVersion,
  lockedAt
}) {
  return {
    saleId,
    countryId,
    sectorId,
    responsibilityCellId,
    managerAssignmentId: manager?.assignmentId ?? null,
    marketerAssignmentId: marketer?.assignmentId ?? null,
    financialPolicyVersion,
    lockedAt
  };
}

function snapshotBody(snapshot) {
  const { attributionSeal, ...body } = snapshot;
  return body;
}

export function createSalesDnaSnapshot(input = {}) {
  const {
    saleId,
    countryId,
    sectorId,
    responsibilityCellId,
    managerAssignment = null,
    marketerAssignment = null,
    ownershipClaim = null,
    financialPolicyVersion,
    lockedAt
  } = input;

  assertId(saleId, "INVALID_SALE_ID");
  assertCountryId(countryId);
  assertId(sectorId, "INVALID_SECTOR_ID");
  assertId(responsibilityCellId, "INVALID_RESPONSIBILITY_CELL_ID");
  assertInvariant(
    financialPolicyVersion === SALES_DNA_POLICY_VERSION,
    "FINANCIAL_POLICY_VERSION_MISMATCH"
  );

  const lockedMillis = parseTimestamp(lockedAt);
  const normalizedLockedAt = new Date(lockedMillis).toISOString();

  if (managerAssignment !== null) {
    assertLineageScope({
      countryId,
      sectorId,
      responsibilityCellId,
      assignment: managerAssignment,
      expectedRole: "SECTOR_MANAGER",
      lockedMillis
    });
  }

  if (marketerAssignment !== null) {
    assertInvariant(managerAssignment !== null, "MARKETER_REQUIRES_MANAGER_LINEAGE");
    assertLineageScope({
      countryId,
      sectorId,
      responsibilityCellId,
      assignment: marketerAssignment,
      expectedRole: "MARKETER",
      lockedMillis
    });
    assertInvariant(
      marketerAssignment.managerAssignmentId === managerAssignment.assignmentId,
      "MARKETER_MANAGER_LINEAGE_MISMATCH"
    );
    assertInvariant(ownershipClaim !== null, "MARKETER_REQUIRES_OWNERSHIP_CLAIM");
  }

  if (ownershipClaim !== null) {
    assertInvariant(marketerAssignment !== null, "OWNERSHIP_CLAIM_REQUIRES_MARKETER");
    assertInvariant(ownershipClaim.status === "ELIGIBLE", "OWNERSHIP_CLAIM_NOT_ELIGIBLE");
    assertInvariant(ownershipClaim.sectorId === sectorId, "CLAIM_SECTOR_MISMATCH");
    assertInvariant(
      ownershipClaim.marketerAssignmentId === marketerAssignment.assignmentId,
      "CLAIM_MARKETER_LINEAGE_MISMATCH"
    );

    const claimCreatedMillis = parseTimestamp(ownershipClaim.createdAt);
    const claimExpiresMillis = parseTimestamp(ownershipClaim.expiresAt);
    assertInvariant(
      claimCreatedMillis <= lockedMillis && lockedMillis < claimExpiresMillis,
      "OWNERSHIP_CLAIM_NOT_EFFECTIVE"
    );
  }

  const manager = publicAssignmentView(managerAssignment);
  const marketer = publicAssignmentView(marketerAssignment);
  const claim = publicClaimView(ownershipClaim);
  const revenueAddressInput = buildRevenueAddressBody({
    saleId,
    countryId,
    sectorId,
    responsibilityCellId,
    manager,
    marketer,
    financialPolicyVersion,
    lockedAt: normalizedLockedAt
  });
  const revenueAddress = `TRA_${sha256Hex(canonicalize(revenueAddressInput)).slice(0, 24).toUpperCase()}`;

  const body = {
    schema: "TIGER_SOVEREIGN_SALES_DNA",
    schemaVersion: 1,
    saleId,
    countryId,
    sectorId,
    responsibilityCellId,
    manager,
    marketer,
    ownershipClaim: claim,
    financialPolicyVersion,
    lockedAt: normalizedLockedAt,
    locks: SALES_DNA_LOCKS.map((lock) => ({ lock, state: "LOCKED" })),
    revenueAddress
  };

  const attributionSeal = sha256Hex(canonicalize(body));
  return deepFreeze({ ...body, attributionSeal });
}

export function verifySalesDnaSnapshot(snapshot) {
  try {
    if (!snapshot || typeof snapshot !== "object") return false;
    if (typeof snapshot.attributionSeal !== "string" || !/^[a-f0-9]{64}$/.test(snapshot.attributionSeal)) {
      return false;
    }

    const body = snapshotBody(snapshot);
    if (body.schema !== "TIGER_SOVEREIGN_SALES_DNA") return false;
    if (body.financialPolicyVersion !== SALES_DNA_POLICY_VERSION) return false;
    if (!Array.isArray(body.locks) || body.locks.length !== SALES_DNA_LOCKS.length) return false;

    const expectedLocks = SALES_DNA_LOCKS.map((lock) => ({ lock, state: "LOCKED" }));
    if (canonicalize(body.locks) !== canonicalize(expectedLocks)) return false;

    const expectedRevenueAddress = `TRA_${sha256Hex(canonicalize(buildRevenueAddressBody({
      saleId: body.saleId,
      countryId: body.countryId,
      sectorId: body.sectorId,
      responsibilityCellId: body.responsibilityCellId,
      manager: body.manager,
      marketer: body.marketer,
      financialPolicyVersion: body.financialPolicyVersion,
      lockedAt: body.lockedAt
    }))).slice(0, 24).toUpperCase()}`;

    if (body.revenueAddress !== expectedRevenueAddress) return false;
    const expectedSeal = sha256Hex(canonicalize(body));
    return expectedSeal === snapshot.attributionSeal;
  } catch {
    return false;
  }
}

function assertMinorUnits(value) {
  assertInvariant(Number.isSafeInteger(value) && value >= 0, "INVALID_MINOR_UNITS");
}

function allocationRows(snapshot) {
  return [
    { bucket: "OWNER", basisPoints: 500, beneficiaryId: null },
    { bucket: "PARTNER_1", basisPoints: 500, beneficiaryId: null },
    { bucket: "PARTNER_2", basisPoints: 500, beneficiaryId: null },
    { bucket: "PARTNER_3", basisPoints: 500, beneficiaryId: null },
    { bucket: "GENERAL_MANAGER", basisPoints: 500, beneficiaryId: null },
    snapshot.manager
      ? { bucket: "SECTOR_MANAGER", basisPoints: 500, beneficiaryId: snapshot.manager.subjectId }
      : { bucket: "MANAGEMENT_UNATTRIBUTED_RESERVE", basisPoints: 500, beneficiaryId: null },
    snapshot.marketer
      ? { bucket: "MARKETER", basisPoints: 500, beneficiaryId: snapshot.marketer.subjectId }
      : { bucket: "MARKETING_UNATTRIBUTED_RESERVE", basisPoints: 500, beneficiaryId: null },
    { bucket: "CUSTOMER_SUPPORT_POOL", basisPoints: 150, beneficiaryId: null },
    { bucket: "TECH_CONTENT_OPS_POOL", basisPoints: 150, beneficiaryId: null },
    { bucket: "PLATFORM_TREASURY_RESERVE", basisPoints: 6200, beneficiaryId: null }
  ];
}

function deterministicTieBreak(financialEventId, saleId, bucket) {
  return sha256Hex(`${SALES_DNA_POLICY_VERSION}\u0000${financialEventId}\u0000${saleId}\u0000${bucket}`);
}

function allocateExactMinorUnits(amount, rows, financialEventId, saleId) {
  const denominator = BigInt(TOTAL_BPS);
  const amountBig = BigInt(amount);
  let allocated = 0n;

  const calculated = rows.map((row) => {
    const numerator = amountBig * BigInt(row.basisPoints);
    const baseAmount = numerator / denominator;
    const remainder = numerator % denominator;
    allocated += baseAmount;
    return {
      ...row,
      amountBig: baseAmount,
      remainder,
      tieBreak: deterministicTieBreak(financialEventId, saleId, row.bucket)
    };
  });

  let residual = amountBig - allocated;
  const priority = [...calculated].sort((a, b) => {
    if (a.remainder !== b.remainder) {
      return a.remainder > b.remainder ? -1 : 1;
    }
    return a.tieBreak.localeCompare(b.tieBreak);
  });

  for (let index = 0; residual > 0n; index += 1) {
    priority[index % priority.length].amountBig += 1n;
    residual -= 1n;
  }

  const byBucket = new Map(priority.map((row) => [row.bucket, row.amountBig]));
  return rows.map((row) => ({
    bucket: row.bucket,
    basisPoints: row.basisPoints,
    beneficiaryId: row.beneficiaryId,
    amountMinorUnits: Number(byBucket.get(row.bucket))
  }));
}

export function allocateSalesDnaMinorUnits(input = {}) {
  const {
    baseDistributableMinorUnits,
    financialEventId,
    snapshot
  } = input;

  assertMinorUnits(baseDistributableMinorUnits);
  assertId(financialEventId, "INVALID_FINANCIAL_EVENT_ID");
  assertInvariant(verifySalesDnaSnapshot(snapshot), "INVALID_SALES_DNA_SNAPSHOT");

  const rows = allocationRows(snapshot);
  const totalBasisPoints = rows.reduce((sum, row) => sum + row.basisPoints, 0);
  assertInvariant(totalBasisPoints === TOTAL_BPS, "ALLOCATION_BPS_MISMATCH");

  const entries = allocateExactMinorUnits(
    baseDistributableMinorUnits,
    rows,
    financialEventId,
    snapshot.saleId
  );

  const reconciled = entries.reduce((sum, entry) => sum + entry.amountMinorUnits, 0);
  assertInvariant(reconciled === baseDistributableMinorUnits, "ALLOCATION_RECONCILIATION_FAILED");
  assertInvariant(entries.every((entry) => Number.isSafeInteger(entry.amountMinorUnits)), "UNSAFE_ALLOCATION");

  return deepFreeze({
    financialEventId,
    saleId: snapshot.saleId,
    salesDnaRevenueAddress: snapshot.revenueAddress,
    financialPolicyVersion: SALES_DNA_POLICY_VERSION,
    baseDistributableMinorUnits,
    totalBasisPoints,
    entries
  });
}
