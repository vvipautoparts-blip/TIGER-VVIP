import { SCOPE_LEVELS } from "./v13-authority-contracts.js";

const ancestry = Object.freeze([
  "countryCode",
  "sectorId",
  "regionId",
  "areaId",
  "teamId"
]);

function domainError(code) {
  return Object.assign(new Error(code), { code });
}

function normalizeCountryCode(value) {
  if (typeof value !== "string") throw domainError("INVALID_SCOPE");
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) throw domainError("INVALID_SCOPE");
  return normalized;
}

function normalizeIdentifier(value) {
  if (typeof value !== "string") throw domainError("INVALID_SCOPE");
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 128) throw domainError("INVALID_SCOPE");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(normalized)) throw domainError("INVALID_SCOPE");
  return normalized;
}

export function normalizeCountryScope(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw domainError("INVALID_SCOPE");
  }

  const levelIndex = SCOPE_LEVELS.indexOf(input.level);
  if (levelIndex < 0) throw domainError("INVALID_SCOPE");

  const allowed = new Set(["level", ...ancestry.slice(0, levelIndex)]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw domainError("INVALID_SCOPE");
  }

  const output = { level: input.level };
  for (let index = 1; index <= levelIndex; index += 1) {
    const key = ancestry[index - 1];
    output[key] = key === "countryCode"
      ? normalizeCountryCode(input[key])
      : normalizeIdentifier(input[key]);
  }

  return Object.freeze(output);
}

export function countryScopeContains(grantInput, resourceInput) {
  try {
    const grant = normalizeCountryScope(grantInput);
    const resource = normalizeCountryScope(resourceInput);
    const grantIndex = SCOPE_LEVELS.indexOf(grant.level);
    const resourceIndex = SCOPE_LEVELS.indexOf(resource.level);

    if (grantIndex > resourceIndex) return false;
    return ancestry.slice(0, grantIndex).every((key) => grant[key] === resource[key]);
  } catch {
    return false;
  }
}

export function assertResourceCountry(scopeInput, resourceCountry) {
  try {
    const scope = normalizeCountryScope(scopeInput);
    const normalizedCountry = normalizeCountryCode(resourceCountry);
    if (scope.level === "platform" || scope.countryCode === normalizedCountry) {
      return Object.freeze({ ok: true, code: "OK" });
    }
    return Object.freeze({ ok: false, code: "COUNTRY_SCOPE_MISMATCH" });
  } catch {
    return Object.freeze({ ok: false, code: "INVALID_SCOPE" });
  }
}
