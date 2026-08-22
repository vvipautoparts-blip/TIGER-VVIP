export const COMMISSION_POLICY_VERSION = "VVIP_COMMISSION_2026_08_12_V1";
export const COMMISSION_POLICY_STATUS = "RETIRED_BROKERAGE";
export const COMMISSION_POLICY_SUPERSEDED_BY = "ISSUE_312_PRIVATE_DISCOVERY_RENDEZVOUS";

const freezeList = (values) => Object.freeze([...values]);

export const RETIRED_COMMISSION_RECIPIENTS = freezeList([
  "PRIMARY_MARKETER",
  "SECONDARY_MARKETER",
  "SUPERVISOR",
  "AREA_MANAGER",
  "SECTOR_MANAGER",
  "COUNTRY_EXECUTIVE_COMMISSIONER",
  "MARKETING"
]);

export const ACTIVE_COMMISSION_RECIPIENTS = freezeList([]);

export const CENTRAL_COMMISSION_POLICY = Object.freeze({
  policyId: "VVIP_CENTRAL_ALL_SECTOR_COMMISSION",
  version: COMMISSION_POLICY_VERSION,
  status: COMMISSION_POLICY_STATUS,
  authority: "HISTORICAL_EVIDENCE_ONLY",
  supersededBy: COMMISSION_POLICY_SUPERSEDED_BY,
  currentEffect: "NO_TRANSACTION_VALUE_COMMISSION"
});

const SECTOR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9:._/-]{1,159}$/;

function assertSectorId(sectorId) {
  if (typeof sectorId !== "string" || !SECTOR_ID_PATTERN.test(sectorId)) {
    throw new Error("INVALID_SECTOR_ID");
  }
}

function brokerageRetired() {
  throw new Error("BROKERAGE_COMMISSION_RETIRED");
}

export function getCommissionPolicyForSector(sectorId) {
  assertSectorId(sectorId);
  return brokerageRetired();
}

export function allocateRemovedShareMinorUnits() {
  return brokerageRetired();
}
