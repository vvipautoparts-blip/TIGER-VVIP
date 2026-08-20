function frozen(value) {
  return Object.freeze(value);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function serverAuthoritative(server) {
  return frozen({
    action: 'ACCEPT_SERVER',
    policy: 'SERVER_AUTHORITATIVE',
    server: frozen({ ...(server || {}) })
  });
}

function resolveProfile(base, local, server) {
  const baseline = base || {};
  const localValue = local || {};
  const serverValue = server || {};
  const fields = new Set([
    ...Object.keys(baseline),
    ...Object.keys(localValue),
    ...Object.keys(serverValue)
  ]);
  fields.delete('version');
  const conflicts = [];
  const payload = {};

  for (const field of fields) {
    const localChanged = !same(localValue[field], baseline[field]);
    const serverChanged = !same(serverValue[field], baseline[field]);
    if (localChanged && serverChanged && !same(localValue[field], serverValue[field])) {
      conflicts.push(field);
      continue;
    }
    payload[field] = localChanged ? localValue[field] : serverValue[field];
  }

  if (conflicts.length > 0) {
    return frozen({ action: 'MANUAL', policy: 'FIELD_CONFLICT', fields: frozen(conflicts.sort()) });
  }
  if (Number.isFinite(serverValue.version)) payload.baseVersion = serverValue.version;
  return frozen({ action: 'RETRY_AS_NEW', policy: 'FIELD_LEVEL_MERGE', payload: frozen(payload) });
}

export function resolveMutationConflict({ kind, base, local, server } = {}) {
  if (typeof kind !== 'string') return frozen({ action: 'MANUAL', policy: 'UNKNOWN_MUTATION' });

  if (
    kind.startsWith('payment.')
    || kind.startsWith('financial.')
    || kind.startsWith('security.')
    || kind.startsWith('owner.')
    || kind.startsWith('marketplace.')
  ) return serverAuthoritative(server);

  if (kind === 'social.read_cursor.advance') {
    const localSequence = Number.isSafeInteger(local?.sequence) ? local.sequence : 0;
    const serverSequence = Number.isSafeInteger(server?.sequence) ? server.sequence : 0;
    return frozen({
      action: 'RETRY_AS_NEW',
      policy: 'MONOTONIC_MAX',
      payload: frozen({ sequence: Math.max(localSequence, serverSequence) })
    });
  }

  if (kind === 'social.reaction.set') {
    if (!local || !server || local.postId !== server.postId || !Number.isSafeInteger(server.version)) {
      return frozen({ action: 'MANUAL', policy: 'REACTION_CONTEXT_INVALID' });
    }
    return frozen({
      action: 'RETRY_AS_NEW',
      policy: 'LATEST_INTENT_ON_SERVER_VERSION',
      payload: frozen({ postId: local.postId, reaction: local.reaction, baseVersion: server.version })
    });
  }

  if (kind === 'profile.edit') return resolveProfile(base, local, server);

  if (kind === 'social.post.update') {
    return frozen({ action: 'MANUAL', policy: 'CONTENT_CONFLICT' });
  }

  if (kind === 'social.message.send') {
    if (server?.idempotencyMatched === true && server?.payloadMatched === true) {
      return frozen({ action: 'ACK', policy: 'IDEMPOTENT_DUPLICATE' });
    }
    return frozen({ action: 'TERMINAL', policy: 'APPEND_ONLY_CONFLICT' });
  }

  return frozen({ action: 'MANUAL', policy: 'UNKNOWN_MUTATION' });
}