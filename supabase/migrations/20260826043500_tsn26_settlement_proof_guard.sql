begin;

create or replace function tsn26_finance.validate_settlement_proofs()
returns trigger
language plpgsql
security definer set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from tsn26_finance.payment_events pe
    where pe.payment_id = new.payment_id
      and pe.order_id = new.order_id
      and pe.event_type = 'CAPTURED'
      and pe.amount_tmu = new.collected_tmu
      and pe.currency = 'JOD'
  ) then
    raise exception using
      errcode = '23514',
      message = 'TSN26_CAPTURED_PAYMENT_PROOF_REQUIRED';
  end if;

  if new.purchase_mode = 'ATTRIBUTED' then
    if not exists (
      select 1
      from tsn26_finance.sale_claims sc
      where sc.claim_id = new.winning_claim_id
        and sc.seller_role = new.winning_role
        and sc.offer_id = new.package_id
        and sc.status = 'LOCKED'
        and sc.issued_at <= new.allocated_at
        and sc.expires_at >= new.allocated_at
    ) then
      raise exception using
        errcode = '23514',
        message = 'TSN26_LOCKED_SALE_CLAIM_PROOF_REQUIRED';
    end if;
  elsif new.winning_claim_id is not null or new.winning_role is not null then
    raise exception using
      errcode = '23514',
      message = 'TSN26_DIRECT_PURCHASE_CANNOT_HAVE_SALE_CLAIM';
  end if;

  return new;
end;
$$;

revoke all on function tsn26_finance.validate_settlement_proofs() from public, anon, authenticated;

create trigger trg_settlements_require_proofs
before insert on tsn26_finance.settlements
for each row execute function tsn26_finance.validate_settlement_proofs();

comment on function tsn26_finance.validate_settlement_proofs() is
  'Fail-closed Proof A + Proof B gate: a settlement requires a matching CAPTURED payment and, when attributed, a matching locked sale claim.';

commit;
