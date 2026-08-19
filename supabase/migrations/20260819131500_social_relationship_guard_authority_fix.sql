-- VVIP TIGER Social Privacy Proof 2026.
-- Forward-only authority correction: keep the private block oracle private while allowing
-- the relationship trigger to enforce it under a pinned database authority.

begin;

create or replace function public.vvip_social_guard_relationship_write()
returns trigger
language plpgsql
security definer set search_path = pg_catalog, public
as $function$
declare
    actor text := public.vvip_marketplace_actor_id();
begin
    if actor is not null and actor not like 'user\_%' escape '\' then
        raise exception 'SOCIAL_AUTH_REQUIRED';
    end if;

    if TG_OP = 'INSERT' then
        if NEW.requester_subject = NEW.addressee_subject then
            raise exception 'SOCIAL_SELF_RELATIONSHIP_DENIED';
        end if;
        if NEW.relationship_state <> 'pending' then
            raise exception 'SOCIAL_RELATIONSHIP_TRANSITION_DENIED';
        end if;
        if actor is not null and NEW.requester_subject <> actor then
            raise exception 'SOCIAL_REQUESTER_REQUIRED';
        end if;
        if public.vvip_social_is_blocked_pair(NEW.requester_subject, NEW.addressee_subject) then
            raise exception 'SOCIAL_BLOCK_ACTIVE';
        end if;
        NEW.updated_at := statement_timestamp();
        return NEW;
    end if;

    if TG_OP = 'UPDATE' then
        if NEW.requester_subject <> OLD.requester_subject
           or NEW.addressee_subject <> OLD.addressee_subject then
            raise exception 'SOCIAL_RELATIONSHIP_SCOPE_IMMUTABLE';
        end if;
        if OLD.relationship_state <> 'pending'
           or NEW.relationship_state <> 'friends' then
            raise exception 'SOCIAL_RELATIONSHIP_TRANSITION_DENIED';
        end if;
        if actor is not null and actor <> OLD.addressee_subject then
            raise exception 'SOCIAL_RECIPIENT_ACCEPTANCE_REQUIRED';
        end if;
        if public.vvip_social_is_blocked_pair(NEW.requester_subject, NEW.addressee_subject) then
            raise exception 'SOCIAL_BLOCK_ACTIVE';
        end if;
        NEW.updated_at := statement_timestamp();
        return NEW;
    end if;

    if TG_OP = 'DELETE' then
        if actor is not null
           and actor not in (OLD.requester_subject, OLD.addressee_subject) then
            raise exception 'SOCIAL_RELATIONSHIP_PARTICIPANT_REQUIRED';
        end if;
        return OLD;
    end if;

    raise exception 'SOCIAL_RELATIONSHIP_TRANSITION_DENIED';
end;
$function$;

commit;
