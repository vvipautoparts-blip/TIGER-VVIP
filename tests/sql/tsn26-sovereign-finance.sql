\set ON_ERROR_STOP on

begin;

-- Schema and privilege boundary.
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'tsn26_finance') then
    raise exception 'TSN26_DB_SCHEMA_MISSING';
  end if;

  if has_schema_privilege('public', 'tsn26_finance', 'USAGE') then
    raise exception 'TSN26_DB_PUBLIC_SCHEMA_USAGE_FORBIDDEN';
  end if;
  if has_schema_privilege('anon', 'tsn26_finance', 'USAGE') then
    raise exception 'TSN26_DB_ANON_SCHEMA_USAGE_FORBIDDEN';
  end if;
  if has_schema_privilege('authenticated', 'tsn26_finance', 'USAGE') then
    raise exception 'TSN26_DB_AUTHENTICATED_SCHEMA_USAGE_FORBIDDEN';
  end if;
  if not has_schema_privilege('service_role', 'tsn26_finance', 'USAGE') then
    raise exception 'TSN26_DB_SERVICE_ROLE_SCHEMA_USAGE_REQUIRED';
  end if;
end;
$$;

-- Exact sovereign tables, FORCE RLS, and no browser policy surface.
do $$
declare
  expected_tables text[] := array['payment_events', 'sale_claims', 'settlements', 'settlement_state_events'];
  table_name text;
  table_count integer;
begin
  foreach table_name in array expected_tables loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'tsn26_finance'
        and c.relname = table_name
        and c.relkind = 'r'
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'TSN26_DB_FORCE_RLS_REQUIRED:%', table_name;
    end if;
  end loop;

  select count(*) into table_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'tsn26_finance' and c.relkind = 'r';

  if table_count <> array_length(expected_tables, 1) then
    raise exception 'TSN26_DB_UNEXPECTED_FINANCIAL_TABLE_COUNT:%', table_count;
  end if;

  if exists (select 1 from pg_policies where schemaname = 'tsn26_finance') then
    raise exception 'TSN26_DB_BROWSER_RLS_POLICY_SURFACE_FORBIDDEN';
  end if;
end;
$$;

-- No superseded commission/payout/role database object may survive outside the
-- sovereign finance schema in a rebuilt current database.
do $$
declare
  residue text;
begin
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ' order by n.nspname, c.relname)
    into residue
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'tsn26_finance')
    and c.relkind in ('r', 'p', 'v', 'm', 'S')
    and lower(c.relname) ~ '(regional_manager|direct_supervisor|direct_marketer|state_organizer|support_marketer|commission|payout)';

  if residue is not null then
    raise exception 'TSN26_DB_LEGACY_RELATION_RESIDUE:%', residue;
  end if;

  select string_agg(format('%I.%I', n.nspname, p.proname), ', ' order by n.nspname, p.proname)
    into residue
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname not in ('pg_catalog', 'information_schema', 'tsn26_finance')
    and lower(p.proname) ~ '(regional_manager|direct_supervisor|direct_marketer|state_organizer|support_marketer|commission|payout)';

  if residue is not null then
    raise exception 'TSN26_DB_LEGACY_FUNCTION_RESIDUE:%', residue;
  end if;
end;
$$;

-- Captured payment proof and locked claim produce one attributed settlement.
insert into tsn26_finance.payment_events (
  event_id, provider, provider_event_id, payment_id, order_id, event_type,
  amount_tmu, currency, occurred_at, payload_sha256
) values (
  'evt-tsn26-attributed', 'TEST_PROVIDER', 'provider-evt-tsn26-attributed',
  'pay-tsn26-attributed', 'order-tsn26-attributed', 'CAPTURED',
  45000000, 'JOD', '2026-08-26T00:00:00Z', repeat('a', 64)
);

insert into tsn26_finance.sale_claims (
  claim_id, seller_uid, seller_role, buyer_uid, offer_id, sector_id, country_id,
  issued_at, expires_at, nonce, payload_sha256, signature, key_id
) values (
  'claim-tsn26-marketer', 'seller-001', 'MARKETER', 'buyer-001', 'T45',
  'sector-001', 'JO', '2026-08-25T23:00:00Z', '2026-08-26T01:00:00Z',
  'nonce-tsn26-marketer', repeat('b', 64), 'test-signature', 'test-key-001'
);

insert into tsn26_finance.settlements (
  settlement_id, transaction_id, order_id, payment_id, constitution_id,
  package_id, list_price_tmu, discount_tmu, collected_tmu, purchase_mode,
  winning_claim_id, winning_role,
  owner_tmu, partner_1_tmu, partner_2_tmu, partner_3_tmu,
  operations_tmu, fiscal_regulatory_reserve_tmu,
  general_manager_tmu, sector_manager_tmu, marketer_tmu,
  sales_absence_tmu, rounding_reserve_tmu,
  allocated_at, matures_at, epoch_id
) values (
  'settlement-tsn26-attributed', 'tx-tsn26-attributed', 'order-tsn26-attributed',
  'pay-tsn26-attributed', 'TFC-2026.08.001', 'T45', 45000000, 0, 45000000,
  'ATTRIBUTED', 'claim-tsn26-marketer', 'MARKETER',
  2250000, 2250000, 2250000, 2250000,
  19350000, 7200000, 0, 0, 3150000, 6300000, 0,
  '2026-08-26T00:00:00Z', '2026-09-09T00:00:00Z', 'TIGER-EPOCH-TEST-ATTRIBUTED'
);

