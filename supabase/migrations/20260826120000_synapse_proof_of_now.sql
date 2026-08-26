-- TIGER SYNAPSE S4 — Proof-of-Now challenge, capture-receipt, and evidence authority.
-- Forward-only repository migration. Remote apply remains separately protected.
-- Raw nonces, media bytes, filenames, caller MIME declarations, coordinates, client clocks,
-- ownership claims, and condition/authenticity claims are intentionally not persisted.

begin;

create table public.vvip_synapse_proof_challenges (
    challenge_id uuid primary key,
    actor_subject text not null
        check (char_length(actor_subject) between 1 and 256 and actor_subject = btrim(actor_subject)),
    object_type text not null
        check (object_type in ('listing', 'intent_offer')),
    object_id uuid not null,
    purpose text not null
        check (purpose ~ '^[a-z][a-z0-9_]{0,63}$'),
    policy_version text not null
        check (char_length(policy_version) between 1 and 96 and policy_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$'),
    nonce_digest text not null unique
        check (nonce_digest ~ '^[0-9a-f]{64}$'),
    capture_digest text
        check (capture_digest is null or capture_digest ~ '^[0-9a-f]{64}$'),
    created_at timestamptz not null default statement_timestamp(),
    expires_at timestamptz not null,
    consumed_at timestamptz,
    check (expires_at > created_at),
    check (expires_at <= created_at + interval '10 minutes'),
    check (consumed_at is null or consumed_at >= created_at),
    check ((consumed_at is null and capture_digest is null) or (consumed_at is not null and capture_digest is not null))
);

create index vvip_synapse_proof_challenges_actor_object_idx
    on public.vvip_synapse_proof_challenges (actor_subject, object_type, object_id, created_at desc);
create index vvip_synapse_proof_challenges_expiry_idx
    on public.vvip_synapse_proof_challenges (expires_at)
    where consumed_at is null;

create table public.vvip_synapse_proof_capture_receipts (
    receipt_id uuid primary key,
    challenge_id uuid not null
        references public.vvip_synapse_proof_challenges(challenge_id) on delete restrict,
    actor_subject text not null
        check (char_length(actor_subject) between 1 and 256 and actor_subject = btrim(actor_subject)),
    object_type text not null
        check (object_type in ('listing', 'intent_offer')),
    object_id uuid not null,
    purpose text not null
        check (purpose ~ '^[a-z][a-z0-9_]{0,63}$'),
    policy_version text not null
        check (char_length(policy_version) between 1 and 96 and policy_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$'),
    source_storage_path text not null unique
        check (char_length(source_storage_path) between 1 and 320 and source_storage_path !~ '(^|/)\.\.(/|$)'),
    token_digest text not null unique
        check (token_digest ~ '^[0-9a-f]{64}$'),
    canonical_digest text
        check (canonical_digest is null or canonical_digest ~ '^[0-9a-f]{64}$'),
    verifier_id text
        check (verifier_id is null or (char_length(verifier_id) between 1 and 128 and verifier_id = btrim(verifier_id))),
    created_at timestamptz not null default statement_timestamp(),
    expires_at timestamptz not null,
    claimed_at timestamptz,
    finalized_at timestamptz,
    consumed_at timestamptz,
    check (expires_at > created_at),
    check (claimed_at is null or claimed_at >= created_at),
    check (finalized_at is null or (claimed_at is not null and finalized_at >= claimed_at)),
    check (consumed_at is null or (finalized_at is not null and consumed_at >= finalized_at)),
    check ((finalized_at is null and canonical_digest is null and verifier_id is null)
        or (finalized_at is not null and canonical_digest is not null and verifier_id is not null))
);

create index vvip_synapse_proof_capture_receipts_challenge_idx
    on public.vvip_synapse_proof_capture_receipts (challenge_id, created_at desc);
create index vvip_synapse_proof_capture_receipts_expiry_idx
    on public.vvip_synapse_proof_capture_receipts (expires_at)
    where consumed_at is null;

create table public.vvip_synapse_proof_evidence (
    evidence_id uuid primary key default gen_random_uuid(),
    challenge_id uuid not null unique
        references public.vvip_synapse_proof_challenges(challenge_id) on delete restrict,
    receipt_id uuid not null unique
        references public.vvip_synapse_proof_capture_receipts(receipt_id) on delete restrict,
    actor_subject text not null
        check (char_length(actor_subject) between 1 and 256 and actor_subject = btrim(actor_subject)),
    object_type text not null
        check (object_type in ('listing', 'intent_offer')),
    object_id uuid not null,
    purpose text not null
        check (purpose ~ '^[a-z][a-z0-9_]{0,63}$'),
    policy_version text not null
        check (char_length(policy_version) between 1 and 96 and policy_version ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$'),
    capture_digest text not null
        check (capture_digest ~ '^[0-9a-f]{64}$'),
    verifier_id text not null
        check (char_length(verifier_id) between 1 and 128 and verifier_id = btrim(verifier_id)),
    accepted_at timestamptz not null default statement_timestamp()
);

create index vvip_synapse_proof_evidence_object_idx
    on public.vvip_synapse_proof_evidence (object_type, object_id, accepted_at desc);
create index vvip_synapse_proof_evidence_actor_idx
    on public.vvip_synapse_proof_evidence (actor_subject, accepted_at desc);

-- Private staging only. Signed upload capability is transport-only; proof authority expires in DB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'proof-capture-staging',
    'proof-capture-staging',
    false,
    10485760,
    array['image/jpeg', 'image/webp']::text[]
);

alter table public.vvip_synapse_proof_challenges enable row level security;
alter table public.vvip_synapse_proof_challenges force row level security;
alter table public.vvip_synapse_proof_capture_receipts enable row level security;
alter table public.vvip_synapse_proof_capture_receipts force row level security;
alter table public.vvip_synapse_proof_evidence enable row level security;
alter table public.vvip_synapse_proof_evidence force row level security;

revoke all privileges on table
    public.vvip_synapse_proof_challenges,
    public.vvip_synapse_proof_capture_receipts,
    public.vvip_synapse_proof_evidence
from public, anon, authenticated, service_role;

create function public.vvip_synapse_proof_issue(
    p_challenge_id uuid,
    p_actor_subject text,
    p_object_type text,
    p_object_id uuid,
    p_purpose text,
    p_policy_version text,
    p_nonce_digest text,
    p_ttl_seconds integer default 300
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $function$
declare
    v_allowed boolean := false;
    v_challenge public.vvip_synapse_proof_challenges%rowtype;
begin
    if p_challenge_id is null then
        raise exception 'PROOF_CHALLENGE_ID_REQUIRED';
    end if;
    if p_actor_subject is null
       or char_length(p_actor_subject) not between 1 and 256
       or p_actor_subject <> btrim(p_actor_subject) then
        raise exception 'PROOF_ACTOR_INVALID';
    end if;
    if p_object_id is null or p_object_type not in ('listing', 'intent_offer') then
        raise exception 'PROOF_OBJECT_INVALID';
    end if;
    if p_purpose is null or p_purpose !~ '^[a-z][a-z0-9_]{0,63}$' then
        raise exception 'PROOF_PURPOSE_INVALID';
    end if;
    if p_policy_version is null
       or char_length(p_policy_version) not between 1 and 96
       or p_policy_version !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$' then
        raise exception 'PROOF_POLICY_VERSION_INVALID';
    end if;
    if p_nonce_digest is null or lower(p_nonce_digest) !~ '^[0-9a-f]{64}$' then
        raise exception 'PROOF_NONCE_DIGEST_INVALID';
    end if;
    if p_ttl_seconds is null or p_ttl_seconds not between 60 and 600 then
        raise exception 'PROOF_TTL_INVALID';
    end if;

    if p_object_type = 'listing' then
        select exists (
            select 1
            from public.vvip_marketplace_listings listing
            where listing.listing_id = p_object_id
              and listing.owner_subject = p_actor_subject
              and listing.status in ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'REJECTED')
        ) into v_allowed;
    elsif p_object_type = 'intent_offer' then
        select exists (
            select 1
            from public.vvip_synapse_intents intent
            where intent.intent_id = p_object_id
              and intent.actor_subject = p_actor_subject
              and intent.direction = 'OFFER'
              and intent.status in ('MATCHING', 'ACTIVE', 'PAUSED')
              and intent.expires_at > statement_timestamp()
        ) into v_allowed;
    end if;

    if not v_allowed then
        raise exception 'PROOF_OBJECT_NOT_ELIGIBLE';
    end if;

    insert into public.vvip_synapse_proof_challenges (
        challenge_id, actor_subject, object_type, object_id, purpose,
        policy_version, nonce_digest, expires_at
    ) values (
        p_challenge_id, p_actor_subject, p_object_type, p_object_id, p_purpose,
        p_policy_version, lower(p_nonce_digest),
        statement_timestamp() + make_interval(secs => p_ttl_seconds)
    )
    returning * into v_challenge;

    return jsonb_build_object(
        'ok', true,
        'status', 'ISSUED',
        'challenge_id', v_challenge.challenge_id,
        'object_type', v_challenge.object_type,
        'object_id', v_challenge.object_id,
        'purpose', v_challenge.purpose,
        'policy_version', v_challenge.policy_version,
        'expires_at', v_challenge.expires_at
    );
end;
$function$;

create function public.vvip_synapse_proof_capture_prepare(
    p_receipt_id uuid,
    p_challenge_id uuid,
    p_actor_subject text,
    p_token_digest text
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $function$
declare
    v_challenge public.vvip_synapse_proof_challenges%rowtype;
    v_receipt public.vvip_synapse_proof_capture_receipts%rowtype;
    v_path text;
begin
    if p_receipt_id is null or p_challenge_id is null then
        raise exception 'PROOF_CAPTURE_ID_REQUIRED';
    end if;
    if p_actor_subject is null
       or char_length(p_actor_subject) not between 1 and 256
       or p_actor_subject <> btrim(p_actor_subject) then
        raise exception 'PROOF_ACTOR_INVALID';
    end if;
    if p_token_digest is null or lower(p_token_digest) !~ '^[0-9a-f]{64}$' then
        raise exception 'PROOF_CAPTURE_TOKEN_INVALID';
    end if;

    select challenge.*
      into v_challenge
      from public.vvip_synapse_proof_challenges challenge
     where challenge.challenge_id = p_challenge_id
       and challenge.actor_subject = p_actor_subject
       and challenge.consumed_at is null
       and challenge.expires_at > statement_timestamp();

    if not found then
        raise exception 'PROOF_CHALLENGE_NOT_CAPTURABLE';
    end if;

    v_path := 'proof/' || p_challenge_id::text || '/' || p_receipt_id::text || '.capture';

    insert into public.vvip_synapse_proof_capture_receipts (
        receipt_id, challenge_id, actor_subject, object_type, object_id,
        purpose, policy_version, source_storage_path, token_digest, expires_at
    ) values (
        p_receipt_id, v_challenge.challenge_id, v_challenge.actor_subject,
        v_challenge.object_type, v_challenge.object_id, v_challenge.purpose,
        v_challenge.policy_version, v_path, lower(p_token_digest), v_challenge.expires_at
    )
    returning * into v_receipt;

    return jsonb_build_object(
        'ok', true,
        'status', 'CAPTURE_PREPARED',
        'receipt_id', v_receipt.receipt_id,
        'challenge_id', v_receipt.challenge_id,
        'source_storage_path', v_receipt.source_storage_path,
        'expires_at', v_receipt.expires_at
    );
end;
$function$;

create function public.vvip_synapse_proof_capture_claim(
    p_receipt_id uuid,
    p_token_digest text
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $function$
declare
    v_receipt public.vvip_synapse_proof_capture_receipts%rowtype;
begin
    if p_receipt_id is null or p_token_digest is null or lower(p_token_digest) !~ '^[0-9a-f]{64}$' then
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;

    update public.vvip_synapse_proof_capture_receipts receipt
       set claimed_at = coalesce(receipt.claimed_at, statement_timestamp())
     where receipt.receipt_id = p_receipt_id
       and receipt.token_digest = lower(p_token_digest)
       and receipt.finalized_at is null
       and receipt.consumed_at is null
       and receipt.expires_at > statement_timestamp()
    returning receipt.* into v_receipt;

    if not found then
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;

    return jsonb_build_object(
        'ok', true,
        'status', 'CLAIMED',
        'receipt_id', v_receipt.receipt_id,
        'challenge_id', v_receipt.challenge_id,
        'source_storage_path', v_receipt.source_storage_path,
        'expires_at', v_receipt.expires_at
    );
end;
$function$;

create function public.vvip_synapse_proof_capture_finalize(
    p_receipt_id uuid,
    p_token_digest text,
    p_canonical_digest text,
    p_verifier_id text
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $function$
declare
    v_receipt public.vvip_synapse_proof_capture_receipts%rowtype;
begin
    if p_receipt_id is null
       or p_token_digest is null or lower(p_token_digest) !~ '^[0-9a-f]{64}$'
       or p_canonical_digest is null or lower(p_canonical_digest) !~ '^[0-9a-f]{64}$'
       or p_verifier_id is null or char_length(p_verifier_id) not between 1 and 128
       or p_verifier_id <> btrim(p_verifier_id) then
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;

    update public.vvip_synapse_proof_capture_receipts receipt
       set canonical_digest = lower(p_canonical_digest),
           verifier_id = p_verifier_id,
           finalized_at = statement_timestamp()
     where receipt.receipt_id = p_receipt_id
       and receipt.token_digest = lower(p_token_digest)
       and receipt.claimed_at is not null
       and receipt.finalized_at is null
       and receipt.consumed_at is null
       and receipt.expires_at > statement_timestamp()
    returning receipt.* into v_receipt;

    if not found then
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;

    return jsonb_build_object(
        'ok', true,
        'status', 'FINALIZED',
        'receipt_id', v_receipt.receipt_id,
        'challenge_id', v_receipt.challenge_id,
        'canonical_digest', v_receipt.canonical_digest,
        'verifier_id', v_receipt.verifier_id,
        'finalized_at', v_receipt.finalized_at,
        'expires_at', v_receipt.expires_at
    );
end;
$function$;

create function public.vvip_synapse_proof_consume(
    p_challenge_id uuid,
    p_actor_subject text,
    p_nonce_digest text,
    p_capture_receipt_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $function$
declare
    v_receipt public.vvip_synapse_proof_capture_receipts%rowtype;
    v_consumed_receipt public.vvip_synapse_proof_capture_receipts%rowtype;
    v_challenge public.vvip_synapse_proof_challenges%rowtype;
    v_existing public.vvip_synapse_proof_challenges%rowtype;
    v_evidence public.vvip_synapse_proof_evidence%rowtype;
begin
    if p_challenge_id is null or p_capture_receipt_id is null then
        raise exception 'PROOF_CHALLENGE_OR_RECEIPT_REQUIRED';
    end if;
    if p_actor_subject is null
       or char_length(p_actor_subject) not between 1 and 256
       or p_actor_subject <> btrim(p_actor_subject) then
        raise exception 'PROOF_ACTOR_INVALID';
    end if;
    if p_nonce_digest is null or lower(p_nonce_digest) !~ '^[0-9a-f]{64}$' then
        raise exception 'PROOF_NONCE_DIGEST_INVALID';
    end if;

    select receipt.*
      into v_receipt
      from public.vvip_synapse_proof_capture_receipts receipt
     where receipt.receipt_id = p_capture_receipt_id
       and receipt.challenge_id = p_challenge_id
       and receipt.actor_subject = p_actor_subject;

    if not found then
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;
    if v_receipt.consumed_at is not null then
        return jsonb_build_object('ok', false, 'status', 'REPLAY');
    end if;
    if v_receipt.expires_at <= statement_timestamp() then
        return jsonb_build_object('ok', false, 'status', 'EXPIRED');
    end if;
    if v_receipt.finalized_at is null
       or v_receipt.canonical_digest is null
       or v_receipt.verifier_id is null then
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;

    update public.vvip_synapse_proof_challenges challenge
       set consumed_at = statement_timestamp(),
           capture_digest = v_receipt.canonical_digest
     where challenge.challenge_id = p_challenge_id
       and challenge.actor_subject = p_actor_subject
       and challenge.object_type = v_receipt.object_type
       and challenge.object_id = v_receipt.object_id
       and challenge.purpose = v_receipt.purpose
       and challenge.policy_version = v_receipt.policy_version
       and challenge.nonce_digest = lower(p_nonce_digest)
       and challenge.consumed_at is null
       and challenge.expires_at > statement_timestamp()
    returning challenge.* into v_challenge;

    if not found then
        select challenge.*
          into v_existing
          from public.vvip_synapse_proof_challenges challenge
         where challenge.challenge_id = p_challenge_id;

        if not found
           or v_existing.actor_subject <> p_actor_subject
           or v_existing.nonce_digest <> lower(p_nonce_digest) then
            return jsonb_build_object('ok', false, 'status', 'INVALID');
        end if;
        if v_existing.consumed_at is not null then
            return jsonb_build_object('ok', false, 'status', 'REPLAY');
        end if;
        if v_existing.expires_at <= statement_timestamp() then
            return jsonb_build_object('ok', false, 'status', 'EXPIRED');
        end if;
        return jsonb_build_object('ok', false, 'status', 'INVALID');
    end if;

    update public.vvip_synapse_proof_capture_receipts receipt
       set consumed_at = v_challenge.consumed_at
     where receipt.receipt_id = p_capture_receipt_id
       and receipt.challenge_id = p_challenge_id
       and receipt.actor_subject = p_actor_subject
       and receipt.consumed_at is null
       and receipt.finalized_at is not null
       and receipt.expires_at > statement_timestamp()
    returning receipt.* into v_consumed_receipt;

    if not found then
        raise exception 'PROOF_RECEIPT_CONSUME_RACE';
    end if;

    insert into public.vvip_synapse_proof_evidence (
        challenge_id, receipt_id, actor_subject, object_type, object_id,
        purpose, policy_version, capture_digest, verifier_id, accepted_at
    ) values (
        v_challenge.challenge_id, v_consumed_receipt.receipt_id, v_challenge.actor_subject,
        v_challenge.object_type, v_challenge.object_id, v_challenge.purpose,
        v_challenge.policy_version, v_consumed_receipt.canonical_digest,
        v_consumed_receipt.verifier_id, v_challenge.consumed_at
    )
    returning * into v_evidence;

    return jsonb_build_object(
        'ok', true,
        'status', 'ACCEPTED',
        'evidence_id', v_evidence.evidence_id,
        'challenge_id', v_evidence.challenge_id,
        'receipt_id', v_evidence.receipt_id,
        'object_type', v_evidence.object_type,
        'object_id', v_evidence.object_id,
        'purpose', v_evidence.purpose,
        'policy_version', v_evidence.policy_version,
        'capture_digest', v_evidence.capture_digest,
        'verifier_id', v_evidence.verifier_id,
        'accepted_at', v_evidence.accepted_at
    );
end;
$function$;

revoke all on function public.vvip_synapse_proof_issue(uuid, text, text, uuid, text, text, text, integer)
from public, anon, authenticated, service_role;
revoke all on function public.vvip_synapse_proof_capture_prepare(uuid, uuid, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.vvip_synapse_proof_capture_claim(uuid, text)
from public, anon, authenticated, service_role;
revoke all on function public.vvip_synapse_proof_capture_finalize(uuid, text, text, text)
from public, anon, authenticated, service_role;
revoke all on function public.vvip_synapse_proof_consume(uuid, text, text, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.vvip_synapse_proof_issue(uuid, text, text, uuid, text, text, text, integer)
to service_role;
grant execute on function public.vvip_synapse_proof_capture_prepare(uuid, uuid, text, text)
to service_role;
grant execute on function public.vvip_synapse_proof_capture_claim(uuid, text)
to service_role;
grant execute on function public.vvip_synapse_proof_capture_finalize(uuid, text, text, text)
to service_role;
grant execute on function public.vvip_synapse_proof_consume(uuid, text, text, uuid)
to service_role;

commit;
