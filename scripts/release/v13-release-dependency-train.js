import {
  RELEASE_LIMITS,
  deepFreeze,
  isCommitSha,
  isReleaseIdentifier
} from "./v13-release-contracts.js";

const INPUT_FIELDS = new Set(["candidate", "nodes"]);
const NODE_FIELDS = new Set([
  "id",
  "headRef",
  "headSha",
  "baseRef",
  "baseSha",
  "state",
  "draft",
  "merged",
  "mergeSha",
  "requiredParentIds",
  "verificationOnly"
]);
const NODE_STATES = new Set(["open", "closed"]);
const refPattern = /^[A-Za-z0-9._/-]+$/;
const MAX_REF_LENGTH = 256;

function fail(code, blockingNodeIds = []) {
  return deepFreeze({
    ok: false,
    code,
    blockingNodeIds: [...blockingNodeIds].sort()
  });
}

function isPlainDataObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.get || descriptor.set || !descriptor.enumerable) return false;
  }
  return true;
}

function hasExactFields(value, allowed) {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function isSafeRef(value) {
  if (typeof value !== "string"
      || value.length === 0
      || value.length > MAX_REF_LENGTH
      || value.startsWith("/")
      || value.endsWith("/")
      || value.includes("\\")
      || value.includes("?")
      || value.includes("#")
      || value.includes("//")
      || !refPattern.test(value)) {
    return false;
  }

  return value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function isValidNode(node) {
  if (!isPlainDataObject(node) || !hasExactFields(node, NODE_FIELDS)) return false;
  if (!isReleaseIdentifier(node.id, "pr_")) return false;
  if (!isSafeRef(node.headRef) || !isSafeRef(node.baseRef)) return false;
  if (!isCommitSha(node.headSha) || !isCommitSha(node.baseSha)) return false;
  if (!NODE_STATES.has(node.state)) return false;
  if (typeof node.draft !== "boolean"
      || typeof node.merged !== "boolean"
      || typeof node.verificationOnly !== "boolean") {
    return false;
  }
  if (node.mergeSha !== null && !isCommitSha(node.mergeSha)) return false;
  if (!Array.isArray(node.requiredParentIds)
      || node.requiredParentIds.length > RELEASE_LIMITS.MAX_DEPENDENCIES
      || !node.requiredParentIds.every((id) => isReleaseIdentifier(id, "pr_"))
      || new Set(node.requiredParentIds).size !== node.requiredParentIds.length) {
    return false;
  }
  return true;
}

function detectGraphProblem(candidateId, nodesById) {
  const colors = new Map();
  const stack = [];
  let missing = null;
  let cycle = null;

  function visit(id) {
    if (cycle || missing) return;

    const color = colors.get(id) || 0;
    if (color === 2) return;
    if (color === 1) {
      const start = stack.lastIndexOf(id);
      cycle = (start >= 0 ? stack.slice(start) : [id]).sort();
      return;
    }

    const node = nodesById.get(id);
    if (!node) {
      missing = id;
      return;
    }

    colors.set(id, 1);
    stack.push(id);

    for (const parentId of [...node.requiredParentIds].sort()) {
      if (!nodesById.has(parentId)) {
        missing = parentId;
        break;
      }
      visit(parentId);
      if (cycle || missing) break;
    }

    stack.pop();
    colors.set(id, 2);
  }

  visit(candidateId);
  if (cycle) return fail("RELEASE_DEPENDENCY_CYCLE", cycle);
  if (missing) return fail("RELEASE_DEPENDENCY_BLOCKED", [missing]);
  return null;
}

function validateRelationshipAndReadiness(candidateId, nodesById) {
  const visited = new Set();
  const orderedDependencies = [];

  function visit(id) {
    if (visited.has(id)) return null;
    visited.add(id);

    const child = nodesById.get(id);
    const parentIds = [...child.requiredParentIds].sort();

    if (parentIds.length > 0) {
      const directParent = nodesById.get(parentIds[0]);
      if (child.baseRef !== directParent.headRef || child.baseSha !== directParent.headSha) {
        return fail("RELEASE_BASE_CHANGED", [directParent.id]);
      }
    }

    for (const parentId of parentIds) {
      const parent = nodesById.get(parentId);

      if (parent.verificationOnly
          || parent.state !== "closed"
          || parent.merged !== true
          || !isCommitSha(parent.mergeSha)) {
        return fail("RELEASE_DEPENDENCY_BLOCKED", [parent.id]);
      }

      const nestedFailure = visit(parentId);
      if (nestedFailure) return nestedFailure;

      if (!orderedDependencies.includes(parentId)) {
        orderedDependencies.push(parentId);
      }
    }

    return null;
  }

  const failure = visit(candidateId);
  if (failure) return failure;

  return deepFreeze({
    ok: true,
    orderedDependencies
  });
}

export function validateDependencyTrain(input) {
  if (!isPlainDataObject(input)
      || !hasExactFields(input, INPUT_FIELDS)
      || !isReleaseIdentifier(input.candidate, "pr_")
      || !Array.isArray(input.nodes)
      || input.nodes.length === 0
      || input.nodes.length > RELEASE_LIMITS.MAX_DEPENDENCIES
      || !input.nodes.every(isValidNode)) {
    return fail("RELEASE_CONTRACT_INVALID");
  }

  const nodesById = new Map();
  for (const node of input.nodes) {
    if (nodesById.has(node.id)) {
      return fail("RELEASE_CONTRACT_INVALID");
    }
    nodesById.set(node.id, node);
  }

  if (!nodesById.has(input.candidate)) {
    return fail("RELEASE_CONTRACT_INVALID");
  }

  const graphFailure = detectGraphProblem(input.candidate, nodesById);
  if (graphFailure) return graphFailure;

  return validateRelationshipAndReadiness(input.candidate, nodesById);
}