-- Direct purchase is discounted first, then the actual collected value is allocated.
insert into tsn26_finance.payment_events (
  event_id, provider, provider_event_id, payment_id, order_id, event_type,
  amount_tmu, currency, occurred_at, payload_sha256
) values (
  'evt-tsn26-direct', 'TEST_PROVIDER', 'provider-evt-tsn26-direct',
  'pay-tsn26-direct', 'order-tsn26-direct', 'CAPTURED',
  41850000, 'JOD', '2026-08-26T00:05:00Z', repeat('c', 64)
);

insert into tsn26_finance.settlements (
  settlement_id, transaction_id, order_id, payment_id, constitution_id,
  package_id, list_price_tmu, discount_tmu, collected_tmu, purchase_mode,
  winning_claim_id, winning_role,
  owner_tmu, partner_1_tmu, partner_2_tmu, partner_3_tmu,
  operations_tmu, fiscal_regulatory_reserve_tmu,
  general_manager_tmu, sector_manager_tmu, marketer_tmu,
  sales_absence_tmu, rounding_reserve_tmu,
  allocated_at, matures_at, epoch_id
) values (
  'settlement-tsn26-direct', 'tx-tsn26-direct', 'order-tsn26-direct',
  'pay-tsn26-direct', 'TFC-2026.08.001', 'T45', 45000000, 3150000, 41850000,
  'DIRECT_SOVEREIGN_PURCHASE', null, null,
  2092500, 2092500, 2092500, 2092500,
  17995500, 6696000, 0, 0, 0, 8788500, 0,
  '2026-08-26T00:05:00Z', '2026-09-09T00:05:00Z', 'TIGER-EPOCH-TEST-DIRECT'
);

-- Duplicate CAPTURE for the same payment must fail closed.
do $$
begin
  begin
    insert into tsn26_finance.payment_events (
      event_id, provider, provider_event_id, payment_id, order_id, event_type,
      amount_tmu, currency, occurred_at, payload_sha256
    ) values (
      'evt-tsn26-duplicate-capture', 'TEST_PROVIDER', 'provider-evt-tsn26-duplicate-capture',
      'pay-tsn26-attributed', 'order-tsn26-attributed', 'CAPTURED',
      45000000, 'JOD', '2026-08-26T00:10:00Z', repeat('d', 64)
    );
    raise exception 'TSN26_DB_DUPLICATE_CAPTURE_WAS_ACCEPTED';
  exception
    when unique_violation then null;
  end;
end;
$$;

-- Claim/package/role proof mismatch must fail before settlement truth is committed.
do $$
begin
  begin
    insert into tsn26_finance.settlements (
      settlement_id, transaction_id, order_id, payment_id, constitution_id,
      package_id, list_price_tmu, discount_tmu, collected_tmu, purchase_mode,
      winning_claim_id, winning_role,
      owner_tmu, partner_1_tmu, partner_2_tmu, partner_3_tmu,
      operations_tmu, fiscal_regulatory_reserve_tmu,
      general_manager_tmu, sector_manager_tmu, marketer_tmu,
      sales_absence_tmu, rounding_reserve_tmu,
      allocated_at, matures_at, epoch_id
    ) values (
      'settlement-tsn26-bad-claim', 'tx-tsn26-bad-claim', 'order-tsn26-attributed',
      'pay-tsn26-attributed', 'TFC-2026.08.001', 'T45', 45000000, 0, 45000000,
      'ATTRIBUTED', 'claim-tsn26-marketer', 'GENERAL_MANAGER',
      2250000, 2250000, 2250000, 2250000,
      19350000, 7200000, 3150000, 0, 0, 6300000, 0,
      '2026-08-26T00:00:00Z', '2026-09-09T00:00:00Z', 'TIGER-EPOCH-TEST-BAD-CLAIM'
    );
    raise exception 'TSN26_DB_MISMATCHED_CLAIM_WAS_ACCEPTED';
  exception
    when check_violation then
      if sqlerrm <> 'TSN26_LOCKED_SALE_CLAIM_PROOF_REQUIRED' then
        raise;
      end if;
  end;
end;
$$;

-- Financial truth is append-only even for privileged database execution.
do $$
begin
  begin
    update tsn26_finance.settlements
       set epoch_id = 'MUTATED'
     where settlement_id = 'settlement-tsn26-attributed';
    raise exception 'TSN26_DB_UPDATE_WAS_ACCEPTED';
  exception
    when object_not_in_prerequisite_state then
      if sqlerrm <> 'TSN26_APPEND_ONLY_FINANCIAL_TRUTH' then
        raise;
      end if;
  end;

  begin
    delete from tsn26_finance.payment_events
     where event_id = 'evt-tsn26-attributed';
    raise exception 'TSN26_DB_DELETE_WAS_ACCEPTED';
  exception
    when object_not_in_prerequisite_state then
      if sqlerrm <> 'TSN26_APPEND_ONLY_FINANCIAL_TRUTH' then
        raise;
      end if;
  end;
end;
$$;

select 'TIGER_TSN26_FINANCIAL_DB_BEHAVIOR=PASS' as result;

rollback;
